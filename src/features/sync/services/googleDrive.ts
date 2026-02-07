export const FILE_NAME = "kids-study-app-settings.json";

export interface AppSettings {
  level: "junior" | "senior";
  modelSettings: {
    providerId: string;
    apiKey: string;
    customBaseURL: string;
    customModel: string;
  };
  lastUpdated: number;
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

export const readFile = async (accessToken: string, fileId: string): Promise<AppSettings | null> => {
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

export const createFile = async (accessToken: string, filename: string, content: AppSettings): Promise<string | null> => {
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

export const updateFile = async (accessToken: string, fileId: string, content: AppSettings): Promise<void> => {
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

export const saveFile = async (accessToken: string, content: AppSettings): Promise<void> => {
  const fileId = await searchFile(accessToken, FILE_NAME);
  if (fileId) {
    await updateFile(accessToken, fileId, content);
  } else {
    await createFile(accessToken, FILE_NAME, content);
  }
};
