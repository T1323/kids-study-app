import { useEffect, useRef, useState } from "react";
import "./ModelSettings.css";
import {
  fetchProviders,
  fetchDetectProvider,
  fetchAvailableModels,
  type ProviderOption,
} from "../services/idiomService";

export interface ModelSettingsValue {
  providerId: string;
  apiKey: string;
  customBaseURL: string;
  customModel: string;
}

interface Props {
  value: ModelSettingsValue;
  onChange: (v: ModelSettingsValue) => void;
  disabled?: boolean;
}

export function ModelSettings({ value = {
  providerId: "google",
  apiKey: "",
  customBaseURL: "",
  customModel: "",
}, onChange, disabled }: Props) {
  const [list, setList] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const detectLock = useRef(false);
  const fetchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Load Providers
    let cancelled = false;
    fetchProviders()
      .then((arr) => {
        if (!cancelled) setList(arr);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // 2. Load Saved Key
    const savedKey = localStorage.getItem("user_api_key");
    if (savedKey) {
      onChange({ ...value, apiKey: savedKey });
      // Trigger detection for the saved key
      fetchDetectProvider(savedKey).then(({ provider }) => {
        if (!cancelled && provider) {
          onChange({ ...value, apiKey: savedKey, providerId: provider });
          // Fetch models for saved key automatically
          handleFetchModels(savedKey, provider);
        }
      });
    }

    return () => {
      cancelled = true;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleProviderChange = (providerId: string) => {
    onChange({ ...value, providerId });
  };

  const scheduleFetchModels = (key: string, provider: string) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Clear models if key is empty
    if (!key.trim()) {
      setAvailableModels([]);
      setErrorMsg("");
      return;
    }

    // Set a timeout to fetch models after user stops typing
    fetchTimeoutRef.current = window.setTimeout(() => {
      handleFetchModels(key, provider);
    }, 1500);
  };

  const handleApiKeyChange = (apiKey: string) => {
    onChange({ ...value, apiKey });
    
    // Auto detect provider immediately on change to use in fetch
    if (!detectLock.current && apiKey.trim()) {
       fetchDetectProvider(apiKey).then(({ provider }) => {
          const currentProviderId = provider || value.providerId;
          if (provider && list.some((p) => p.id === provider)) {
            onChange({ ...value, apiKey, providerId: provider });
          }
          scheduleFetchModels(apiKey, currentProviderId);
       });
    } else {
       scheduleFetchModels(apiKey, value.providerId);
    }
  };

  const handleSaveKey = () => {
    const key = value.apiKey.trim();
    if (key) {
      localStorage.setItem("user_api_key", key);
      alert("API Key 已儲存至本地！");
    } else {
      localStorage.removeItem("user_api_key");
      alert("已清除本地儲存的 API Key");
    }
  };

  const handleApiKeyBlur = () => {
    const key = value.apiKey.trim();
    if (!key || detectLock.current) return;
    detectLock.current = true;
    fetchDetectProvider(key).then(({ provider }) => {
      detectLock.current = false;
      if (provider && list.some((p) => p.id === provider)) {
        onChange({ ...value, providerId: provider });
      }
    });
  };

  const handleCustomBaseURLChange = (baseURL: string) => {
    onChange({ ...value, customBaseURL: baseURL });
  };

  const handleCustomModelChange = (model: string) => {
    onChange({ ...value, customModel: model });
  };

  const handleFetchModels = async (keyInput?: string, providerInput?: string) => {
    const key = (keyInput !== undefined ? keyInput : value.apiKey).trim();
    const providerId = providerInput !== undefined ? providerInput : value.providerId;

    if (!key) {
      setErrorMsg("請先輸入 API Key");
      return;
    }
    setIsLoadingModels(true);
    setErrorMsg("");
    try {
      const models = await fetchAvailableModels(
        key,
        providerId,
        providerId === "custom" ? value.customBaseURL : undefined
      );
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(value.customModel)) {
        // Automatically select the first available model if current is empty or not in list
        if (!value.customModel) {
          onChange({ ...value, apiKey: key, providerId, customModel: models[0] });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "驗證失敗");
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const currentProvider = list.find((p) => p.id === value.providerId);
  const isCustom = value.providerId === "custom";

  if (loading) {
    return (
      <div className="model-settings">
        <p className="model-settings-loading">載入設定…</p>
      </div>
    );
  }

  return (
    <div className="model-settings">
      <div className="model-settings-row" style={{ marginBottom: "12px", justifyContent: "flex-end" }}>
        {currentProvider?.getKeyUrl && (
          <span className="model-settings-help" style={{ fontSize: "0.9em" }}>
            沒有 Key？
            <a
              href={currentProvider.getKeyUrl}
              target="_blank"
              rel="noreferrer"
            >
              取得 {currentProvider.name} API Key
            </a>
          </span>
        )}
      </div>

      <div className="model-settings-row">
        <label className="model-settings-label" htmlFor="model-apikey">
          API Key
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            id="model-apikey"
            className="model-settings-input"
            type="password"
            placeholder="貼上或輸入 API Key，會自動判斷服務並載入模型"
            value={value.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            aria-label="API Key"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={handleSaveKey}
            disabled={disabled}
            style={{
              whiteSpace: "nowrap",
              padding: "0 12px",
              cursor: "pointer",
            }}
          >
            在本地記住 Key
          </button>
        </div>
      </div>

      {isLoadingModels && (
        <div className="model-settings-row" style={{ marginTop: "4px", color: "#666", fontSize: "0.9em", textAlign: "right", justifyContent: "flex-end" }}>
          驗證中...
        </div>
      )}

      {errorMsg && (
        <div className="model-settings-row" style={{ color: "red", fontSize: "0.9em", marginTop: "4px", textAlign: "right", justifyContent: "flex-end" }}>
          {errorMsg}
        </div>
      )}

      {availableModels.length > 0 && (
        <div className="model-settings-row" style={{ marginTop: "12px" }}>
          <label className="model-settings-label" htmlFor="model-select">
            選擇可用模型
          </label>
          <select
            id="model-select"
            className="model-settings-select"
            value={value.customModel}
            onChange={(e) => onChange({ ...value, customModel: e.target.value })}
            disabled={disabled}
          >
            <option value="">-- 使用服務預設模型 --</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {isCustom && (
        <>
          <div className="model-settings-row">
            <label className="model-settings-label" htmlFor="model-baseurl">
              自訂 API 網址
            </label>
            <input
              id="model-baseurl"
              className="model-settings-input"
              type="url"
              placeholder="https://api.example.com/v1"
              value={value.customBaseURL}
              onChange={(e) => handleCustomBaseURLChange(e.target.value)}
              disabled={disabled}
              aria-label="自訂 API 網址"
            />
          </div>
          <div className="model-settings-row">
            <label className="model-settings-label" htmlFor="model-model">
              自訂模型名稱
            </label>
            <input
              id="model-model"
              className="model-settings-input"
              type="text"
              placeholder="例如 gpt-4o-mini"
              value={value.customModel}
              onChange={(e) => handleCustomModelChange(e.target.value)}
              disabled={disabled}
              aria-label="自訂模型名稱"
            />
          </div>
        </>
      )}
    </div>
  );
}
