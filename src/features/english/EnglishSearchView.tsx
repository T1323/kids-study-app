import React, { useState, useEffect } from "react";
import { EnglishSearchForm } from "./components/EnglishSearchForm";
import { EnglishResultCard } from "./components/EnglishResultCard";
import { LearningHistory } from "../idiom-search/components/LearningHistory";
import { useGlobalContext } from "../../context/GlobalContext";
import { fetchEnglishExplain } from "./services/englishService";
import { EnglishWordExplain, StudyLevel } from "./types";
import {
    UserProgressData,
    searchFile,
    readFile,
    createFile,
    updateFile,
    ENGLISH_PROGRESS_FILE_NAME
} from "../sync/services/googleDrive";
import { QuizView } from "../quiz/QuizView";
import { CustomChallengeSetup } from "./components/CustomChallengeSetup";
import { QuizQuestion } from "../quiz/types";
import { QuizGame } from "../quiz/components/QuizGame";
import { QuizResultView } from "../quiz/components/QuizResultView";
import { QuizResult } from "../quiz/types";

const DEFAULT_PROGRESS: UserProgressData = {
    english: {}, // We will store english history here
    lastSynced: 0
};

export const EnglishSearchView = () => {
  const { accessToken, modelSettings, level, appFolderId } = useGlobalContext();
  const [result, setResult] = useState<EnglishWordExplain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgressData>(DEFAULT_PROGRESS);
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Custom Challenge State
  const [customQuestions, setCustomQuestions] = useState<QuizQuestion[]>([]);
  const [customPhase, setCustomPhase] = useState<'setup' | 'playing' | 'result'>('setup');
  const [customResults, setCustomResults] = useState<QuizResult[]>([]);

  // Load Progress from Drive
  useEffect(() => {
      if (!accessToken || !appFolderId) {
          return;
      }

      // Set loading state
      setProgressLoaded(false);

      const loadData = async () => {
          try {
              const fileId = await searchFile(accessToken, ENGLISH_PROGRESS_FILE_NAME, appFolderId);
              if (fileId) {
                  const remoteData: any = await readFile(accessToken, fileId);
                  if (remoteData) {
                      setUserProgress(remoteData);
                  }
              }
          } catch (err) {
              console.error("Failed to load English progress:", err);
          } finally {
              setProgressLoaded(true);
          }
      };
      loadData();
  }, [accessToken, appFolderId]);


  const handleSearch = async (word: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchEnglishExplain({
        word,
        level,
        apiKey: modelSettings.apiKey,
        provider: modelSettings.providerId,
        model: modelSettings.customModel,
        baseURL: modelSettings.customBaseURL,
      });
      setResult(data);

      // Save to history/progress
      if (accessToken && progressLoaded) {
          const newProgress = { ...userProgress };
          if (!newProgress.english) newProgress.english = {};
          
          // Use word as key
          const now = Date.now();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existing = newProgress.english?.[data.word] as any;

          newProgress.english[data.word] = {
              word: data.word,
              queryTime: now,
              proficiency: existing?.proficiency || 0,
              lastTestTime: existing?.lastTestTime || 0,
              queryCount: (existing?.queryCount || existing?.count || 0) + 1
          };
          newProgress.lastSynced = now;
          
          setUserProgress(newProgress);
          
          // Sync to Drive (fire and forget for now, or use debounce)
          saveProgressToDrive(accessToken, newProgress);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProgressToDrive = async (token: string, data: UserProgressData) => {
      if (!appFolderId) return;
      try {
          let fileId = await searchFile(token, ENGLISH_PROGRESS_FILE_NAME, appFolderId);
          if (fileId) {
              await updateFile(token, fileId, data);
          } else {
              await createFile(token, ENGLISH_PROGRESS_FILE_NAME, data, appFolderId);
          }
      } catch (e) {
          console.error("Failed to save English progress", e);
      }
  };

  const [activeTab, setActiveTab] = useState<'search' | 'quiz' | 'custom'>('search');

  const handleCustomStart = (questions: QuizQuestion[], description: string) => {
    setCustomQuestions(questions);
    setCustomPhase('playing');
    
    // Update history
    const newData = { ...userProgress };
    if (!newData.customChallenges) newData.customChallenges = [];
    
    // Add new history item
    newData.customChallenges.push({
      id: Date.now().toString(),
      description,
      timestamp: Date.now()
    });

    // Keep only last 20
    if (newData.customChallenges.length > 20) {
      newData.customChallenges = newData.customChallenges.slice(-20);
    }
    
    newData.lastSynced = Date.now();
    setUserProgress(newData);
    
    if (accessToken) {
      saveProgressToDrive(accessToken, newData);
    }
  };

  const handleCustomComplete = (rs: QuizResult[]) => {
      setCustomResults(rs);
      setCustomPhase('result');
      // We can update proficiency here too if we want, similar to QuizView
      // For now, let's skip complex proficiency update for custom words
      // because custom words might not be in our "english" dictionary yet.
      // But if we want to add them, we could.
  };

  const handleCustomClose = () => {
      setCustomPhase('setup');
      setCustomQuestions([]);
      setCustomResults([]);
  };

  return (
    <div className="english-search-view" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 單字查詢
        </button>
        <button
          className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          📝 單字挑戰
        </button>
        <button
          className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          🎨 自訂挑戰
        </button>
      </div>

      <div className="content-area">
        {activeTab === 'search' && (
          <>
            <EnglishSearchForm onSearch={handleSearch} loading={loading} />

            {error && <div className="error-message">{error}</div>}

            {result && <EnglishResultCard data={result} />}
            
            <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
              {!progressLoaded && accessToken ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                    ⏳ 正在同步雲端紀錄...
                  </div>
              ) : (
                <LearningHistory
                      data={userProgress}
                      type="english"
                      onSelect={(word) => {
                        handleSearch(word);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
              )}
            </div>
          </>
        )}

        {activeTab === 'quiz' && (
          <QuizView
            data={userProgress}
            onUpdateData={setUserProgress}
            accessToken={accessToken || ""}
            level={level}
            modelSettings={modelSettings}
            quizMode="english"
          />
        )}

        {activeTab === 'custom' && (
            <div className="custom-challenge-container">
                {customPhase === 'setup' && (
                    <CustomChallengeSetup
                        data={userProgress}
                        level={level}
                        modelSettings={modelSettings}
                        onStart={handleCustomStart}
                        setLoading={setLoading}
                        setError={setError}
                    />
                )}
                
                {customPhase === 'playing' && (
                    <QuizGame
                        questions={customQuestions}
                        onComplete={handleCustomComplete}
                    />
                )}

                {customPhase === 'result' && (
                    <QuizResultView
                        results={customResults}
                        questions={customQuestions}
                        onClose={handleCustomClose}
                    />
                )}

                {loading && customPhase === 'setup' && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>正在生成客製化題目，請稍候...</p>
                    </div>
                )}
                {error && customPhase === 'setup' && (
                    <div className="error-message">{error}</div>
                )}
            </div>
        )}
      </div>

      <style>{`
        .tab-bar {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #eee;
          padding-bottom: 0.5rem;
        }
        .tab-btn {
          background: none;
          border: none;
          font-size: 1.1rem;
          padding: 0.5rem 1.5rem;
          cursor: pointer;
          color: #666;
          border-radius: 20px;
          transition: all 0.2s;
          font-weight: bold;
        }
        .tab-btn.active {
          background: #e3f2fd;
          color: #1976D2;
        }
        .tab-btn:hover:not(.active) {
          background: #f5f5f5;
        }
        .error-message {
          color: #d32f2f;
          background: #ffebee;
          padding: 0.8rem;
          border-radius: 4px;
          margin: 1rem 0;
          text-align: center;
        }
        .loading-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2196F3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
