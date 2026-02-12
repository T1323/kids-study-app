
interface Props {
  onLogin: () => void;
  loading?: boolean;
}

export function GoogleLogin({ onLogin, loading = false }: Props) {
  return (
    <button
      onClick={onLogin}
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
