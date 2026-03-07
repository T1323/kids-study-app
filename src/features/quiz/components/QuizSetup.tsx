import React, { useState } from 'react';
import { useGlobalContext } from '../../../context/GlobalContext';
import { UserProgressData } from '../../sync/services/googleDrive';
import { generateQuiz } from '../services/quizService';
import { QuizQuestion, MatchingPair } from '../types';

interface Props {
  data: UserProgressData;
  level: "junior" | "senior" | "junior-high" | "university";
  modelSettings: {
    apiKey: string;
    providerId: string;
    customModel: string;
    customBaseURL: string;
  };
  onStart: (questions: QuizQuestion[] | MatchingPair[], type: 'multiple-choice' | 'matching') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  quizMode?: 'idiom' | 'english';
}

export const QuizSetup: React.FC<Props> = ({
  data,
  level,
  modelSettings,
  onStart,
  setLoading,
  setError,
  quizMode = 'idiom'
}) => {
  const { quizQuestionCount: questionCount } = useGlobalContext();
  const [gameType, setGameType] = useState<'multiple-choice' | 'matching'>('multiple-choice');

  // Calculate available items count
  const availableCount = quizMode === 'idiom' 
    ? Object.values(data.idioms || {}).length 
    : Object.values(data.english || {}).length;

  const minItemsForMatching = 5;
  const canPlayMatching = availableCount >= minItemsForMatching;

  const handleStart = async (mode: 'latest' | 'weakest') => {
    setLoading(true);
    setError(null);
    try {
      let candidates: any[] = [];
      
      if (quizMode === 'idiom') {
        const list = Object.values(data.idioms || {});
        if (list.length === 0) throw new Error("目前沒有成語學習紀錄，無法進行測驗。");
        candidates = list;
      } else {
        const list = Object.values(data.english || {});
        if (list.length === 0) throw new Error("目前沒有英文學習紀錄，無法進行測驗。");
        candidates = list;
      }

      // Check minimum requirement for matching again just in case
      if (gameType === 'matching' && !canPlayMatching) {
        throw new Error(`配對遊戲至少需要 ${minItemsForMatching} 個學習紀錄才能進行。`);
      }

      let selectedCandidates = [];
      if (mode === 'latest') {
        // 最近查詢的前 20 筆
        selectedCandidates = candidates
          .sort((a, b) => b.queryTime - a.queryTime)
          .slice(0, 20);
      } else {
        // 熟練度最低的前 20 筆 (熟練度相同時，優先選較早查詢的)
        selectedCandidates = candidates
          .sort((a, b) => a.proficiency - b.proficiency || a.queryTime - b.queryTime)
          .slice(0, 20);
      }

      // Determine number of items to select for the pool (up to 10)
      // We always send up to 10 candidates to the backend to give the LLM more variety,
      // even if we only ask for 5 questions.
      const poolSize = Math.min(10, Math.max(5, selectedCandidates.length));
      
      // 從候選名單中隨機選出 items
      const selectedTargets = selectedCandidates
        .sort(() => Math.random() - 0.5)
        .slice(0, poolSize)
        .map(item => quizMode === 'idiom' ? item.idiom : item.word);

      // Call API
      // If gameType is matching, we use specific type
      const requestType = gameType === 'matching' && quizMode === 'idiom' 
        ? 'idiom-matching' 
        : quizMode;

      if (gameType === 'matching' && quizMode === 'english') {
          // English matching not implemented yet, fallback or alert?
          // Since UI might allow it if we don't hide it, let's just default to multiple choice logic or throw error?
          // For now, let's treat it as not supported and maybe UI shouldn't show it.
          // But if user hacked it:
          throw new Error("英文配對遊戲尚未開放。");
      }

      const questions = await generateQuiz({
        targets: selectedTargets,
        type: requestType as any,
        level: level,
        apiKey: modelSettings.apiKey,
        provider: modelSettings.providerId,
        model: modelSettings.customModel,
        baseURL: modelSettings.customBaseURL,
        questionCount: questionCount,
      });

      onStart(questions, gameType);
    } catch (err: any) {
      setError(err.message || "測驗生成失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-setup">
      <h2>{quizMode === 'idiom' ? '成語填空挑戰' : '英文單字挑戰'}</h2>
      
      <p className="description">
        {quizMode === 'idiom'
          ? '想知道自己學會了多少成語嗎？快來挑戰看看！'
          : '想知道自己記住了多少單字嗎？快來挑戰看看！'}
        <br/>
        系統會根據你的學習紀錄，自動出題考考你。
      </p>

      {quizMode === 'idiom' && (
        <div className="game-type-selector-container">
          <p className="selector-label">選擇遊戲模式：</p>
          <div className="game-type-selector">
            <label className={`type-option ${gameType === 'multiple-choice' ? 'active' : ''}`}>
              <input 
                type="radio" 
                name="gameType" 
                checked={gameType === 'multiple-choice'}
                onChange={() => setGameType('multiple-choice')}
              />
              <span className="option-icon">📝</span>
              <span className="option-text">選擇題</span>
            </label>
            
            <label 
              className={`type-option ${gameType === 'matching' ? 'active' : ''} ${!canPlayMatching ? 'disabled' : ''}`}
              title={!canPlayMatching ? `需要至少 ${minItemsForMatching} 個成語紀錄才能遊玩` : ''}
            >
              <input 
                type="radio" 
                name="gameType" 
                checked={gameType === 'matching'}
                onChange={() => canPlayMatching && setGameType('matching')}
                disabled={!canPlayMatching}
              />
              <span className="option-icon">🧩</span>
              <span className="option-text">配對遊戲</span>
              {!canPlayMatching && <span className="badge">需 {minItemsForMatching} 個紀錄</span>}
            </label>
          </div>
        </div>
      )}

      <div className="mode-selection">
        <div className="mode-card" onClick={() => handleStart('latest')}>
          <div className="icon">🕒</div>
          <h3>最新查詢</h3>
          <p>{quizMode === 'idiom' ? '複習最近查過的成語' : '複習最近查過的單字'}，加深印象。</p>
        </div>

        <div className="mode-card" onClick={() => handleStart('weakest')}>
          <div className="icon">💪</div>
          <h3>弱點特訓</h3>
          <p>{quizMode === 'idiom' ? '針對還不熟練的成語' : '針對還不熟練的單字'}進行加強練習。</p>
        </div>
      </div>

      <style>{`
        .quiz-setup {
          text-align: center;
          padding: 2rem 1rem;
          max-width: 800px;
          margin: 0 auto;
        }
        h2 {
          color: #2c3e50;
          margin-bottom: 1rem;
        }
        .description {
          color: #666;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        
        .game-type-selector-container {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          display: inline-block;
          width: 100%;
          max-width: 500px;
        }
        .selector-label {
          margin-bottom: 1rem;
          color: #555;
          font-weight: 500;
        }
        .game-type-selector {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .type-option {
          padding: 0.8rem 1.5rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          position: relative;
        }
        .type-option:hover:not(.disabled) {
          border-color: #90CAF9;
          transform: translateY(-2px);
        }
        .type-option.active {
          border-color: #2196F3;
          background: #e3f2fd;
          color: #1565C0;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(33, 150, 243, 0.2);
        }
        .type-option.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f5f5f5;
          border-color: #ddd;
        }
        .type-option input {
          display: none;
        }
        .option-icon {
          font-size: 1.2rem;
        }
        .badge {
          font-size: 0.7rem;
          background: #757575;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          position: absolute;
          top: -8px;
          right: -8px;
        }

        .mode-selection {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .mode-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 16px;
          padding: 2rem;
          width: 260px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .mode-card:hover {
          transform: translateY(-8px);
          border-color: #4CAF50;
          box-shadow: 0 12px 20px rgba(0,0,0,0.1);
        }
        .mode-card .icon {
          font-size: 3.5rem;
          margin-bottom: 1rem;
        }
        .mode-card h3 {
          margin: 0 0 0.8rem 0;
          color: #2c3e50;
          font-size: 1.3rem;
        }
        .mode-card p {
          color: #666;
          font-size: 0.95rem;
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 600px) {
          .game-type-selector {
            flex-direction: column;
          }
          .mode-card {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
