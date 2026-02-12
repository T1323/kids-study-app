import { IdiomSearchView } from "./features/idiom-search/IdiomSearchView";
import { GoogleLogin } from "./features/sync/GoogleLogin";
import { useGoogleAuth } from "./features/sync/hooks/useGoogleAuth";

export const App = () => {
  const { accessToken, login, logout, loading } = useGoogleAuth();

  return (
    <div className="app-root">
      <header className="app-header">
        <div
          className="app-title-block"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1>成語小小學堂</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {accessToken ? (
              <>
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#635bff",
                    fontWeight: 500,
                  }}
                >
                  ✓ 已連結 Google Drive
                </span>
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  登出
                </button>
              </>
            ) : (
              <GoogleLogin onLogin={login} loading={loading} />
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        <IdiomSearchView accessToken={accessToken} />
      </main>
    </div>
  );
};

