import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGoogleAuth } from "../features/sync/hooks/useGoogleAuth";
import {
  searchFile,
  readFile,
  createFile,
  updateFile,
  SETTINGS_FILE_NAME,
} from "../features/sync/services/googleDrive";

// Re-using the structure from ModelSettings, but now it's global
export interface ModelSettingsValue {
  providerId: string;
  apiKey: string;
  customBaseURL: string;
  customModel: string;
}

export type StudyLevel = "junior" | "senior" | "junior-high";

interface GlobalContextType {
  accessToken: string | null;
  isLoginLoading: boolean;
  login: () => void;
  logout: () => void;
  modelSettings: ModelSettingsValue;
  setModelSettings: (settings: ModelSettingsValue) => void;
  level: StudyLevel;
  setLevel: (level: StudyLevel) => void;
  settingsLoaded: boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  // 1. Google Auth
  const { accessToken, login, logout, loading: isLoginLoading } = useGoogleAuth();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // 2. Model Settings
  // Initialize from localStorage if available (or default)
  const [modelSettings, setModelSettingsState] = useState<ModelSettingsValue>(() => {
    const savedKey = localStorage.getItem("user_api_key") || "";
    // We could persist other fields too, but for now let's stick to what was there.
    // Actually, to make it fully global, we might want to sync all fields with local storage or just keep them in memory.
    // The previous implementation loaded key from localStorage.
    return {
      providerId: "google", // default
      apiKey: savedKey,
      customBaseURL: "",
      customModel: "",
    };
  });

  const setModelSettings = (newSettings: ModelSettingsValue) => {
    setModelSettingsState(newSettings);
    // Persist API Key as per original logic
    if (newSettings.apiKey) {
      localStorage.setItem("user_api_key", newSettings.apiKey);
    } else {
      localStorage.removeItem("user_api_key");
    }
  };

  // 3. Study Level
  const [level, setLevelState] = useState<StudyLevel>(() => {
    return (localStorage.getItem("user_level") as StudyLevel) || "junior";
  });

  const setLevel = (newLevel: StudyLevel) => {
    setLevelState(newLevel);
    localStorage.setItem("user_level", newLevel);
  };

  // 4. Sync Settings with Google Drive
  // Load Settings from Drive on Login
  useEffect(() => {
    if (!accessToken) {
      setSettingsLoaded(true);
      return;
    }

    setSettingsLoaded(false);

    const loadSettings = async () => {
      try {
        const settingsId = await searchFile(accessToken, SETTINGS_FILE_NAME);
        if (settingsId) {
          const remoteSettings: any = await readFile(accessToken, settingsId);
          if (remoteSettings) {
            if (remoteSettings.level) setLevel(remoteSettings.level);
            if (remoteSettings.modelSettings)
              setModelSettings(remoteSettings.modelSettings);
          }
        }
      } catch (err) {
        console.error("Failed to load settings from Drive:", err);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, [accessToken]);

  // Save Settings to Drive when changed (debounced)
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

  return (
    <GlobalContext.Provider
      value={{
        accessToken,
        isLoginLoading,
        login,
        logout,
        modelSettings,
        setModelSettings,
        level,
        setLevel,
        settingsLoaded,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};
