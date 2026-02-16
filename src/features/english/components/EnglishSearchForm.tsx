import { FormEvent, useState } from "react";

interface Props {
  onSearch: (word: string) => void;
  loading: boolean;
}

export const EnglishSearchForm = ({ onSearch, loading }: Props) => {
  const [word, setWord] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    onSearch(word.trim());
  };

  return (
    <form className="idiom-form" onSubmit={handleSubmit}>
      <label className="idiom-label" htmlFor="english-input">
        英文單字
      </label>
      <div className="idiom-input-row">
        <input
          id="english-input"
          className="idiom-input"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="例如：apple, beautiful, run"
          disabled={loading}
          autoFocus
          aria-label="輸入想查詢的單字"
        />
        <button 
          type="submit" 
          disabled={loading || !word.trim()} 
          className="primary-btn"
        >
          {loading ? "查詢中..." : "查單字"}
        </button>
      </div>
      <p className="helper-text">
        小提醒：輸入一個單字，AI 老師會教你怎麼用！
      </p>
    </form>
  );
};
