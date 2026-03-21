import React from 'react';
import { WritingGradingResult, WritingCorrection } from '../services/writingService';

export interface GradingRecord {
  id: string; // timestamp
  timestamp: number;
  result: WritingGradingResult;
}

interface WritingDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradingResults: GradingRecord[];
  onDeleteResult: (id: string) => void;
  isLoading: boolean;
}

export const WritingDiffModal: React.FC<WritingDiffModalProps> = ({
  isOpen,
  onClose,
  gradingResults,
  onDeleteResult,
  isLoading
}) => {
  if (!isOpen) return null;

  // Helper function to render text with highlighted span
  const renderHighlighted = (text: string, spanToHighlight: string, isError: boolean) => {
    if (!spanToHighlight || !text.includes(spanToHighlight)) {
      return <span>{text}</span>;
    }

    const parts = text.split(spanToHighlight);
    const highlightStyle = isError 
      ? { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#b91c1c', padding: '2px 4px', borderRadius: '4px', textDecoration: 'line-through' }
      : { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#047857', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' as const };

    return (
      <span>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span style={highlightStyle}>{spanToHighlight}</span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

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
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>📝 作文批改結果</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⏳</div>
              <p>老師正在仔細批改中，請稍候...</p>
            </div>
          ) : gradingResults && gradingResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {gradingResults.map((record, index) => {
                const date = new Date(record.timestamp);
                return (
                  <div key={record.id} style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    backgroundColor: index === 0 ? '#f8fafc' : 'white'
                  }}>
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '20px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        最新批改
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginTop: index === 0 ? '12px' : '0' }}>
                      <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🕒 {date.toLocaleString()}
                      </span>
                      <button 
                        onClick={() => onDeleteResult(record.id)}
                        style={{
                          background: 'none',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#fef2f2';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        🗑️ 刪除此紀錄
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Overall Comment */}
                      <div style={{ 
                        backgroundColor: '#f0fdf4', 
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px', 
                        padding: '16px',
                        color: '#166534'
                      }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🌟 老師總評
                        </h3>
                        <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {record.result.overallComment}
                        </p>
                      </div>

                      {/* Specific Advice */}
                      {record.result.specificAdvice && (
                        <div style={{ 
                          backgroundColor: '#fef3c7', 
                          border: '1px solid #fde68a',
                          borderRadius: '8px', 
                          padding: '16px',
                          color: '#92400e'
                        }}>
                          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💡 具體建議
                          </h3>
                          <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {record.result.specificAdvice}
                          </p>
                        </div>
                      )}

                      {/* Corrections */}
                      <div>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#334155' }}>✍️ 建議修正</h3>
                        {record.result.corrections && record.result.corrections.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {record.result.corrections.map((correction, idx) => (
                              <div key={idx} style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                overflow: 'hidden'
                              }}>
                                {/* Side by side diff */}
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                  <div style={{ flex: 1, padding: '16px', borderRight: '1px solid #e2e8f0', backgroundColor: '#fef2f2' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>原句</div>
                                    <div style={{ lineHeight: 1.6, color: '#334155' }}>
                                      {renderHighlighted(correction.original, correction.errorSpan, true)}
                                    </div>
                                  </div>
                                  <div style={{ flex: 1, padding: '16px', backgroundColor: '#f0fdf4' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>建議修正</div>
                                    <div style={{ lineHeight: 1.6, color: '#334155' }}>
                                      {renderHighlighted(correction.corrected, correction.correctedSpan, false)}
                                    </div>
                                  </div>
                                </div>
                                {/* Reason */}
                                <div style={{ 
                                  padding: '12px 16px', 
                                  backgroundColor: '#f8fafc', 
                                  borderTop: '1px solid #e2e8f0',
                                  color: '#475569',
                                  fontSize: '0.95rem',
                                  display: 'flex',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>💡 原因：</span>
                                  <span style={{ lineHeight: 1.5 }}>{correction.reason}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#64748b' }}>太棒了！這篇文章寫得很好，老師沒有挑出需要大改的地方喔！</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
              <p>目前還沒有批改紀錄，寫完文章後點擊「送出批改」吧！</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
