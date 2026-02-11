import React from 'react';
import { QuizQuestion, QuizResult } from '../types';

interface Props {
  results: QuizResult[];
  questions: QuizQuestion[];
  onClose: () => void;
}

export const QuizResultView: React.FC<Props> = ({ results, questions, onClose }) => {
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length;
  const score = Math.round((correctCount / totalCount) * 100);

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
        {questions.map((q, idx) => {
          const result = results.find(r => r.questionId === q.id);
          const isCorrect = result?.isCorrect;

          return (
            <div key={q.id} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
              <div className="review-header">
                <span className="q-num">#{idx + 1}</span>
                <span className="status-icon">{isCorrect ? '✅' : '❌'}</span>
                <span className="target-idiom">{q.target}</span>
              </div>
              <p className="q-text">{q.question.replace('_____', `【 ${q.answer} 】`)}</p>
              {!isCorrect && (
                <div className="correction">
                  <p>你的答案：<span className="wrong-ans">{result?.userAnswer}</span></p>
                  <p>正確答案：<span className="correct-ans">{q.answer}</span></p>
                </div>
              )}
              <p className="explanation">💡 {q.explanation}</p>
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
          background: #f0f4c3;
          color: #827717;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 1rem;
          border: 4px solid #dce775;
        }
        .score-number {
          font-size: 3rem;
          font-weight: bold;
        }
        .score-unit {
          font-size: 1.2rem;
          margin-top: 1rem;
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
