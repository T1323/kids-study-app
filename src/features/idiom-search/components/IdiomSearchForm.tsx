import { FormEvent, useState } from "react";

interface Props {
  onSearch: (idiom: string) => void;
  loading: boolean;
}

export const IdiomSearchForm = ({ onSearch, loading }: Props) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  };

  return (
    <form className="idiom-form" onSubmit={handleSubmit}>
      <label className="idiom-label" htmlFor="idiom-input">
        成語關鍵字
      </label>
      <div className="idiom-input-row">
        <input
          id="idiom-input"
          className="idiom-input"
          type="text"
          placeholder="例如：畫蛇添足、三心二意"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="輸入想查詢的成語"
        />
        <button
          className="primary-btn"
          type="submit"
          disabled={loading || !value.trim()}
        >
          {loading ? "查詢中..." : "查成語"}
        </button>
      </div>
      <p className="helper-text">
        小提醒：不必輸入得很完整，打一點關鍵字也可以試試看唷！
      </p>
    </form>
  );
};

