export const SETTINGS_FILE_NAME = "kids-study-app-settings.json";
export const PROGRESS_FILE_NAME = "kids-study-app-progress.json";
export const ENGLISH_PROGRESS_FILE_NAME = "kids-study-app-english-progress.json";

// Keep for backward compatibility during refactor, but better to use specific constants
export const FILE_NAME = SETTINGS_FILE_NAME;

export interface AppSettings {
  level: "junior" | "senior" | "junior-high" | "university";
  modelSettings: {
    providerId: string;
    apiKey: string;
    customBaseURL: string;
    customModel: string;
  };
  lastUpdated: number;
}

export interface IdiomProgress {
  idiom: string;
  queryTime: number; // Timestamp
  proficiency: number; // 0-100 (default 0)
  lastTestTime: number; // Timestamp (default 0)
  queryCount: number; // How many times queried
}

export interface EnglishProgress {
  word: string;
  queryTime: number; // Timestamp
  proficiency: number; // 0-100 (default 0)
  lastTestTime: number; // Timestamp (default 0)
  queryCount: number; // How many times queried
}

export interface UserProgressData {
  idioms?: Record<string, IdiomProgress>;
  english?: Record<string, EnglishProgress>;
  lastSynced: number;
}

export const searchFile = async (accessToken: string, filename: string): Promise<string | null> => {
  const query = `name = '${filename}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error searching file:", error);
    return null;
  }
};

export const readFile = async <T>(accessToken: string, fileId: string): Promise<T | null> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error("Error reading file:", error);
    return null;
  }
};

export const createFile = async <T>(accessToken: string, filename: string, content: T): Promise<string | null> => {
  const metadata = {
    name: filename,
    mimeType: "application/json",
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append(
    "file",
    new Blob([JSON.stringify(content)], { type: "application/json" })
  );

  const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Error creating file:", error);
    return null;
  }
};

export const updateFile = async <T>(accessToken: string, fileId: string, content: T): Promise<void> => {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

  try {
    await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(content),
    });
  } catch (error) {
    console.error("Error updating file:", error);
  }
};

// Generic save function
export const saveFileToDrive = async <T>(accessToken: string, filename: string, content: T): Promise<void> => {
  const fileId = await searchFile(accessToken, filename);
  if (fileId) {
    await updateFile(accessToken, fileId, content);
  } else {
    await createFile(accessToken, filename, content);
  }
};

// Specific save functions
export const saveSettings = async (accessToken: string, content: AppSettings): Promise<void> => {
  return saveFileToDrive(accessToken, SETTINGS_FILE_NAME, content);
};

export const saveProgress = async (accessToken: string, content: UserProgressData): Promise<void> => {
  return saveFileToDrive(accessToken, PROGRESS_FILE_NAME, content);
};

// Deprecated: Alias for backward compatibility if needed, but prefer saveSettings
export const saveFile = saveSettings; 
