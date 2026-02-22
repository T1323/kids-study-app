import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useGlobalContext } from "../context/GlobalContext";
import { GoogleLogin } from "../features/sync/GoogleLogin";
import { ModelSettings } from "../features/idiom-search/components/ModelSettings";

export const MainLayout = () => {
  const {
    accessToken,
    isLoginLoading,
    login,
    logout,
    modelSettings,
    setModelSettings,
    level,
    setLevel
  } = useGlobalContext();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);

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
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <h1>小小學堂</h1>
            </Link>
            <nav style={{ display: "flex", gap: "10px" }}>
              <Link to="/idioms" style={{ 
                textDecoration: location.pathname.includes("idioms") ? "underline" : "none",
                fontWeight: location.pathname.includes("idioms") ? "bold" : "normal"
              }}>
                成語
              </Link>
              <Link to="/english" style={{ 
                 textDecoration: location.pathname.includes("english") ? "underline" : "none",
                 fontWeight: location.pathname.includes("english") ? "bold" : "normal"
              }}>
                英文
              </Link>
            </nav>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
             <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: "none",
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
            >
              ⚙️ 設定
            </button>

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
              <GoogleLogin onLogin={login} loading={isLoginLoading} />
            )}
          </div>
        </div>
        
        {/* Global Settings Panel (Collapsible) */}
        {showSettings && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9f9f9", borderRadius: "8px" }}>
             <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eee" }}>
                <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>學習程度</h3>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <input
                      type="radio"
                      name="level"
                      value="junior"
                      checked={level === "junior"}
                      onChange={() => setLevel("junior")}
                      style={{ marginRight: "0.5rem" }}
                    />
                    低年級
                  </label>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <input
                      type="radio"
                      name="level"
                      value="senior"
                      checked={level === "senior"}
                      onChange={() => setLevel("senior")}
                      style={{ marginRight: "0.5rem" }}
                    />
                    高年級
                  </label>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <input
                      type="radio"
                      name="level"
                      value="junior-high"
                      checked={level === "junior-high"}
                      onChange={() => setLevel("junior-high")}
                      style={{ marginRight: "0.5rem" }}
                    />
                    國中
                  </label>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <input
                      type="radio"
                      name="level"
                      value="university"
                      checked={level === "university"}
                      onChange={() => setLevel("university")}
                      style={{ marginRight: "0.5rem" }}
                    />
                    高中/大學
                  </label>
                </div>
             </div>

             <h3 style={{ marginTop: 0 }}>AI 模型設定</h3>
             <ModelSettings
                value={modelSettings}
                onChange={setModelSettings}
             />
          </div>
        )}
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};
