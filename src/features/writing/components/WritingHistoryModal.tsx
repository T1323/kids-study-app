import React from 'react';
import { WritingSessionRecord } from '../../sync/services/googleDrive';

interface WritingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedSessions: WritingSessionRecord[];
  onLoadSession: (session: WritingSessionRecord) => void;
  onRefresh: () => void;
  isSyncing: boolean;
  syncStatus: string;
}

export const WritingHistoryModal: React.FC<WritingHistoryModalProps> = ({
  isOpen,
  onClose,
  savedSessions,
  onLoadSession,
  onRefresh,
  isSyncing,
  syncStatus
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>☁️ 雲端寫作紀錄</h2>
            {isSyncing && <span style={{ fontSize: '0.9rem', color: '#64748b', animation: 'pulse 2s infinite' }}>{syncStatus}</span>}
            {!isSyncing && syncStatus && <span style={{ fontSize: '0.9rem', color: '#10b981' }}>{syncStatus}</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={onRefresh}
              disabled={isSyncing}
              style={{
                padding: '6px 12px',
                backgroundColor: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.5 : 1,
                fontSize: '0.9rem'
              }}
            >
              🔄 重新載入
            </button>
            <button 
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#64748b',
                padding: '0 5px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
          {savedSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>☁️</div>
              <p>目前沒有雲端儲存的紀錄</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {savedSessions.map((session) => {
                const date = new Date(session.lastModified);
                return (
                  <div 
                    key={session.id}
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onClick={() => {
                      onLoadSession(session);
                      onClose();
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.topic}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🕒 {date.toLocaleString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📝 字數：{session.content.length} 字</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>💡 素材：{session.materials?.length || 0} 個</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✅ 批改：{session.gradingResults?.length || 0} 筆</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
