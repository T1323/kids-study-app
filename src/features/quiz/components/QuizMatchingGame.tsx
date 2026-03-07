import React, { useState, useEffect, useRef } from 'react';
import { MatchingPair, QuizResult } from '../types';

interface Props {
  pairs: MatchingPair[];
  onComplete: (results: QuizResult[]) => void;
}

// --- Sub-components ---

interface SentenceItemProps {
  pair: MatchingPair;
  isSelected: boolean;
  matchedIdiomText: string | null;
  status: 'normal' | 'correct' | 'wrong';
  onClick: (id: string) => void;
  showExplanation: boolean;
}

const SentenceItem: React.FC<SentenceItemProps> = ({ 
  pair, 
  isSelected, 
  matchedIdiomText, 
  status, 
  onClick,
  showExplanation
}) => {
  // Parsing logic to handle different placeholder formats
  const renderSentence = () => {
    // Regex matches:
    // 1. (_____) -> \(_+\)
    // 2. （_____） -> （_+）
    // 3. _____ -> _+
    // Note: We use capturing group () to include the delimiter in the split result
    const regex = /(\(_{3,}\)|（_{3,}）|_{3,})/g;
    const parts = pair.sentence.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className={`blank ${status === 'correct' ? 'filled-correct' : status === 'wrong' ? 'filled-wrong' : ''} ${matchedIdiomText ? 'filled' : ''}`}>
            {matchedIdiomText || "　　　　"}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div 
      className={`item sentence-item ${isSelected ? 'selected' : ''} ${status}`}
      onClick={() => onClick(pair.id)}
    >
      <div className="sentence-text">
        {renderSentence()}
      </div>
      
      {status === 'wrong' && (
        <div className="correction">
          正確答案: {pair.idiom}
        </div>
      )}
      
      {showExplanation && pair.explanation && (
        <div className="explanation">
          💡 {pair.explanation}
        </div>
      )}
    </div>
  );
};

interface IdiomItemProps {
  pair: MatchingPair;
  isSelected: boolean;
  isMatched: boolean;
  onClick: (id: string) => void;
}

const IdiomItem: React.FC<IdiomItemProps> = ({ pair, isSelected, isMatched, onClick }) => {
  return (
    <div 
      className={`item idiom-item ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}`}
      onClick={() => onClick(pair.id)}
    >
      {pair.idiom}
    </div>
  );
};

// --- Main Component ---

export const QuizMatchingGame: React.FC<Props> = ({ pairs, onComplete }) => {
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [selectedIdiom, setSelectedIdiom] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // sentenceId -> idiomId
  
  // Shuffled idioms for the right side (or top on mobile)
  const [shuffledIdioms, setShuffledIdioms] = useState<MatchingPair[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Shuffle only once on mount
    setShuffledIdioms([...pairs].sort(() => Math.random() - 0.5));
  }, [pairs]);

  const handleSentenceClick = (id: string) => {
    if (selectedSentence === id) {
      setSelectedSentence(null);
    } else {
      setSelectedSentence(id);
      // If an idiom is already selected, try to match
      if (selectedIdiom) {
        handleMatch(id, selectedIdiom);
      }
    }
  };

  const handleIdiomClick = (id: string) => {
    // Check if this idiom is already matched to another sentence
    const existingMatch = Object.entries(matches).find(([_, idiomId]) => idiomId === id);
    if (existingMatch) {
      // Unmatch it first
      const newMatches = { ...matches };
      delete newMatches[existingMatch[0]];
      setMatches(newMatches);
    }

    if (selectedIdiom === id) {
      setSelectedIdiom(null);
    } else {
      setSelectedIdiom(id);
      // If a sentence is already selected, try to match
      if (selectedSentence) {
        handleMatch(selectedSentence, id);
      }
    }
  };

  const handleMatch = (sentenceId: string, idiomId: string) => {
    setMatches(prev => ({
      ...prev,
      [sentenceId]: idiomId
    }));
    
    // Trigger a small vibration or sound effect here if desired?
    // For now just clear selection
    setSelectedSentence(null);
    setSelectedIdiom(null);
  };

  const handleSubmit = () => {
    const results: QuizResult[] = pairs.map(pair => {
      const userMatchedIdiomId = matches[pair.id];
      const isCorrect = userMatchedIdiomId === pair.id;
      
      const userSelectedIdiom = pairs.find(p => p.id === userMatchedIdiomId)?.idiom || "";

      return {
        questionId: pair.id,
        isCorrect,
        userAnswer: userSelectedIdiom,
        correctAnswer: pair.idiom,
        explanation: pair.explanation
      };
    });
    
    onComplete(results);
  };

  const getMatchedIdiomText = (sentenceId: string) => {
    const idiomId = matches[sentenceId];
    if (!idiomId) return null;
    const pair = pairs.find(p => p.id === idiomId);
    return pair?.idiom || null;
  };

  const isIdiomMatched = (idiomId: string) => {
    return Object.values(matches).includes(idiomId);
  };

  const matchedCount = Object.keys(matches).length;
  const totalCount = pairs.length;
  const progressPercentage = (matchedCount / totalCount) * 100;

  return (
    <div className="quiz-matching-game" ref={topRef}>
      
      <div className="status-bar">
        <div className="instructions">
          請點擊成語，再點擊對應的句子填空處進行配對。
        </div>
        <div className="progress-container">
          <div className="progress-text">配對進度: {matchedCount} / {totalCount}</div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="game-container">
        {/* Idioms Column (First on mobile via CSS order or markup) */}
        <div className="column idioms-column">
          <h3>成語選項</h3>
          <div className="idiom-list">
            {shuffledIdioms.map(pair => (
              <IdiomItem
                key={pair.id}
                pair={pair}
                isSelected={selectedIdiom === pair.id}
                isMatched={isIdiomMatched(pair.id)}
                onClick={handleIdiomClick}
              />
            ))}
          </div>
        </div>

        {/* Sentences Column */}
        <div className="column sentences-column">
          <h3>句子填空</h3>
          <div className="sentence-list">
            {pairs.map(pair => {
              const isSelected = selectedSentence === pair.id;
              const matchedIdiomText = getMatchedIdiomText(pair.id);
              
              // With immediate transition, we don't show correct/wrong state here anymore
              const status: 'normal' | 'correct' | 'wrong' = 'normal';

              return (
                <SentenceItem
                  key={pair.id}
                  pair={pair}
                  isSelected={isSelected}
                  matchedIdiomText={matchedIdiomText}
                  status={status}
                  onClick={handleSentenceClick}
                  showExplanation={false}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="actions">
        <button 
          className="submit-btn" 
          onClick={handleSubmit}
          disabled={Object.keys(matches).length !== pairs.length}
        >
          提交答案
        </button>
      </div>

      <style>{`
        .quiz-matching-game {
          max-width: 900px;
          margin: 0 auto;
          padding: 1rem;
        }
        .status-bar {
          margin-bottom: 2rem;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .instructions {
          text-align: center;
          margin-bottom: 0.8rem;
          color: #555;
          font-size: 1.1rem;
          font-weight: 500;
        }
        .progress-container {
          max-width: 400px;
          margin: 0 auto;
        }
        .progress-text {
          text-align: center;
          font-size: 0.9rem;
          color: #777;
          margin-bottom: 4px;
        }
        .progress-bar-bg {
          height: 10px;
          background: #e0e0e0;
          border-radius: 5px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #8BC34A);
          transition: width 0.3s ease-out;
        }

        .game-container {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }
        .column {
          flex: 1;
        }
        .column h3 {
          text-align: center;
          margin-bottom: 1rem;
          color: #2c3e50;
          font-size: 1.2rem;
          border-bottom: 2px solid #eee;
          padding-bottom: 0.5rem;
        }
        
        .item {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          position: relative;
        }
        .item:hover:not(.matched):not(.correct):not(.wrong) {
          border-color: #2196F3;
          background: #f5fafd;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .item.selected {
          border-color: #2196F3;
          border-width: 3px;
          background: #e3f2fd;
          box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.2);
          z-index: 1;
          transform: scale(1.02);
        }
        
        /* Sentence Styles */
        .sentence-item {
          line-height: 1.8;
          font-size: 1.05rem;
        }
        .sentence-text {
          color: #333;
        }
        .blank {
          display: inline-block;
          min-width: 80px;
          border-bottom: 2px solid #aaa;
          text-align: center;
          margin: 0 4px;
          color: #999;
          font-weight: normal;
          padding: 0 8px;
          transition: all 0.3s;
          background: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
        }
        .blank.filled {
          color: #1565C0;
          font-weight: bold;
          border-bottom: 2px solid #1565C0;
          background: rgba(33, 150, 243, 0.1);
        }
        .sentence-item:hover .blank {
          border-bottom-color: #2196F3;
          background: #e3f2fd;
        }

        /* Result States - REMOVED */

        /* Idiom Styles */
        .idioms-column .idiom-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .idiom-item {
          text-align: center;
          font-weight: bold;
          font-size: 1.2rem;
          letter-spacing: 1px;
          color: #333;
          margin-bottom: 0; /* Handled by gap */
          padding: 0.8rem;
        }
        .idiom-item.matched {
          opacity: 0.5;
          background: #f0f0f0;
          border-color: #eee;
          color: #aaa;
          cursor: default;
          transform: none;
          box-shadow: none;
        }
        
        /* Actions */
        .actions {
          text-align: center;
          margin-top: 2rem;
          padding-bottom: 2rem; /* Add bottom padding for better mobile view */
        }
        .submit-btn {
          padding: 1rem 3rem;
          font-size: 1.2rem;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          color: white;
          transition: all 0.2s;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 300px;
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(33, 150, 243, 0.3);
        }
        .submit-btn:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
          box-shadow: none;
          opacity: 0.7;
        }

        /* Mobile Layout */
        @media (max-width: 768px) {
          .game-container {
            flex-direction: column;
          }
          
          .idioms-column {
            order: -1; /* Move to top */
            position: sticky;
            top: 0;
            background: rgba(255, 255, 255, 0.98);
            z-index: 100;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
            margin-bottom: 1rem;
            margin-left: -1rem; /* Full width breakout */
            margin-right: -1rem;
            padding-left: 1rem;
            padding-right: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          }
          
          .idioms-column h3 {
            font-size: 1rem;
            margin-bottom: 0.5rem;
            display: none; /* Hide header on mobile to save space */
          }

          .idioms-column .idiom-list {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
          }
          
          .idiom-item {
            padding: 0.5rem 0.8rem;
            font-size: 1rem;
            border-radius: 20px; /* Pill shape on mobile */
            border-width: 1px;
            margin-bottom: 0;
            flex: 0 0 auto; /* Don't stretch */
            min-width: unset;
          }

          .sentence-item {
            padding: 1rem;
            margin-bottom: 1rem;
          }
          
          .blank {
            min-width: 60px;
            padding: 0 4px;
          }
          
          .actions {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            width: 90%;
            padding-bottom: 0;
            margin-top: 0;
          }
          
          .submit-btn, .finish-btn {
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }

          /* Add padding to bottom of page so content isn't covered by fixed button */
          .quiz-matching-game {
            padding-bottom: 80px;
          }
        }
      `}</style>
    </div>
  );
};
