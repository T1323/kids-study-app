import React from 'react';
import { UserProgressData } from '../../sync/services/googleDrive';
import { generateQuiz } from '../services/quizService';
import { QuizQuestion } from '../types';

interface Props {
  data: UserProgressData;
  level: "junior" | "senior";
  modelSettings: {
    apiKey: string;
    providerId: string;
    customModel: string;
    customBaseURL: string;
  };
  onStart: (questions: QuizQuestion[]) => void;
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

      // 從候選名單中隨機選出 5 個
      const selectedTargets = selectedCandidates
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .map(item => quizMode === 'idiom' ? item.idiom : item.word);

      const questions = await generateQuiz({
        targets: selectedTargets,
        type: quizMode,
        level,
        apiKey: modelSettings.apiKey,
        provider: modelSettings.providerId,
        model: modelSettings.customModel,
        baseURL: modelSettings.customBaseURL,
      } as any);

      onStart(questions);
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
          padding: 2rem;
        }
        .description {
          color: #666;
          margin-bottom: 2rem;
          line-height: 1.6;
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
          border-radius: 12px;
          padding: 2rem;
          width: 250px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .mode-card:hover {
          transform: translateY(-5px);
          border-color: #4CAF50;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .mode-card .icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .mode-card h3 {
          margin: 0 0 0.5rem 0;
          color: #2c3e50;
        }
        .mode-card p {
          color: #888;
          font-size: 0.9rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
};
