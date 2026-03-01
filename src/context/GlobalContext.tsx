import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGoogleAuth } from "../features/sync/hooks/useGoogleAuth";
import {
  searchFile,
  readFile,
  createFile,
  updateFile,
  SETTINGS_FILE_NAME,
  ensureAppFolder,
  migrateLegacyFiles,
  FOLDER_NAME
} from "../features/sync/services/googleDrive";

// Re-using the structure from ModelSettings, but now it's global
export interface ModelSettingsValue {
  providerId: string;
  apiKey: string;
  customBaseURL: string;
  customModel: string;
}

export type StudyLevel = "junior" | "senior" | "junior-high" | "university";

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
  appFolderId: string | null;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  // 1. Google Auth
  const { accessToken, login, logout, loading: isLoginLoading } = useGoogleAuth();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [appFolderId, setAppFolderId] = useState<string | null>(null);

  // 2. Model Settings
  // Initialize from localStorage if available (or default)
  const [modelSettings, setModelSettingsState] = useState<ModelSettingsValue>(() => {
    const savedKey = localStorage.getItem("user_api_key") || "";
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
      setAppFolderId(null);
      return;
    }

    setSettingsLoaded(false);

    const loadSettings = async () => {
      try {
        // 1. Ensure App Folder Exists
        const folderId = await ensureAppFolder(accessToken);
        if (folderId) {
          setAppFolderId(folderId);
          
          // 2. Migrate any legacy files to this folder
          // This ensures that if the user had files in root, they get moved to the folder
          // and we don't create duplicates or lose data.
          // Note: This might take a moment, but it's important.
          // Ideally we might want to show a "migrating..." status, but "settingsLoaded=false" covers it.
          // But migrateLegacyFiles logic needs to be robust. 
          // (Assuming my implementation in googleDrive.ts handles checks correctly)
           // Actually, let's verify if we need to await migration before searching settings.
           // Yes, because we want to find the settings in the folder if they were moved.
           // Or if they are in root, migration will move them, then we search in folder.
           
           // However, migrateLegacyFiles implementation I wrote iterates specific filenames.
           // So if settings file exists in root, it will be moved.
           await migrateLegacyFiles(accessToken, folderId);

           // 3. Load Settings from Folder
           const settingsId = await searchFile(accessToken, SETTINGS_FILE_NAME, folderId);
           if (settingsId) {
             const remoteSettings: any = await readFile(accessToken, settingsId);
             if (remoteSettings) {
               if (remoteSettings.level) setLevel(remoteSettings.level);
               if (remoteSettings.modelSettings)
                 setModelSettings(remoteSettings.modelSettings);
             }
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
    if (!accessToken || !settingsLoaded || !appFolderId) return;

    const timer = setTimeout(async () => {
      const settingsContent = {
        level,
        modelSettings,
        lastUpdated: Date.now(),
      };

      try {
        const fileId = await searchFile(accessToken, SETTINGS_FILE_NAME, appFolderId);
        if (fileId) {
          await updateFile(accessToken, fileId, settingsContent);
        } else {
          await createFile(accessToken, SETTINGS_FILE_NAME, settingsContent, appFolderId);
        }
      } catch (err) {
        console.error("Failed to save settings:", err);
      }
    }, 2000); // Debounce 2s

    return () => clearTimeout(timer);
  }, [level, modelSettings, accessToken, settingsLoaded, appFolderId]);

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
        appFolderId,
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
