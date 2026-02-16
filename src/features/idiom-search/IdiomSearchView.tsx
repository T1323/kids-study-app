import { useState, useEffect } from "react";
import { IdiomSearchForm } from "./components/IdiomSearchForm";
import { IdiomResultCard } from "./components/IdiomResultCard";
import { ModelSettings } from "./components/ModelSettings";
import { LearningHistory } from "./components/LearningHistory";
import { fetchIdiomExplainOrMock } from "./services/idiomService";
import { IdiomExplain, IdiomExplainRequest } from "./types";
import {
  UserProgressData,
  searchFile,
  readFile,
  createFile,
  updateFile,
  SETTINGS_FILE_NAME,
  PROGRESS_FILE_NAME,
} from "../sync/services/googleDrive";
import { QuizView } from "../quiz/QuizView";

// interface Props {
//   accessToken: string | null;
// }

const DEFAULT_SETTINGS = {
  level: "junior" as const,
  modelSettings: {
    providerId: "",
    apiKey: "",
    customBaseURL: "",
    customModel: "",
  },
  lastUpdated: 0,
};

const DEFAULT_PROGRESS: UserProgressData = {
  idioms: {},
  lastSynced: 0,
};

import { useGlobalContext } from "../../context/GlobalContext";

export const IdiomSearchView = () => {
  const { accessToken, modelSettings, setModelSettings } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'search' | 'quiz'>('search');
  const [idiomInput, setIdiomInput] = useState("");
  const [level, setLevel] = useState<"junior" | "senior">("junior");
  // const [modelSettings, setModelSettings] = useState(
  //   DEFAULT_SETTINGS.modelSettings
  // );

  const [result, setResult] = useState<IdiomExplain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // User Progress Data (Sync with Google Drive)
  const [userProgress, setUserProgress] = useState<UserProgressData>(DEFAULT_PROGRESS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // We need setModelSettings if we want to update it from remote (optional)
  // For now, let's just log if remote has different settings
  // const { setModelSettings } = useGlobalContext();

  // Load Settings & Progress from Drive on Login
  useEffect(() => {
    // If no accessToken, we still want to let user use the app (with local state)
    // But if accessToken is present, we load from cloud.
    if (!accessToken) {
      setSettingsLoaded(true);
      return;
    }

    // Set loading state for sync
    setSettingsLoaded(false);

    const loadData = async () => {
      try {
        // 1. Load Settings
        const settingsId = await searchFile(accessToken, SETTINGS_FILE_NAME);
        if (settingsId) {
          const remoteSettings: any = await readFile(accessToken, settingsId);
          if (remoteSettings) {
            if (remoteSettings.level) setLevel(remoteSettings.level);
            if (remoteSettings.modelSettings)
              setModelSettings(remoteSettings.modelSettings);
          }
        }

        // 2. Load Progress
        const progressId = await searchFile(accessToken, PROGRESS_FILE_NAME);
        if (progressId) {
          const remoteProgress: any = await readFile(accessToken, progressId);
          if (remoteProgress) {
            // Force a new object reference to ensure React re-renders
            setUserProgress({ ...remoteProgress });
          }
        }
      } catch (err) {
        console.error("Failed to load data from Drive:", err);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadData();
  }, [accessToken]);

  // Save Settings to Drive when changed (debounced/effect)
  useEffect(() => {
    if (!accessToken || !settingsLoaded) return;

    const timer = setTimeout(async () => {
      const settingsContent = {
        level,
        modelSettings,
        lastUpdated: Date.now(),
      };

      try {
        const fileId = await searchFile(accessToken, SETTINGS_FILE_NAME);
        if (fileId) {
          await updateFile(accessToken, fileId, settingsContent);
        } else {
          await createFile(accessToken, SETTINGS_FILE_NAME, settingsContent);
        }
      } catch (err) {
        console.error("Failed to save settings:", err);
      }
    }, 2000); // Debounce 2s

    return () => clearTimeout(timer);
  }, [level, modelSettings, accessToken, settingsLoaded]);

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

  const saveProgressToDrive = async (token: string, data: UserProgressData) => {
    try {
      const fileId = await searchFile(token, PROGRESS_FILE_NAME);
      if (fileId) {
        await updateFile(token, fileId, data);
      } else {
        await createFile(token, PROGRESS_FILE_NAME, data);
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
            <div className="top-bar">
              <button
                className="settings-toggle"
                onClick={() => setShowSettings(!showSettings)}
              >
                ⚙️ 設定
              </button>
            </div>

            {showSettings && (
              <div className="settings-panel">
                <div className="level-selector">
                  <label>
                    <input
                      type="radio"
                      name="level"
                      value="junior"
                      checked={level === "junior"}
                      onChange={() => setLevel("junior")}
                    />
                    低年級 (簡單)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="level"
                      value="senior"
                      checked={level === "senior"}
                      onChange={() => setLevel("senior")}
                    />
                    高年級 (進階)
                  </label>
                </div>
                <ModelSettings
                  value={modelSettings}
                  onChange={setModelSettings}
                />
              </div>
            )}

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
        .top-bar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1rem;
        }
        .settings-toggle {
          background: none;
          border: 1px solid #ccc;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .settings-panel {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #ddd;
        }
        .level-selector {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
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
