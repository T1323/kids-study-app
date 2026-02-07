import { useState, useEffect, useRef } from "react";
import { IdiomSearchForm } from "./components/IdiomSearchForm";
import { IdiomResultCard } from "./components/IdiomResultCard";
import { ModelSettings, type ModelSettingsValue } from "./components/ModelSettings";
import { IdiomExplain, StudyLevel } from "./types";
import { fetchIdiomExplainOrMock, fetchIdiomExplainMock } from "./services/idiomService";
import { searchFile, readFile, saveFile, FILE_NAME, type AppSettings } from "../sync/services/googleDrive";

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
  const [level, setLevel] = useState<StudyLevel>("senior");
  const [modelSettings, setModelSettings] = useState<ModelSettingsValue>(defaultModelSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<IdiomExplain | null>(null);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const skipNextSave = useRef(false);
  const saveTimer = useRef<number | null>(null);

  // 1. Load Settings from Google Drive on Login
  useEffect(() => {
    if (!accessToken) return;

    const loadSettings = async () => {
      setSyncStatus("loading");
      try {
        const fileId = await searchFile(accessToken, FILE_NAME);
        if (fileId) {
          const data = await readFile(accessToken, fileId);
          if (data) {
            console.log("Loaded settings from Drive:", data);
            skipNextSave.current = true; // Avoid triggering save immediately
            setLevel(data.level);
            setModelSettings(data.modelSettings);
            setSyncStatus("saved");
          }
        } else {
          // File not found, will be created on first save
          setSyncStatus("idle");
        }
      } catch (err) {
        console.error("Failed to load settings from Drive", err);
        setSyncStatus("error");
      }
    };

    loadSettings();
  }, [accessToken]);

  // 2. Auto-Save Settings (Debounced)
  useEffect(() => {
    if (!accessToken) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    setSyncStatus("saving");
    saveTimer.current = window.setTimeout(async () => {
      try {
        const settings: AppSettings = {
          level,
          modelSettings,
          lastUpdated: Date.now(),
        };
        await saveFile(accessToken, settings);
        setSyncStatus("saved");
      } catch (err) {
        console.error("Failed to save settings to Drive", err);
        setSyncStatus("error");
      }
    }, 2000); // 2 seconds debounce

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [level, modelSettings, accessToken]);

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
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2>成語查詢</h2>
            {syncStatus === "loading" && <span style={{ fontSize: "0.8rem", color: "#666" }}>🔄 同步設定中...</span>}
            {syncStatus === "saving" && <span style={{ fontSize: "0.8rem", color: "#666" }}>💾 儲存設定中...</span>}
            {syncStatus === "saved" && <span style={{ fontSize: "0.8rem", color: "green" }}>✅ 設定已同步</span>}
            {syncStatus === "error" && <span style={{ fontSize: "0.8rem", color: "red" }}>⚠️ 同步失敗</span>}
          </div>
          <p className="card-description">
            輸入想查的成語，系統會提供解釋、用法與例句。
          </p>
        </div>
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
      </header>

      <div className="model-settings-wrap">
        <ModelSettings
          value={modelSettings}
          onChange={setModelSettings}
          disabled={loading}
        />
      </div>

      <IdiomSearchForm onSearch={handleSearch} loading={loading} />

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
    </section>
  );
};

