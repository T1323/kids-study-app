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

const DEFAULT_PROGRESS: UserProgressData = {
    english: {}, // We will store english history here
    lastSynced: 0
};

export const EnglishSearchView = () => {
  const { accessToken, modelSettings } = useGlobalContext();
  const [result, setResult] = useState<EnglishWordExplain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgressData>(DEFAULT_PROGRESS);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Load Progress from Drive
  useEffect(() => {
      if (!accessToken) {
          setProgressLoaded(true);
          return;
      }

      // Set loading state
      setProgressLoaded(false);

      const loadData = async () => {
          try {
              const fileId = await searchFile(accessToken, ENGLISH_PROGRESS_FILE_NAME);
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
  }, [accessToken]);


  const handleSearch = async (word: string, level: StudyLevel) => {
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
          newProgress.english[data.word] = {
              ...data,
              timestamp: Date.now()
          };
          newProgress.lastSynced = Date.now();
          
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
      try {
          let fileId = await searchFile(token, ENGLISH_PROGRESS_FILE_NAME);
          if (fileId) {
              await updateFile(token, fileId, data);
          } else {
              await createFile(token, ENGLISH_PROGRESS_FILE_NAME, data);
          }
      } catch (e) {
          console.error("Failed to save English progress", e);
      }
  };

  return (
    <div className="idiom-search-view" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "2rem", color: "#333" }}>🔤 英文單字小學堂</h2>
        <p style={{ color: "#666" }}>輸入單字，AI 老師教你怎麼用！</p>
      </div>

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
              handleSearch(word, "junior"); // Default to junior or need to store level?
              // Ideally we might want to store the level in history too, but for now just search.
              // Or update handleSearch to optional level?
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </div>
    </div>
  );
};
