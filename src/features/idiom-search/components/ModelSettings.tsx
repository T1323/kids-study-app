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
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProviderChange = (providerId: string) => {
    onChange({ ...value, providerId });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onChange({ ...value, apiKey });
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
        <label className="model-settings-label" htmlFor="model-provider">
          模型 / 服務
        </label>
        <select
          id="model-provider"
          className="model-settings-select"
          value={value.providerId}
          onChange={(e) => handleProviderChange(e.target.value)}
          disabled={disabled}
          aria-label="選擇模型服務"
        >
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {currentProvider?.getKeyUrl && (
          <a
            className="model-settings-link"
            href={currentProvider.getKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            取得 API Key
          </a>
        )}
      </div>

      <div className="model-settings-row">
        <label className="model-settings-label" htmlFor="model-apikey">
          API Key（選填，有填則以此 Key 呼叫所選服務）
        </label>
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
        />
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
