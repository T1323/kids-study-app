import React, { useState } from 'react';
import { UserProgressData } from '../../sync/services/googleDrive';
import { generateQuiz } from '../../quiz/services/quizService';
import { QuizQuestion } from '../../quiz/types';

interface Props {
  data: UserProgressData;
  level: "junior" | "senior" | "junior-high" | "university";
  modelSettings: {
    apiKey: string;
    providerId: string;
    customModel: string;
    customBaseURL: string;
  };
  onStart: (questions: QuizQuestion[], description: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const CustomChallengeSetup: React.FC<Props> = ({
  data,
  level,
  modelSettings,
  onStart,
  setLoading,
  setError,
}) => {
  const [description, setDescription] = useState('');

  const handleStart = async (desc: string) => {
    if (!desc.trim()) {
      setError("請輸入主題描述");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const questions = await generateQuiz({
        description: desc.trim(),
        type: 'english',
        level: level,
        apiKey: modelSettings.apiKey,
        provider: modelSettings.providerId,
        model: modelSettings.customModel,
        baseURL: modelSettings.customBaseURL,
      });

      onStart(questions as QuizQuestion[], desc.trim());
    } catch (err: any) {
      setError(err.message || "測驗生成失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (histDesc: string) => {
    setDescription(histDesc);
    handleStart(histDesc);
  };

  const history = data.customChallenges || [];

  return (
    <div className="custom-challenge-setup">
      <h2>自訂英文挑戰</h2>
      <p className="description">
        輸入你想練習的主題，例如「在機場點餐」、「動物園的一天」，
        <br/>
        AI 老師會為你設計專屬的測驗題目喔！
      </p>

      <div className="input-area">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：我想練習關於「去超市買水果」的對話與單字..."
          rows={4}
          maxLength={200}
        />
        <button 
          className="generate-btn"
          onClick={() => handleStart(description)}
          disabled={!description.trim()}
        >
          ✨ 生成測驗
        </button>
      </div>

      {history.length > 0 && (
        <div className="history-area">
          <h3>📜 挑戰紀錄</h3>
          <div className="history-list">
            {history.slice().reverse().map((item) => (
              <div 
                key={item.id} 
                className="history-item"
                onClick={() => handleHistoryClick(item.description)}
              >
                <span className="hist-desc">{item.description}</span>
                <span className="hist-date">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .custom-challenge-setup {
          text-align: center;
          padding: 2rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .description {
          color: #666;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        .input-area {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          font-size: 1rem;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
        }
        textarea:focus {
          border-color: #2196F3;
        }
        .generate-btn {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 30px;
          font-size: 1.1rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          font-weight: bold;
        }
        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
        }
        .generate-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .history-area {
          text-align: left;
          border-top: 1px solid #eee;
          padding-top: 1.5rem;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .history-item {
          display: flex;
          justify-content: space-between;
          padding: 0.8rem 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .history-item:hover {
          background: #e3f2fd;
        }
        .hist-desc {
          color: #2c3e50;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70%;
        }
        .hist-date {
          color: #999;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};
