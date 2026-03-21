export const SETTINGS_FILE_NAME = "kids-study-app-settings.json";
export const PROGRESS_FILE_NAME = "kids-study-app-progress.json";
export const ENGLISH_PROGRESS_FILE_NAME = "kids-study-app-english-progress.json";
export const WRITING_SESSIONS_FILE_NAME = "kids-study-app-writing-sessions.json";
export const WRITING_PROGRESS_FILE_NAME = "kids-study-app-writing-progress.json";
export const FOLDER_NAME = "kids-study-app";

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

export interface CustomChallengeHistory {
  id: string;
  description: string;
  timestamp: number;
}

export interface WritingProgressReport {
  timestamp: string;
  current_level: number;
  focus_point: string;
  improvement: string;
  next_goal: string;
}

export interface WritingSessionRecord {
  id: string;
  topic: string;
  content: string;
  materials: string[];
  chatHistory: { role: 'user' | 'assistant', content: string }[];
  gradingResults: any[];
  lastModified: number;
}

export interface UserProgressData {
  idioms?: Record<string, IdiomProgress>;
  english?: Record<string, EnglishProgress>;
  customChallenges?: CustomChallengeHistory[];
  writingSessions?: WritingSessionRecord[];
  writingProgressReports?: WritingProgressReport[];
  lastSynced: number;
}

// Folder Management

export const searchFolder = async (accessToken: string, folderName: string): Promise<string | null> => {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
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
    console.error("Error searching folder:", error);
    return null;
  }
};

export const createFolder = async (accessToken: string, folderName: string): Promise<string | null> => {
  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  const url = "https://www.googleapis.com/drive/v3/files";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Error creating folder:", error);
    return null;
  }
};

export const ensureAppFolder = async (accessToken: string): Promise<string | null> => {
  let folderId = await searchFolder(accessToken, FOLDER_NAME);
  if (!folderId) {
    folderId = await createFolder(accessToken, FOLDER_NAME);
  }
  return folderId;
};

// File Management

export const searchFile = async (accessToken: string, filename: string, parentId?: string): Promise<string | null> => {
  let query = `name = '${filename}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
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
    if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error reading file:", error);
    return null;
  }
};

export const createFile = async <T>(accessToken: string, filename: string, content: T, parentId?: string): Promise<string | null> => {
  const metadata: any = {
    name: filename,
    mimeType: "application/json",
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

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

export const moveFile = async (accessToken: string, fileId: string, folderId: string): Promise<boolean> => {
  // First, get the current parents
  const getUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`;
  try {
    const getResponse = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await getResponse.json();
    const previousParents = data.parents ? data.parents.join(',') : '';

    // Now move the file
    const moveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`;
    const moveResponse = await fetch(moveUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (moveResponse.ok) {
        return true;
    } else {
        console.error("Error moving file:", await moveResponse.text());
        return false;
    }
  } catch (error) {
    console.error("Error moving file:", error);
    return false;
  }
};

export const migrateLegacyFiles = async (accessToken: string, targetFolderId: string): Promise<void> => {
    const legacyFiles = [SETTINGS_FILE_NAME, PROGRESS_FILE_NAME, ENGLISH_PROGRESS_FILE_NAME];
    
    for (const filename of legacyFiles) {
        // Search for file in root (or wherever it was originally created without a specific parent)
        // Note: The original searchFile didn't specify a parent, so it found files anywhere not trashed.
        // We need to be careful not to find the one we just created in the folder.
        // So we search for files with the name, and check their parents.
        
        const query = `name = '${filename}' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, parents)`;

        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await response.json();
            
            if (data.files && data.files.length > 0) {
                for (const file of data.files) {
                    // Check if file is already in the target folder
                    if (file.parents && file.parents.includes(targetFolderId)) {
                        continue; 
                    }
                    
                    // If not in target folder, move it
                    console.log(`Migrating ${filename} (${file.id}) to folder ${targetFolderId}`);
                    await moveFile(accessToken, file.id, targetFolderId);
                }
            }
        } catch (error) {
            console.error(`Error migrating ${filename}:`, error);
        }
    }
};


// Generic save function
export const saveFileToDrive = async <T>(accessToken: string, filename: string, content: T, parentId?: string): Promise<void> => {
  const fileId = await searchFile(accessToken, filename, parentId);
  if (fileId) {
    await updateFile(accessToken, fileId, content);
  } else {
    await createFile(accessToken, filename, content, parentId);
  }
};

// Specific save functions
// Note: These now accept an optional folderId. If not provided, it falls back to previous behavior (search everywhere/root),
// but for best practice, the caller should provide the folderId.
export const saveSettings = async (accessToken: string, content: AppSettings, folderId?: string): Promise<void> => {
  return saveFileToDrive(accessToken, SETTINGS_FILE_NAME, content, folderId);
};

export const saveProgress = async (accessToken: string, content: UserProgressData, folderId?: string): Promise<void> => {
  return saveFileToDrive(accessToken, PROGRESS_FILE_NAME, content, folderId);
};

export const saveEnglishProgress = async (accessToken: string, content: UserProgressData, folderId?: string): Promise<void> => {
    return saveFileToDrive(accessToken, ENGLISH_PROGRESS_FILE_NAME, content, folderId);
};

export const saveWritingSessions = async (accessToken: string, content: WritingSessionRecord[], folderId?: string): Promise<void> => {
  return saveFileToDrive(accessToken, WRITING_SESSIONS_FILE_NAME, content, folderId);
};

export const saveWritingProgress = async (accessToken: string, content: WritingProgressReport[], folderId?: string): Promise<void> => {
  return saveFileToDrive(accessToken, WRITING_PROGRESS_FILE_NAME, content, folderId);
};

// Deprecated: Alias for backward compatibility if needed, but prefer saveSettings
export const saveFile = saveSettings; 
