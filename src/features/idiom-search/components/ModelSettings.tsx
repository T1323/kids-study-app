import { useEffect, useRef, useState } from "react";
import {
  fetchProviders,
  fetchDetectProvider,
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

export function ModelSettings({ value, onChange, disabled }: Props) {
  const [list, setList] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const detectLock = useRef(false);

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
        }
      });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleProviderChange = (providerId: string) => {
    onChange({ ...value, providerId });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onChange({ ...value, apiKey });
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

  const currentProvider = list.find((p) => p.id === value.providerId);
  const isCustom = value.providerId === "custom";

  if (loading) {
    return (
      <div className="model-settings">
        <p className="model-settings-loading">載入模型選項…</p>
      </div>
    );
  }

  return (
    <div className="model-settings">
      <div className="model-settings-row">
        <label className="model-settings-label" htmlFor="model-apikey">
          API Key
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            id="model-apikey"
            className="model-settings-input"
            type="password"
            placeholder="貼上或輸入 API Key，會自動判斷服務"
            value={value.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            onBlur={handleApiKeyBlur}
            onPaste={() => setTimeout(handleApiKeyBlur, 0)}
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
