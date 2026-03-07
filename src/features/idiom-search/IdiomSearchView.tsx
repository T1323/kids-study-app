import { useState, useEffect } from "react";
import { IdiomSearchForm } from "./components/IdiomSearchForm";
import { IdiomResultCard } from "./components/IdiomResultCard";
import { LearningHistory } from "./components/LearningHistory";
import { fetchIdiomExplainOrMock } from "./services/idiomService";
import { IdiomExplain, IdiomExplainRequest } from "./types";
import {
  UserProgressData,
  searchFile,
  readFile,
  createFile,
  updateFile,
  PROGRESS_FILE_NAME,
} from "../sync/services/googleDrive";
import { QuizView } from "../quiz/QuizView";

const DEFAULT_PROGRESS: UserProgressData = {
  idioms: {},
  lastSynced: 0,
};

import { useGlobalContext } from "../../context/GlobalContext";

export const IdiomSearchView = () => {
  const { accessToken, modelSettings, level, settingsLoaded, appFolderId } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'search' | 'quiz'>('search');
  const [idiomInput, setIdiomInput] = useState("");

  const [result, setResult] = useState<IdiomExplain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Progress Data (Sync with Google Drive)
  const [userProgress, setUserProgress] = useState<UserProgressData>(DEFAULT_PROGRESS);

  // Load Progress from Drive on Login
  useEffect(() => {
    if (!accessToken || !appFolderId) {
      return;
    }

    const loadData = async () => {
      try {
        // Load Progress
        const progressId = await searchFile(accessToken, PROGRESS_FILE_NAME, appFolderId);
        if (progressId) {
          const remoteProgress: any = await readFile(accessToken, progressId);
          if (remoteProgress) {
            // Force a new object reference to ensure React re-renders
            setUserProgress({ ...remoteProgress });
          }
        }
      } catch (err) {
        console.error("Failed to load data from Drive:", err);
      }
    };

    loadData();
  }, [accessToken, appFolderId]);

  const handleSearch = async (idiom: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const req: IdiomExplainRequest = {
        idiom,
        level,
        apiKey: modelSettings.apiKey,
        provider: modelSettings.providerId,
        model: modelSettings.customModel,
        baseURL: modelSettings.customBaseURL,
      };

      const data = await fetchIdiomExplainOrMock(req);
      setResult(data);

      // Update Local Progress
      if (data.is_idiom) {
        updateLocalProgress(data.idiom);
      }
    } catch (err: any) {
      setError(err.message || "查詢失敗");
    } finally {
      setLoading(false);
    }
  };

  const updateLocalProgress = (idiom: string) => {
    setUserProgress((prev) => {
      const now = Date.now();
      const current = prev.idioms?.[idiom] || {
        idiom,
        queryTime: 0,
        proficiency: 0,
        lastTestTime: 0,
        queryCount: 0,
      };

      const newProgress: UserProgressData = {
        ...prev,
        idioms: {
          ...(prev.idioms || {}),
          [idiom]: {
            ...current,
            queryTime: now,
            queryCount: current.queryCount + 1,
          },
        },
        lastSynced: now, // Mark local update time
      };
      
      // Trigger async save (no await here to keep UI responsive)
      if (accessToken) {
         saveProgressToDrive(accessToken, newProgress);
      }
      
      return newProgress;
    });
  };

  const handleDelete = (idiom: string) => {
    setUserProgress((prev) => {
      const newIdioms = { ...prev.idioms };
      delete newIdioms[idiom];
      
      const newProgress: UserProgressData = {
        ...prev,
        idioms: newIdioms,
        lastSynced: Date.now(),
      };
      
      if (accessToken) {
        saveProgressToDrive(accessToken, newProgress);
      }
      
      return newProgress;
    });
  };

    const saveProgressToDrive = async (token: string, data: UserProgressData) => {
    if (!appFolderId) return;
    try {
      const fileId = await searchFile(token, PROGRESS_FILE_NAME, appFolderId);
      if (fileId) {
        await updateFile(token, fileId, data);
      } else {
        await createFile(token, PROGRESS_FILE_NAME, data, appFolderId);
      }
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  };

  return (
    <div className="idiom-search-view">
      <div className="tab-bar">
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 成語查詢
        </button>
        <button 
          className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          📝 測驗挑戰
        </button>
      </div>

      <div className="content-area">
        {activeTab === 'search' ? (
          <>
            <IdiomSearchForm
              onSearch={handleSearch}
              loading={loading}
              initialValue={idiomInput}
            />

            {error && <div className="error-msg">{error}</div>}

            {result && <IdiomResultCard result={result} />}

            <div className="history-section">
              {!settingsLoaded && accessToken ? (
                 <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                    ⏳ 正在同步雲端紀錄...
                 </div>
              ) : (
                <LearningHistory
                  data={userProgress}
                  type="idiom"
                  onSelect={(idiom) => {
                    setIdiomInput(idiom);
                    handleSearch(idiom);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </>
        ) : (
          <QuizView
            data={userProgress}
            onUpdateData={setUserProgress}
            accessToken={accessToken || ""}
            level={level}
            modelSettings={modelSettings}
            quizMode="idiom"
          />
        )}
      </div>

      <style>{`
        .idiom-search-view {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }
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
        .error-msg {
          color: #d32f2f;
          background: #ffebee;
          padding: 0.8rem;
          border-radius: 4px;
          margin: 1rem 0;
          text-align: center;
        }
        .history-section {
          margin-top: 2rem;
          border-top: 1px solid #eee;
          padding-top: 1rem;
        }
      `}</style>
    </div>
  );
};
