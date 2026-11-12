import React, { useEffect, useRef, useState } from 'react';
import { useGlobalContext } from '../../../context/GlobalContext';
import { UserProgressData } from '../../sync/services/googleDrive';
import type { IdiomProgress } from '../../sync/services/googleDrive';
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
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'latest' | 'weakest' | 'custom' | null>(null);
  const lastSelectedIndex = useRef<number | null>(null);
  const shiftKeyPressed = useRef(false);
  const minItemsForMatching = 5;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') shiftKeyPressed.current = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') shiftKeyPressed.current = false;
    };
    const handleWindowBlur = () => {
      shiftKeyPressed.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const selectableItems = (quizMode === 'idiom'
    ? Object.values(data.idioms || {}).map(item => ({ target: item.idiom, queryTime: item.queryTime }))
    : Object.values(data.english || {}).map(item => ({ target: item.word, queryTime: item.queryTime }))
  )
    .filter(item => item.target.trim())
    .sort((a, b) => b.queryTime - a.queryTime);
  const selectableTargetSet = new Set(selectableItems.map(item => item.target));
  const selectedTargetSet = new Set(selectedTargets.filter(target => selectableTargetSet.has(target)));
  const minCustomSelectionCount = quizMode === 'idiom'
    ? gameType === 'matching' ? minItemsForMatching : 4
    : 1;

  // Calculate available items count
  const availableCount = selectableItems.length;

  const canPlayMatching = availableCount >= minItemsForMatching;

  const handleItemSelection = (target: string, index: number, event: React.MouseEvent<HTMLInputElement>) => {
    const shouldSelect = !selectedTargetSet.has(target);
    const isRangeSelection = event.shiftKey || shiftKeyPressed.current;

    setSelectedTargets(current => {
      const selected = new Set(current);
      if (isRangeSelection && lastSelectedIndex.current !== null) {
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        selectableItems.slice(start, end + 1).forEach(item => {
          if (shouldSelect) selected.add(item.target);
          else selected.delete(item.target);
        });
      } else if (shouldSelect) {
        selected.add(target);
      } else {
        selected.delete(target);
      }
      return [...selected];
    });
    if (!isRangeSelection) lastSelectedIndex.current = index;
    setError(null);
  };

  const handleStart = async (mode: 'latest' | 'weakest' | 'custom') => {
    setLoading(true);
    setError(null);
    try {
      let candidates: any[] = [];
      let idiomHistory: IdiomProgress[] | undefined;
      
      if (quizMode === 'idiom') {
        const list = Object.values(data.idioms || {});
        if (list.length === 0) throw new Error("目前沒有成語學習紀錄，無法進行測驗。");
        if (mode === 'custom') {
          idiomHistory = list.filter(item => selectedTargetSet.has(item.idiom));
          if (idiomHistory.length === 0) throw new Error("請至少選擇一個成語。");
          if (gameType === 'matching' && idiomHistory.length < minItemsForMatching) {
            throw new Error(`配對遊戲至少需要選擇 ${minItemsForMatching} 個成語。`);
          }
          if (gameType === 'multiple-choice' && new Set(idiomHistory.map(item => item.idiom)).size < 4) {
            throw new Error("成語選擇題至少需要選擇 4 個不同的成語。");
          }
        } else {
          // Send up to 50 relevant records so the AI can select quiz items from this pool.
          idiomHistory = [...list]
            .sort((a, b) => mode === 'latest'
              ? b.queryTime - a.queryTime
              : a.proficiency - b.proficiency || a.queryTime - b.queryTime)
            .slice(0, 50);
        }
      } else {
        const list = Object.values(data.english || {});
        if (list.length === 0) throw new Error("目前沒有英文學習紀錄，無法進行測驗。");
        candidates = mode === 'custom'
          ? list.filter(item => selectedTargetSet.has(item.word))
          : list;
        if (mode === 'custom' && candidates.length === 0) throw new Error("請至少選擇一個單字。");
      }

      // Check minimum requirement for matching again just in case
      if (gameType === 'matching' && !canPlayMatching) {
        throw new Error(`配對遊戲至少需要 ${minItemsForMatching} 個學習紀錄才能進行。`);
      }

      let selectedTargets: string[] | undefined;
      if (quizMode === 'english') {
        const selectedCandidates = [...candidates]
          .sort((a, b) => mode === 'custom'
            ? Math.random() - 0.5
            : mode === 'latest'
              ? b.queryTime - a.queryTime
              : a.proficiency - b.proficiency || a.queryTime - b.queryTime)
          .slice(0, mode === 'custom' ? 10 : 20);
        selectedTargets = selectedCandidates
          .sort(() => Math.random() - 0.5)
          .slice(0, mode === 'custom' ? selectedCandidates.length : Math.min(10, Math.max(5, selectedCandidates.length)))
          .map(item => item.word);
      }

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
        history: idiomHistory,
        selectionMode: quizMode === 'idiom' && mode !== 'custom' ? mode : undefined,
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

        <div
          className={`mode-card ${selectionMode === 'custom' ? 'selected' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectionMode('custom');
            setError(null);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setSelectionMode('custom');
              setError(null);
            }
          }}
        >
          <div className="icon">☑️</div>
          <h3>自選</h3>
          <p>自行勾選要測驗的{quizMode === 'idiom' ? '成語' : '單字'}。</p>
        </div>
      </div>

      {selectionMode === 'custom' && (
        <section className="custom-selection" aria-label="自選測驗項目">
          <div className="selection-heading">
            <div>
              <h3>選擇測驗項目</h3>
              <p>可單獨勾選；按住 Shift 點選另一筆，可一次選取兩筆之間的範圍。</p>
            </div>
            <span>已選 {selectedTargetSet.size} 項</span>
          </div>
          {selectableItems.length === 0 ? (
            <p className="empty-selection">目前沒有查詢紀錄可以選擇。</p>
          ) : (
            <div className="selection-list">
              {selectableItems.map((item, index) => (
                <label className="selection-item" key={item.target}>
                  <input
                    type="checkbox"
                    checked={selectedTargetSet.has(item.target)}
                    onClick={event => handleItemSelection(item.target, index, event)}
                  />
                  <span>{item.target}</span>
                </label>
              ))}
            </div>
          )}
          <div className="selection-actions">
            <button type="button" className="clear-selection" onClick={() => {
              setSelectedTargets([]);
              lastSelectedIndex.current = null;
            }}>
              清除選擇
            </button>
            <button
              type="button"
              className="start-selection"
              disabled={selectedTargetSet.size < minCustomSelectionCount}
              onClick={() => handleStart('custom')}
            >
              開始自選挑戰
            </button>
          </div>
          {selectedTargetSet.size < minCustomSelectionCount && (
            <p className="selection-requirement">
              {quizMode === 'idiom' && gameType === 'matching'
                ? `配對遊戲至少需要選擇 ${minCustomSelectionCount} 個成語。`
                : quizMode === 'idiom'
                  ? `成語選擇題至少需要選擇 ${minCustomSelectionCount} 個不同的成語。`
                  : '請至少選擇一個單字。'}
            </p>
          )}
        </section>
      )}

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
          padding: 1.5rem 1rem;
          flex: 1 1 0;
          min-width: 0;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .mode-card:hover {
          transform: translateY(-8px);
          border-color: #4CAF50;
          box-shadow: 0 12px 20px rgba(0,0,0,0.1);
        }
        .mode-card.selected {
          border-color: #2196F3;
          background: #e3f2fd;
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
        .custom-selection {
          margin: 1.5rem auto 0;
          max-width: 640px;
          padding: 1.25rem;
          border: 1px solid #dfe5eb;
          border-radius: 16px;
          background: #f8fafc;
          text-align: left;
        }
        .selection-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .selection-heading h3 {
          margin: 0 0 0.4rem;
          color: #2c3e50;
        }
        .selection-heading p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .selection-heading > span {
          white-space: nowrap;
          color: #1976d2;
          font-weight: bold;
        }
        .selection-list {
          max-height: 320px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          background: white;
        }
        .selection-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #eee;
          cursor: pointer;
        }
        .selection-item:last-child {
          border-bottom: 0;
        }
        .selection-item:hover {
          background: #f1f7fd;
        }
        .selection-item input {
          width: 1rem;
          height: 1rem;
          accent-color: #1976d2;
        }
        .empty-selection {
          padding: 1rem;
          color: #666;
          text-align: center;
        }
        .selection-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .selection-actions button {
          padding: 0.65rem 1rem;
          border: 0;
          border-radius: 8px;
          font-size: 0.95rem;
          cursor: pointer;
        }
        .clear-selection {
          background: #e9ecef;
          color: #495057;
        }
        .start-selection {
          background: #1976d2;
          color: white;
          font-weight: bold;
        }
        .start-selection:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .selection-requirement {
          margin: 0.75rem 0 0;
          color: #777;
          font-size: 0.85rem;
          text-align: right;
        }

        @media (max-width: 600px) {
          .game-type-selector {
            flex-direction: column;
          }
          .mode-card {
            flex: 1 1 100%;
          }
          .selection-heading {
            flex-direction: column;
          }
          .selection-actions {
            flex-direction: column-reverse;
          }
        }
      `}</style>
    </div>
  );
};
