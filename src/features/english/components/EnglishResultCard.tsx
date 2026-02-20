import React from "react";
import { EnglishWordExplain } from "../types";

interface Props {
  data: EnglishWordExplain;
}

export const EnglishResultCard = ({ data }: Props) => {
  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(data.word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="result-card">
      <div className="result-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 className="idiom-title">{data.word}</h2>
          <button
            onClick={handleSpeak}
            className="icon-button"
            title="Pronounce"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
            aria-label="Listen to pronunciation"
          >
            🔊
          </button>
        </div>
        {data.kk_phonetic && <span className="phonetic">{data.kk_phonetic}</span>}
        {data.part_of_speech && <span className="pos-tag">{data.part_of_speech}</span>}
      </div>

      <div className="result-section">
        <h3>📖 中文意思</h3>
        <p>{data.meaning_zh}</p>
      </div>

      <div className="result-section">
        <h3>🔤 英文解釋</h3>
        <p>{data.meaning_en}</p>
      </div>

      <div className="result-section">
        <h3>📝 例句</h3>
        <ul className="example-list">
          {data.examples.map((ex, idx) => (
            <li key={idx} className="example-item">
              <p className="example-en">{ex.en}</p>
              <p className="example-zh">{ex.zh}</p>
            </li>
          ))}
        </ul>
      </div>

      {data.tips && (
        <div className="result-section tips-section">
          <h3>💡 小提醒</h3>
          <p>{data.tips}</p>
        </div>
      )}
      
      {((data.synonyms && data.synonyms.length > 0) || (data.antonyms && data.antonyms.length > 0)) && (
          <div className="result-section" style={{display: 'flex', gap: '2rem'}}>
              {data.synonyms && data.synonyms.length > 0 && (
                  <div>
                      <h3>同義詞</h3>
                      <p>{data.synonyms.join(", ")}</p>
                  </div>
              )}
               {data.antonyms && data.antonyms.length > 0 && (
                  <div>
                      <h3>反義詞</h3>
                      <p>{data.antonyms.join(", ")}</p>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
