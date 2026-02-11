import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
  }
}

interface Props {
  onLoginSuccess: (accessToken: string) => void;
}

export function GoogleLogin({ onLoginSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const tokenClient = useRef<any>(null);
  const refreshTimer = useRef<number | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.warn("Google Client ID not found in .env");
      return;
    }

    // Check if google object is available (it might load async)
    const checkGoogle = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(checkGoogle);
        try {
          tokenClient.current = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/drive.file",
            callback: (response: any) => {
              setLoading(false);
              if (response.access_token) {
                onLoginSuccess(response.access_token);

                // Setup Silent Refresh (Auto-refresh before expiry)
                if (refreshTimer.current) {
                  window.clearTimeout(refreshTimer.current);
                }

                // Default expiry is 3599s. Refresh 5 mins before.
                const expiresIn = response.expires_in || 3599;
                const refreshTime = (expiresIn - 300) * 1000;

                refreshTimer.current = window.setTimeout(() => {
                  console.log("Auto-refreshing Google Access Token...");
                  // Try to refresh without prompting if possible (though Token Model usually pops up)
                  tokenClient.current.requestAccessToken({ prompt: "" });
                }, refreshTime);
              } else {
                console.error("Google Login Failed", response);
                alert("登入失敗，請稍後再試。");
              }
            },
          });
        } catch (e) {
          console.error("Error initializing Google Token Client", e);
        }
      }
    }, 500);

    return () => {
      clearInterval(checkGoogle);
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, [clientId, onLoginSuccess]);

  const handleLogin = () => {
    if (!tokenClient.current) {
      alert("Google 登入服務尚未準備好，請稍候或檢查網路連線。");
      return;
    }
    setLoading(true);
    tokenClient.current.requestAccessToken();
  };

  if (!clientId) return null;

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      style={{
        backgroundColor: "#fff",
        border: "1px solid #dadce0",
        color: "#3c4043",
        padding: "8px 16px",
        borderRadius: "4px",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <img
        src="https://www.google.com/favicon.ico"
        alt="Google"
        style={{ width: "18px", height: "18px" }}
      />
      {loading ? "登入中..." : "登入 Google 以同步進度"}
    </button>
  );
}
