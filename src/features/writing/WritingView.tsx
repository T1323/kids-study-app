import React, { useState, useRef, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { chatWithWritingAI, ChatMessage } from './services/writingService';

export const WritingView = () => {
  const { level, modelSettings } = useGlobalContext();
  const [materials, setMaterials] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [writingContent, setWritingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Helper function to extract materials from AI response
  const extractMaterials = (text: string) => {
    // Looks for pattern [MATERIAL: XXX]
    const materialRegex = /\[MATERIAL:\s*(.+?)\]/g;
    let match;
    const newMaterials: string[] = [];
    
    while ((match = materialRegex.exec(text)) !== null) {
      if (match[1] && !materials.includes(match[1].trim())) {
        newMaterials.push(match[1].trim());
      }
    }
    
    if (newMaterials.length > 0) {
      setMaterials(prev => {
        // Only add unique ones not already in state
        const uniqueNew = newMaterials.filter(m => !prev.includes(m));
        return [...prev, ...uniqueNew];
      });
    }
    
    // Remove the material tags from the text shown to the user
    return text.replace(/\[MATERIAL:\s*(.+?)\]/g, '').trim();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    
    const userMsg = inputMessage.trim();
    setInputMessage('');
    
    const updatedHistory: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedHistory);
    setIsLoading(true);
    
    try {
      const response = await chatWithWritingAI(updatedHistory, level, modelSettings);
      
      const cleanContent = extractMaterials(response.content);
      
      setMessages(prev => [...prev, { role: 'assistant', content: cleanContent }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `【系統提示】發生錯誤：${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitWriting = async () => {
    if (!writingContent.trim() || isLoading) return;
    
    const userMsg = `老師好，這是我寫的作文，請幫我批改並提供修正建議：\n\n${writingContent.trim()}`;
    
    const updatedHistory: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedHistory);
    setIsLoading(true);
    
    try {
      const response = await chatWithWritingAI(updatedHistory, level, modelSettings);
      const cleanContent = extractMaterials(response.content);
      setMessages(prev => [...prev, { role: 'assistant', content: cleanContent }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `【系統提示】發生錯誤：${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: 'calc(100vh - 100px)', // adjust for navbar
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '15px', 
        padding: '15px',
        boxSizing: 'border-box'
      }}
    >
      {/* 左側素材欄: 1/5 */}
      <div style={{ 
        flex: 1, 
        height: '100%', 
        overflowY: 'auto', 
        border: '1px solid var(--border-subtle)', 
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-strong)' }}>✨ 靈感素材</h3>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {materials.length === 0 ? (
            <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
              目前沒有收集到素材。<br/>在對話中提到的好詞佳句會自動顯示在這裡喔！
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {materials.map((material, idx) => (
                <li key={idx} style={{ 
                  padding: '10px 12px', 
                  backgroundColor: 'white', 
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: 'var(--text-main)',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  {material}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 中間寫作區: 2/5 */}
      <div style={{ 
        flex: 2,
        height: '100%',
        border: '1px solid var(--border-subtle)', 
        borderRadius: '8px', 
        padding: '15px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📝 我的作文</h3>
          <button 
            onClick={handleSubmitWriting}
            disabled={!writingContent.trim() || isLoading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: (!writingContent.trim() || isLoading) ? '#ccc' : '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '999px',
              cursor: (!writingContent.trim() || isLoading) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              boxShadow: (!writingContent.trim() || isLoading) ? 'none' : '0 4px 10px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            送出批改
          </button>
        </div>
        
        <textarea 
          value={writingContent}
          onChange={(e) => setWritingContent(e.target.value)}
          disabled={isLoading}
          placeholder="在這裡開始寫下你的文章..."
          style={{ 
            flex: 1,
            width: '100%', 
            padding: '12px',
            borderRadius: '6px',
            border: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: '1.05rem',
            lineHeight: 1.8,
            boxSizing: 'border-box',
            outline: 'none',
            backgroundColor: 'transparent'
          }}
        />
      </div>

      {/* 右側對話區: 2/5 */}
      <div style={{ 
        flex: 2,
        height: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        border: '1px solid var(--border-subtle)', 
        borderRadius: '8px', 
        backgroundColor: 'white', 
        overflow: 'hidden' 
      }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: 'var(--bg)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>💬 寫作指導</h3>
        </div>

        {/* 對話紀錄顯示區 */}
        <div style={{ 
          flex: 1, 
          padding: '15px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px' 
        }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-soft)', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>👋</span>
              <p style={{ lineHeight: 1.6 }}>準備好開始寫作了嗎？告訴我你想寫什麼主題吧！<br/>(例如：我想寫一篇關於校外教學的作文)</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                padding: '12px 18px',
                borderRadius: '18px',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                maxWidth: '85%',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem'
              }}>
                {msg.content}
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ 
              alignSelf: 'flex-start',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-soft)',
              padding: '10px 15px',
              borderRadius: '18px',
              borderBottomLeftRadius: '4px',
              fontSize: '0.9rem',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              老師正在思考中 ...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 下方的輸入框 */}
        <div style={{ padding: '15px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="輸入你想討論的內容..."
              disabled={isLoading}
              style={{ 
                flex: 1, 
                padding: '12px 18px', 
                borderRadius: '999px', 
                border: '1px solid var(--border-subtle)',
                outline: 'none',
                fontSize: '0.95rem'
              }}
            />
            <button 
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              style={{ 
                padding: '10px 24px', 
                backgroundColor: (!inputMessage.trim() || isLoading) ? '#ccc' : 'var(--primary)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '999px',
                cursor: (!inputMessage.trim() || isLoading) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
            >
              發送
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};
