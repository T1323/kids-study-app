import React, { useState } from 'react';

export const WritingView = () => {
  // 定義 materials 陣列狀態來儲存提取到的素材
  const [materials, setMaterials] = useState<string[]>([]);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [writingContent, setWritingContent] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    
    // 簡單模擬對話，之後可以接上後端 LLM 服務
    setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setInputMessage('');
    
    // 模擬 AI 回覆
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: '收到你的想法，可以試著把它加入右側的作文中喔！' }]);
    }, 1000);
  };

  const handleSubmitWriting = () => {
    if (!writingContent.trim()) return;
    alert('作文已送出批改！');
  };

  // 暫時的模擬加入素材功能
  const addMockMaterial = () => {
    const mockMaterials = ['風和日麗', '鳥語花香', '心曠神怡'];
    const randomMaterial = mockMaterials[Math.floor(Math.random() * mockMaterials.length)];
    if (!materials.includes(randomMaterial)) {
      setMaterials(prev => [...prev, randomMaterial]);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '15px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '10px' }}>中文寫作指導</h2>
        
        {/* 頂部兩欄佈局 */}
        <div style={{ display: 'flex', gap: '15px', flex: 1, minHeight: '400px' }}>
          
          {/* 左側欄 (素材收集區)：寬度約 20% */}
        <div style={{ 
          width: '20%', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>靈感素材</h3>
            <button 
              onClick={addMockMaterial}
              style={{ padding: '2px 8px', fontSize: '12px', background: '#635bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              +
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {materials.length === 0 ? (
              <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px' }}>
                目前沒有收集到素材。<br/>在對話中提到的好詞佳句會顯示在這裡喔！
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {materials.map((material, idx) => (
                  <li key={idx} style={{ 
                    padding: '8px 12px', 
                    backgroundColor: 'white', 
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    fontSize: '0.95rem'
                  }}>
                    {material}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 中間欄 (對話引導區)：主體部分 */}
        <div style={{ 
          flex: 1, 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          {/* 對話紀錄顯示區 */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', color: '#888', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem' }}>👋</span>
                <p>準備好開始寫作了嗎？告訴我你想寫什麼主題吧！</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? '#635bff' : '#f0f0f0',
                  color: msg.role === 'user' ? 'white' : 'black',
                  padding: '10px 15px',
                  borderRadius: '18px',
                  maxWidth: '80%',
                  lineHeight: 1.5
                }}>
                  {msg.content}
                </div>
              ))
            )}
          </div>
          
          {/* 下方的輸入框 */}
          <div style={{ padding: '15px', borderTop: '1px solid #eee', backgroundColor: '#f9f9f9' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="輸入你想討論的內容..."
                style={{ 
                  flex: 1, 
                  padding: '10px 15px', 
                  borderRadius: '20px', 
                  border: '1px solid #ddd',
                  outline: 'none'
                }}
              />
              <button 
                type="submit"
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#635bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                發送
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 下方區域 (寫作區) */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '15px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>我的作文</h3>
          <button 
            onClick={handleSubmitWriting}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            送出批改
          </button>
        </div>
        
        <textarea 
          value={writingContent}
          onChange={(e) => setWritingContent(e.target.value)}
          placeholder="在這裡開始寫下你的文章..."
          style={{ 
            width: '100%', 
            minHeight: '200px', 
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: '1rem',
            lineHeight: 1.6,
            boxSizing: 'border-box'
          }}
        />
      </div>
      </div>
    </div>
  );
};
