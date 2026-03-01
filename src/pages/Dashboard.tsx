import React from "react";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const navigate = useNavigate();

  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "2rem",
    width: "300px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "1rem",
    transition: "transform 0.2s, box-shadow 0.2s",
    backgroundColor: "#fff",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
  };

  const handleHover = (e: React.MouseEvent<HTMLDivElement>, isEnter: boolean) => {
    e.currentTarget.style.transform = isEnter ? "translateY(-5px)" : "translateY(0)";
    e.currentTarget.style.boxShadow = isEnter ? "0 8px 15px rgba(0,0,0,0.1)" : "0 2px 5px rgba(0,0,0,0.05)";
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "60vh",
      gap: "2rem"
    }}>
      <h2 style={{ fontSize: "2rem", color: "#333" }}>今天來學什麼？</h2>
      
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
        {/* Idiom Card */}
        <div 
          style={cardStyle}
          onClick={() => navigate("/idioms")}
          onMouseEnter={(e) => handleHover(e, true)}
          onMouseLeave={(e) => handleHover(e, false)}
        >
          <div style={{ fontSize: "4rem" }}>📖</div>
          <h3 style={{ margin: 0, fontSize: "1.5rem" }}>成語學習</h3>
          <p style={{ textAlign: "center", color: "#666" }}>
            學習成語的由來、解釋與用法，還有趣味測驗喔！
          </p>
        </div>

        {/* English Card */}
        <div 
          style={cardStyle}
          onClick={() => navigate("/english")}
          onMouseEnter={(e) => handleHover(e, true)}
          onMouseLeave={(e) => handleHover(e, false)}
        >
          <div style={{ fontSize: "4rem" }}>🔤</div>
          <h3 style={{ margin: 0, fontSize: "1.5rem" }}>英文</h3>
          <p style={{ textAlign: "center", color: "#666" }}>
            學習英文單字、片語，還有測驗、自定情境與文法練習。
          </p>
        </div>
      </div>
    </div>
  );
};
