import React from 'react';
import { MatchingPair, QuizResult } from '../types';

interface Props {
  results: QuizResult[];
  pairs: MatchingPair[];
  onClose: () => void;
}

export const MatchingResultView: React.FC<Props> = ({ results, pairs, onClose }) => {
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  let comment = "";
  if (score === 100) comment = "太厲害了！全部答對！🎉";
  else if (score >= 80) comment = "很棒喔！繼續保持！👍";
  else if (score >= 60) comment = "不錯喔，再加油一下！💪";
  else comment = "沒關係，多練習就會了！🌱";

  return (
    <div className="quiz-result">
      <div className="score-card">
        <div className="score-circle">
          <span className="score-number">{score}</span>
          <span className="score-unit">分</span>
        </div>
        <h3>{comment}</h3>
      </div>

      <div className="review-list">
        <h4>作答檢討</h4>
        {pairs.map((pair, idx) => {
          const result = results.find(r => r.questionId === pair.id);
          const isCorrect = result?.isCorrect;

          return (
            <div key={pair.id} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
              <div className="review-header">
                <span className="q-num">#{idx + 1}</span>
                <span className="status-icon">{isCorrect ? '✅' : '❌'}</span>
                <span className="target-idiom">{pair.idiom}</span>
              </div>
              <p className="q-text">
                {(() => {
                  const regex = /(\(_{3,}\)|（_{3,}）|_{3,})/g;
                  const parts = pair.sentence.split(regex);
                  return parts.map((part, index) => {
                    if (regex.test(part)) {
                      return (
                        <span key={index} className={`blank-filled ${isCorrect ? 'correct-text' : 'wrong-text'}`}>
                           {isCorrect ? pair.idiom : (result?.userAnswer || '_____')}
                        </span>
                      );
                    }
                    return <span key={index}>{part}</span>;
                  });
                })()}
              </p>
              {!isCorrect && (
                <div className="correction">
                  <p>你的答案：<span className="wrong-ans">{result?.userAnswer || '(未作答)'}</span></p>
                  <p>正確答案：<span className="correct-ans">{pair.idiom}</span></p>
                </div>
              )}
              {pair.explanation && (
                <p className="explanation">💡 {pair.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <button className="finish-btn" onClick={onClose}>
        完成測驗
      </button>

      <style>{`
        .quiz-result {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
          text-align: center;
        }
        .score-card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #e1f5fe;
          color: #0288d1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          margin: 0 auto 1rem;
          border: 4px solid #b3e5fc;
        }
        .score-number {
          font-size: 3rem;
          font-weight: bold;
        }
        .score-unit {
          font-size: 1.2rem;
          margin-top: 5px;
        }
        .review-list {
          text-align: left;
          margin-bottom: 2rem;
        }
        .review-item {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border-left: 5px solid #ccc;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .review-item.correct {
          border-left-color: #4CAF50;
        }
        .review-item.wrong {
          border-left-color: #f44336;
        }
        .review-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        .target-idiom {
          font-size: 1.1rem;
          color: #333;
        }
        .q-text {
          color: #555;
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .blank-filled {
            font-weight: bold;
            text-decoration: underline;
            padding: 0 4px;
        }
        .blank-filled.correct-text {
            color: #2e7d32;
        }
        .blank-filled.wrong-text {
            color: #c62828;
            text-decoration-style: wavy;
        }

        .correction {
          background: #ffebee;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .wrong-ans { color: #c62828; text-decoration: line-through; }
        .correct-ans { color: #2e7d32; font-weight: bold; }
        .explanation {
          font-size: 0.9rem;
          color: #666;
          font-style: italic;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dashed #eee;
        }
        .finish-btn {
          padding: 1rem 3rem;
          font-size: 1.2rem;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(33, 150, 243, 0.3);
          transition: transform 0.1s;
        }
        .finish-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};
