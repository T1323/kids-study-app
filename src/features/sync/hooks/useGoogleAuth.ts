import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    google: any;
  }
}

const STORAGE_KEY_TOKEN = "google_access_token";
const STORAGE_KEY_EXPIRY = "google_token_expiry";

interface UseGoogleAuthReturn {
  accessToken: string | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isReady: boolean;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const tokenClient = useRef<any>(null);
  const refreshTimer = useRef<number | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const clearAutoRefresh = () => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    clearAutoRefresh();
    
    // Revoke token if possible (optional, but good practice)
    if (window.google && accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Token revoked');
      });
    }
  }, [accessToken]);

  const scheduleRefresh = useCallback((expiresInSeconds: number) => {
    clearAutoRefresh();
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresInSeconds - 300) * 1000;
    
    if (refreshTime > 0) {
      console.log(`Scheduling auto-refresh in ${refreshTime / 1000} seconds`);
      refreshTimer.current = window.setTimeout(() => {
        if (tokenClient.current) {
          console.log("Auto-refreshing Google Access Token...");
          // prompt: '' attempts to refresh without showing the consent modal if possible
          tokenClient.current.requestAccessToken({ prompt: "" });
        }
      }, refreshTime);
    }
  }, []);

  const handleTokenResponse = useCallback((response: any) => {
    setLoading(false);
    if (response.access_token) {
      const token = response.access_token;
      const expiresIn = response.expires_in || 3599;
      const expiryTime = Date.now() + expiresIn * 1000;

      setAccessToken(token);
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_EXPIRY, expiryTime.toString());

      scheduleRefresh(expiresIn);
    } else {
      console.error("Google Login Failed", response);
      alert("登入失敗，請稍後再試。");
    }
  }, [scheduleRefresh]);

  // Initialize Token Client
  useEffect(() => {
    if (!clientId) {
      console.warn("Google Client ID not found in .env");
      return;
    }

    const checkGoogle = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(checkGoogle);
        try {
          tokenClient.current = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/drive.file",
            callback: handleTokenResponse,
          });
          setIsReady(true);
        } catch (e) {
          console.error("Error initializing Google Token Client", e);
        }
      }
    }, 500);

    return () => clearInterval(checkGoogle);
  }, [clientId, handleTokenResponse]);

  // Restore Session from LocalStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storedExpiry = localStorage.getItem(STORAGE_KEY_EXPIRY);

    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      const now = Date.now();
      
      if (now < expiryTime) {
        // Token is still valid
        setAccessToken(storedToken);
        const remainingSeconds = Math.floor((expiryTime - now) / 1000);
        scheduleRefresh(remainingSeconds);
      } else {
        // Token expired
        logout();
      }
    }
  }, [logout, scheduleRefresh]);

  const login = useCallback(() => {
    if (!tokenClient.current) {
      alert("Google 登入服務尚未準備好，請稍候或檢查網路連線。");
      return;
    }
    setLoading(true);
    // Explicitly ask for consent to ensure we get a fresh token if needed
    // or just standard login
    tokenClient.current.requestAccessToken();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAutoRefresh();
  }, []);

  return { accessToken, loading, login, logout, isReady };
}
