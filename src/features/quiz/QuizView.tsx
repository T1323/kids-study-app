import React, { useState } from 'react';
import { UserProgressData, saveProgress, saveEnglishProgress } from '../sync/services/googleDrive';
import { QuizSetup } from './components/QuizSetup';
import { QuizGame } from './components/QuizGame';
import { QuizMatchingGame } from './components/QuizMatchingGame';
import { QuizResultView } from './components/QuizResultView';
import { MatchingResultView } from './components/MatchingResultView';
import { QuizQuestion, QuizResult, MatchingPair } from './types';
import { useGlobalContext } from '../../context/GlobalContext';

interface Props {
  data: UserProgressData;
  onUpdateData: (newData: UserProgressData) => void;
  accessToken: string;
  level: "junior" | "senior" | "junior-high" | "university";
  modelSettings: {
    apiKey: string;
    providerId: string;
    customModel: string;
    customBaseURL: string;
  };
  quizMode?: 'idiom' | 'english';
}

export const QuizView: React.FC<Props> = ({
  data,
  onUpdateData,
  accessToken,
  level,
  modelSettings,
  quizMode = 'idiom'
}) => {
  const { appFolderId } = useGlobalContext();
  const [phase, setPhase] = useState<'setup' | 'playing' | 'result'>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([]);
  const [gameType, setGameType] = useState<'multiple-choice' | 'matching'>('multiple-choice');
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = (qs: QuizQuestion[] | MatchingPair[], type: 'multiple-choice' | 'matching') => {
    setGameType(type);
    if (type === 'matching') {
        setMatchingPairs(qs as MatchingPair[]);
    } else {
        setQuestions(qs as QuizQuestion[]);
    }
    setPhase('playing');
  };

  const handleComplete = (rs: QuizResult[]) => {
    setResults(rs);
    setPhase('result');
    updateProficiency(rs);
  };

  const handleMatchingComplete = (rs: QuizResult[]) => {
    setResults(rs);
    setPhase('result');
    // Optional: update proficiency for matching game too
    updateProficiency(rs); 
  };

  const updateProficiency = async (rs: QuizResult[]) => {
    const newData = { ...data };
    const now = Date.now();

    const getTarget = (result: QuizResult) => {
      if (gameType === 'multiple-choice') {
        return questions.find(question => question.id === result.questionId)?.target || '';
      }
      return matchingPairs.find(pair => pair.id === result.questionId)?.idiom || '';
    };

    if (quizMode === 'idiom') {
      const outcomes = new Map<string, { correct: number; total: number }>();

      rs.forEach(result => {
        const target = getTarget(result);
        if (!target || !newData.idioms?.[target]) return;

        const outcome = outcomes.get(target) || { correct: 0, total: 0 };
        outcome.total += 1;
        if (result.isCorrect) outcome.correct += 1;
        outcomes.set(target, outcome);
      });

      outcomes.forEach(({ correct, total }, target) => {
        const progress = newData.idioms![target];
        const currentProficiency = Math.max(0, Math.min(100, Number(progress.proficiency) || 0));
        const accuracy = correct / total;
        const guessRate = gameType === 'multiple-choice' ? 0.25 : 0;
        const estimatedMastery = Math.max(0, Math.min(100, ((accuracy - guessRate) / (1 - guessRate)) * 100));
        const evidenceWeight = total / (total + 4);
        const newProficiency = Math.round(currentProficiency + (estimatedMastery - currentProficiency) * evidenceWeight);

        newData.idioms![target] = {
          ...progress,
          proficiency: newProficiency,
          lastTestTime: now,
        };
      });
    } else if (quizMode === 'english') {
      rs.forEach(result => {
        const target = getTarget(result);
        if (!target || !newData.english?.[target]) return;

        const currentProficiency = newData.english[target].proficiency || 0;
        const change = result.isCorrect ? 20 : -10;
        const newProficiency = Math.max(0, Math.min(100, currentProficiency + change));

        newData.english[target] = {
          ...newData.english[target],
          proficiency: newProficiency,
          lastTestTime: now,
        };
      });
    }

    newData.lastSynced = now;
    onUpdateData(newData);
    
    if (accessToken && appFolderId) {
      // Sync to cloud in background
      const saveFunc = quizMode === 'english' ? saveEnglishProgress : saveProgress;
      saveFunc(accessToken, newData, appFolderId).catch(err => {
        console.error("Failed to sync progress after quiz:", err);
      });
    }
  };

  const handleClose = () => {
    setPhase('setup');
    setQuestions([]);
    setMatchingPairs([]);
    setResults([]);
  };

  return (
    <div className="quiz-view">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>題目生成中，請稍候...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {phase === 'setup' && (
        <QuizSetup
          data={data}
          level={level}
          modelSettings={modelSettings}
          onStart={handleStart}
          setLoading={setLoading}
          setError={setError}
          quizMode={quizMode}
        />
      )}

      {phase === 'playing' && (
        <>
            {gameType === 'multiple-choice' ? (
                <QuizGame 
                  questions={questions}
                  onComplete={handleComplete}
                />
            ) : (
                <QuizMatchingGame 
                  pairs={matchingPairs}
                  onComplete={handleMatchingComplete}
                />
            )}
        </>
      )}

      {phase === 'result' && (
        <>
            {gameType === 'multiple-choice' ? (
                <QuizResultView 
                  results={results}
                  questions={questions}
                  onClose={handleClose}
                />
            ) : (
                <MatchingResultView 
                  results={results}
                  pairs={matchingPairs}
                  onClose={handleClose}
                />
            )}
        </>
      )}

      <style>{`
        .quiz-view {
          padding: 1rem;
          max-width: 800px;
          margin: 0 auto;
          min-height: 400px;
        }
        .loading-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2196F3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        .error-message {
          background: #ffecb3;
          color: #f57f17;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          text-align: center;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
