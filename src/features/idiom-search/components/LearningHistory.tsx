import React from 'react';
import { UserProgressData, IdiomProgress } from '../../sync/services/googleDrive';
import { EnglishHistoryItem } from '../../english/types';

interface Props {
  data: UserProgressData;
  type?: 'idiom' | 'english';
  onSelect: (item: string) => void;
}

export const LearningHistory: React.FC<Props> = ({ data, type = 'idiom', onSelect }) => {
  let list: Array<{ text: string, time: number, count?: number }> = [];

  if (type === 'idiom' && data.idioms) {
    list = Object.values(data.idioms)
      .sort((a, b) => b.queryTime - a.queryTime)
      .map(item => ({
        text: item.idiom,
        time: item.queryTime,
        count: item.queryCount
      }));
  } else if (type === 'english' && data.english) {
    list = Object.values(data.english)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(item => ({
        text: item.word,
        time: item.timestamp,
        count: 1 // English history doesn't track count yet
      }));
  }

  if (list.length === 0) {
    return (
      <div className="history-empty">
        <p>目前還沒有{type === 'english' ? '單字' : '成語'}學習紀錄，快去查詢吧！</p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '尚未查詢';
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="learning-history">
      <h3 className="history-title">學習歷程</h3>
      <div className="history-list">
        {list.map((item) => (
          <div
            key={item.text}
            className="history-item"
            onClick={() => onSelect(item.text)}
          >
            <div className="history-item-main">
              <span className="history-text">{item.text}</span>
              <span className="history-date">上次查詢：{formatDate(item.time)}</span>
            </div>
            {type === 'idiom' ? (
              <div className="history-item-stats">
                 <span className="history-stat badge">查詢 {item.count} 次</span>
              </div>
            ) : (
               <div className="history-item-stats">
                 {/* English specific stats can go here if needed later */}
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`
        .learning-history {
          padding: 1rem 0;
        }
        .history-title {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          color: #333;
          border-left: 4px solid #4CAF50;
          padding-left: 10px;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9f9f9;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          border: 1px solid #eee;
        }
        .history-item:hover {
          background: #eefbee;
          border-color: #c8e6c9;
          transform: translateY(-1px);
        }
        .history-item-main {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .history-text {
          font-weight: bold;
          font-size: 1.1rem;
          color: #2c3e50;
        }
        .history-date {
          font-size: 0.85rem;
          color: #888;
        }
        .history-item-stats {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .history-stat.badge {
          background: #e0f2f1;
          color: #00695c;
          font-size: 0.8rem;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }
        .history-empty {
          text-align: center;
          padding: 2rem;
          color: #888;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
