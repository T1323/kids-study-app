import React, { useState } from 'react';
import { QuizQuestion, QuizResult } from '../types';

interface Props {
  questions: QuizQuestion[];
  onComplete: (results: QuizResult[]) => void;
}

export const QuizGame: React.FC<Props> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedOption === currentQuestion.answer;

  const handleOptionClick = (option: string) => {
    if (showFeedback) return;
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setShowFeedback(true);
  };

  const handleNext = () => {
    const newResult: QuizResult = {
      questionId: currentQuestion.id,
      isCorrect: selectedOption === currentQuestion.answer,
      userAnswer: selectedOption || "",
    };
    
    const newResults = [...results, newResult];
    setResults(newResults);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      onComplete(newResults);
    }
  };

  return (
    <div className="quiz-game">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>
      <div className="progress-text">
        第 {currentIndex + 1} 題 / 共 {questions.length} 題
      </div>

      <div className="question-card">
        <h3 className="question-text">{currentQuestion.question}</h3>
        
        <div className="options-grid">
          {currentQuestion.options.map((option, idx) => {
            let className = "option-btn";
            if (showFeedback) {
              if (option === currentQuestion.answer) className += " correct";
              else if (option === selectedOption) className += " wrong";
              else className += " disabled";
            } else {
              if (option === selectedOption) className += " selected";
            }

            return (
              <button
                key={idx}
                className={className}
                onClick={() => handleOptionClick(option)}
                disabled={showFeedback}
              >
                {option}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className={`feedback-area ${isCorrect ? 'success' : 'error'}`}>
            <h4>{isCorrect ? '🎉 答對了！' : '😢 答錯了...'}</h4>
            <p><strong>正確答案：</strong>{currentQuestion.answer}</p>
            <p className="explanation">{currentQuestion.explanation}</p>
            <button className="next-btn" onClick={handleNext}>
              {currentIndex < questions.length - 1 ? '下一題' : '查看結果'}
            </button>
          </div>
        )}

        {!showFeedback && (
          <div className="action-area">
            <button 
              className="submit-btn" 
              onClick={handleSubmit}
              disabled={!selectedOption}
            >
              送出答案
            </button>
          </div>
        )}
      </div>

      <style>{`
        .quiz-game {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }
        .progress-bar {
          height: 8px;
          background: #eee;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .progress-fill {
          height: 100%;
          background: #4CAF50;
          transition: width 0.3s ease;
        }
        .progress-text {
          text-align: right;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 1rem;
        }
        .question-card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .question-text {
          font-size: 1.3rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          color: #2c3e50;
        }
        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        @media (max-width: 480px) {
          .options-grid {
            grid-template-columns: 1fr;
          }
        }
        .option-btn {
          padding: 1rem;
          font-size: 1.1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .option-btn:hover:not(:disabled) {
          border-color: #2196F3;
          background: #e3f2fd;
        }
        .option-btn.selected {
          border-color: #2196F3;
          background: #e3f2fd;
          font-weight: bold;
        }
        .option-btn.correct {
          border-color: #4CAF50;
          background: #e8f5e9;
          color: #2e7d32;
        }
        .option-btn.wrong {
          border-color: #f44336;
          background: #ffebee;
          color: #c62828;
        }
        .option-btn.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .action-area {
          text-align: center;
        }
        .submit-btn, .next-btn {
          padding: 0.8rem 2.5rem;
          font-size: 1.1rem;
          border-radius: 25px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.1s;
        }
        .submit-btn {
          background: #2196F3;
          color: white;
        }
        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .next-btn {
          background: #4CAF50;
          color: white;
          margin-top: 1rem;
        }
        .feedback-area {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          animation: fadeIn 0.3s;
        }
        .feedback-area.success {
          background: #e8f5e9;
          border: 1px solid #c8e6c9;
        }
        .feedback-area.error {
          background: #ffebee;
          border: 1px solid #ffcdd2;
        }
        .feedback-area h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.2rem;
        }
        .explanation {
          color: #555;
          margin-top: 0.5rem;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
