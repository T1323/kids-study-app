import { useState } from "react";
import { IdiomSearchView } from "./features/idiom-search/IdiomSearchView";
import { GoogleLogin } from "./features/sync/GoogleLogin";

export const App = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

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
          <div>
            {accessToken ? (
              <span style={{ fontSize: "0.9rem", color: "#635bff", fontWeight: 500 }}>
                ✓ 已連結 Google Drive
              </span>
            ) : (
              <GoogleLogin onLoginSuccess={setAccessToken} />
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        <IdiomSearchView />
      </main>
    </div>
  );
};

