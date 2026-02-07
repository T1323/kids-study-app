import { useState, useEffect, useRef } from "react";
import { IdiomSearchForm } from "./components/IdiomSearchForm";
import { IdiomResultCard } from "./components/IdiomResultCard";
import { LearningHistory } from "./components/LearningHistory";
import { ModelSettings, type ModelSettingsValue } from "./components/ModelSettings";
import { IdiomExplain, StudyLevel } from "./types";
import { fetchIdiomExplainOrMock, fetchIdiomExplainMock } from "./services/idiomService";
import { searchFile, readFile, saveSettings, saveProgress, SETTINGS_FILE_NAME, PROGRESS_FILE_NAME, type AppSettings, type UserProgressData, type IdiomProgress } from "../sync/services/googleDrive";

const defaultModelSettings: ModelSettingsValue = {
  providerId: "google",
  apiKey: "",
  customBaseURL: "",
  customModel: "",
};

interface Props {
  accessToken?: string | null;
}

export const IdiomSearchView = ({ accessToken }: Props) => {
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  
  const [level, setLevel] = useState<StudyLevel>("senior");
  const [modelSettings, setModelSettings] = useState<ModelSettingsValue>(defaultModelSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<IdiomExplain | null>(null);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  
  // Settings Sync Refs
  const skipNextSettingsSave = useRef(false);
  const settingsSaveTimer = useRef<number | null>(null);

  // Progress Sync State & Refs
  const [progressData, setProgressData] = useState<UserProgressData>({ idioms: {}, lastSynced: 0 });
  const skipNextProgressSave = useRef(false);
  const progressSaveTimer = useRef<number | null>(null);

  // 1. Load Data (Settings & Progress) from Google Drive on Login
  useEffect(() => {
    if (!accessToken) return;

    const loadData = async () => {
      setSyncStatus("loading");
      try {
        // Load Settings
        const settingsFileId = await searchFile(accessToken, SETTINGS_FILE_NAME);
        if (settingsFileId) {
          const data = await readFile<AppSettings>(accessToken, settingsFileId);
          if (data) {
            console.log("Loaded settings from Drive:", data);
            skipNextSettingsSave.current = true;
            setLevel(data.level);
            setModelSettings(data.modelSettings);
          }
        }

        // Load Progress
        const progressFileId = await searchFile(accessToken, PROGRESS_FILE_NAME);
        if (progressFileId) {
          const data = await readFile<UserProgressData>(accessToken, progressFileId);
          if (data) {
            console.log("Loaded progress from Drive:", data);
            skipNextProgressSave.current = true;
            setProgressData(data);
          }
        }

        setSyncStatus("saved");
      } catch (err) {
        console.error("Failed to load data from Drive", err);
        setSyncStatus("error");
      }
    };

    loadData();
  }, [accessToken]);

  // 2. Auto-Save Settings (Debounced)
  useEffect(() => {
    if (!accessToken) return;
    if (skipNextSettingsSave.current) {
      skipNextSettingsSave.current = false;
      return;
    }

    if (settingsSaveTimer.current) {
      clearTimeout(settingsSaveTimer.current);
    }

    setSyncStatus("saving");
    settingsSaveTimer.current = window.setTimeout(async () => {
      try {
        const settings: AppSettings = {
          level,
          modelSettings,
          lastUpdated: Date.now(),
        };
        await saveSettings(accessToken, settings);
        setSyncStatus("saved");
      } catch (err) {
        console.error("Failed to save settings to Drive", err);
        setSyncStatus("error");
      }
    }, 2000);

    return () => {
      if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    };
  }, [level, modelSettings, accessToken]);

  // 3. Auto-Save Progress (Debounced)
  useEffect(() => {
    if (!accessToken) return;
    if (skipNextProgressSave.current) {
      skipNextProgressSave.current = false;
      return;
    }

    // Only save if we have data (avoid saving empty on init if actual data exists but fetch failed?)
    // But here we rely on loadData setting skipNextProgressSave.
    
    if (progressSaveTimer.current) {
      clearTimeout(progressSaveTimer.current);
    }

    setSyncStatus("saving");
    progressSaveTimer.current = window.setTimeout(async () => {
      try {
        // Ensure we update timestamp
        const content: UserProgressData = {
          ...progressData,
          lastSynced: Date.now()
        };
        await saveProgress(accessToken, content);
        setSyncStatus("saved");
      } catch (err) {
        console.error("Failed to save progress to Drive", err);
        setSyncStatus("error");
      }
    }, 2000);

    return () => {
      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    };
  }, [progressData, accessToken]);

  const handleHistorySelect = (idiom: string) => {
    setActiveTab('search');
    setHistorySearchTerm(idiom);
    handleSearch(idiom);
  };

  const handleSearch = async (idiom: string) => {
    setLoading(true);
    setError(null);
    setWarning(null);
    setResult(null);

    // 1. Check if API Key is empty
    const apiKey = modelSettings.apiKey.trim();
    if (!apiKey) {
      setWarning("請輸入 API Key。以下是查詢範例：");
      // Fallback to Mock
      const mockData = await fetchIdiomExplainMock({ idiom, level });
      setResult(mockData);
      
      // Update Progress Data for Mock result
      if (mockData) {
        const now = Date.now();
        const idiomKey = mockData.idiom;
        
        setProgressData(prev => {
          const currentIdiomStats = prev.idioms[idiomKey] || {
            idiom: idiomKey,
            queryTime: 0,
            proficiency: 0,
            lastTestTime: 0,
            queryCount: 0
          };

          return {
            ...prev,
            idioms: {
              ...prev.idioms,
              [idiomKey]: {
                ...currentIdiomStats,
                queryTime: now,
                queryCount: currentIdiomStats.queryCount + 1
              }
            }
          };
        });
      }

      setLoading(false);
      return;
    }

    try {
      const req = {
        idiom,
        level,
        apiKey: apiKey || undefined,
        provider: modelSettings.providerId || undefined,
        model: modelSettings.providerId === "custom" ? modelSettings.customModel.trim() || undefined : undefined,
        baseURL: modelSettings.providerId === "custom" ? modelSettings.customBaseURL.trim() || undefined : undefined,
      };
      const data = await fetchIdiomExplainOrMock(req);
      setResult(data);

      // Update Progress Data
      if (data) {
        const now = Date.now();
        const idiomKey = data.idiom;
        
        setProgressData(prev => {
          const currentIdiomStats = prev.idioms[idiomKey] || {
            idiom: idiomKey,
            queryTime: 0,
            proficiency: 0,
            lastTestTime: 0, // Default to 0 (representing "long ago" or "never")
            queryCount: 0
          };

          return {
            ...prev,
            idioms: {
              ...prev.idioms,
              [idiomKey]: {
                ...currentIdiomStats,
                queryTime: now,
                queryCount: currentIdiomStats.queryCount + 1
              }
            }
          };
        });
      }
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "未知錯誤";

      // 3. Not Found Logic (Business Error)
      if (msg.includes("找不到相近成語")) {
        setError("找不到相近成語，請確認輸入是否正確。");
        // Don't show mock data for "Not Found"
      } else {
        // 2. API Error / Invalid Key (System Error)
        setWarning(`API Key 無效或發生錯誤 (${msg})。以下是查詢範例：`);
        // Fallback to Mock
        const mockData = await fetchIdiomExplainMock({ idiom, level });
        setResult(mockData);
        
        // Update Progress Data for Mock result as well
        if (mockData) {
          const now = Date.now();
          const idiomKey = mockData.idiom;
          
          setProgressData(prev => {
            const currentIdiomStats = prev.idioms[idiomKey] || {
              idiom: idiomKey,
              queryTime: 0,
              proficiency: 0,
              lastTestTime: 0,
              queryCount: 0
            };

            return {
              ...prev,
              idioms: {
                ...prev.idioms,
                [idiomKey]: {
                  ...currentIdiomStats,
                  queryTime: now,
                  queryCount: currentIdiomStats.queryCount + 1
                }
              }
            };
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <div style={{ width: '100%', marginBottom: '1rem' }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2>成語小學堂</h2>
              {syncStatus === "loading" && <span style={{ fontSize: "0.8rem", color: "#666" }}>🔄 同步設定中...</span>}
              {syncStatus === "saving" && <span style={{ fontSize: "0.8rem", color: "#666" }}>💾 儲存設定中...</span>}
              {syncStatus === "saved" && <span style={{ fontSize: "0.8rem", color: "green" }}>✅ 設定已同步</span>}
              {syncStatus === "error" && <span style={{ fontSize: "0.8rem", color: "red" }}>⚠️ 同步失敗</span>}
            </div>
          </div>
          
          <div className="tabs" style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #eee' }}>
            <button
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'search' ? '3px solid #4CAF50' : '3px solid transparent',
                fontWeight: activeTab === 'search' ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '1rem',
                color: activeTab === 'search' ? '#2c3e50' : '#888'
              }}
            >
              成語查詢
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'history' ? '3px solid #4CAF50' : '3px solid transparent',
                fontWeight: activeTab === 'history' ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '1rem',
                color: activeTab === 'history' ? '#2c3e50' : '#888'
              }}
            >
              學習歷程
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'search' ? (
        <>
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <div className="level-switch">
                <span className="level-label">學習難度：</span>
                <button
                  className={level === "junior" ? "level-btn active" : "level-btn"}
                  onClick={() => setLevel("junior")}
                >
                  低年級
                </button>
                <button
                  className={level === "senior" ? "level-btn active" : "level-btn"}
                  onClick={() => setLevel("senior")}
                >
                  高年級
                </button>
              </div>
           </div>

          <div className="model-settings-wrap">
            <ModelSettings
              value={modelSettings}
              onChange={setModelSettings}
              disabled={loading}
            />
          </div>

          <IdiomSearchForm
            onSearch={handleSearch}
            loading={loading}
            initialValue={historySearchTerm}
          />

          {error && <div className="error-banner">{error}</div>}
          {warning && (
            <div
              className="warning-banner"
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "8px",
                backgroundColor: "#fff3cd",
                color: "#856404",
                border: "1px solid #ffeeba",
              }}
            >
              {warning}
            </div>
          )}

          {result && !error && (
            <div className="results-section">
              <IdiomResultCard result={result} />
            </div>
          )}
        </>
      ) : (
        <LearningHistory
          data={progressData}
          onSelectIdiom={handleHistorySelect}
        />
      )}
    </section>
  );
};

