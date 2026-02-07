import React from 'react';
import { UserProgressData, IdiomProgress } from '../../sync/services/googleDrive';

interface Props {
  data: UserProgressData;
  onSelectIdiom: (idiom: string) => void;
}

export const LearningHistory: React.FC<Props> = ({ data, onSelectIdiom }) => {
  const idiomList = Object.values(data.idioms).sort((a, b) => b.queryTime - a.queryTime);

  if (idiomList.length === 0) {
    return (
      <div className="history-empty">
        <p>目前還沒有學習紀錄，快去查詢成語吧！</p>
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
        {idiomList.map((item: IdiomProgress) => (
          <div 
            key={item.idiom} 
            className="history-item"
            onClick={() => onSelectIdiom(item.idiom)}
          >
            <div className="history-item-main">
              <span className="history-idiom">{item.idiom}</span>
              <span className="history-date">上次查詢：{formatDate(item.queryTime)}</span>
            </div>
            <div className="history-item-stats">
              <span className="history-stat badge">查詢 {item.queryCount} 次</span>
              {/* Future: Proficiency display */}
              {/* <span className="history-stat">熟練度: {item.proficiency}%</span> */}
            </div>
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
        .history-idiom {
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
