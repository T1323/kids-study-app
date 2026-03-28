import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { chatWithWritingAI, ChatMessage, gradeWriting, WritingGradingResult } from './services/writingService';
import { WritingDiffModal, GradingRecord } from './components/WritingDiffModal';
import { useGoogleAuth } from '../sync/hooks/useGoogleAuth';
import { saveWritingSessions, saveWritingProgress, readFile, searchFile, WRITING_SESSIONS_FILE_NAME, WRITING_PROGRESS_FILE_NAME, FOLDER_NAME, searchFolder, WritingSessionRecord, WritingProgressReport } from '../sync/services/googleDrive';
import { useNavigate, useBlocker } from 'react-router-dom';

import { WritingHistoryModal } from './components/WritingHistoryModal';

export const WritingView = () => {
  const { level, modelSettings, setIsWritingUnsaved } = useGlobalContext();
  const { accessToken } = useGoogleAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [writingContent, setWritingContent] = useState('');
  const [topic, setTopic] = useState('');
  const [isTopicSet, setIsTopicSet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Grading Modal State
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResults, setGradingResults] = useState<GradingRecord[]>([]);

  // Cloud Sync State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<WritingSessionRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set unsaved changes when content/messages change after initial load
  useEffect(() => {
    if (topic || writingContent || messages.length > 0) {
      setHasUnsavedChanges(true);
      setIsWritingUnsaved(true);
    }
  }, [topic, writingContent, messages, materials, gradingResults, setIsWritingUnsaved]);

  // Handle browser tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        
        // Browsers generally don't allow custom dialogs in beforeunload anymore,
        // but we can auto-save if they have accessToken
        if (accessToken && topic.trim()) {
          // Attempt beacon save (note: fetch might fail on unload, keep it simple)
          // We can't guarantee this completes, so user sees default browser prompt
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, accessToken, topic]);

  // React Router v6 useBlocker 
  // It only works if using a Data Router (createBrowserRouter),
  // but this project uses traditional <BrowserRouter>.
  // Therefore, useBlocker might throw an error or not work.
  // We'll wrap it in a try-catch or remove it if it causes issues.
  let blocker: any = { state: 'unblocked', reset: () => {}, proceed: () => {} };
  try {
    blocker = useBlocker(
      ({ currentLocation, nextLocation }) =>
        hasUnsavedChanges &&
        currentLocation.pathname !== nextLocation.pathname
    );
  } catch (e) {
    // Ignore error if not in data router context
  }

  useEffect(() => {
    if (blocker && blocker.state === "blocked") {
      const confirmLeave = window.confirm(
        "您有未儲存的變更，請問要直接離開還是先儲存？\n(點選「確定」直接離開，點選「取消」留在原頁面以儲存)"
      );
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Load saved sessions on mount if logged in
  useEffect(() => {
    if (accessToken) {
      loadSavedSessions();
    }
  }, [accessToken]);

  // Auto-save when messages change (after AI responds)
  useEffect(() => {
    if (accessToken && isTopicSet && messages.length > 0) {
      // 只有在最後一則訊息是 AI 回覆時才自動儲存 (代表一次完整對話結束)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const timer = setTimeout(() => {
          handleSaveSession(undefined, true); // silent save
        }, 1500); // debounce
        return () => clearTimeout(timer);
      }
    }
  }, [messages, accessToken, isTopicSet]);

  const loadSavedSessions = async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    setSyncStatus('正在讀取雲端紀錄...');
    try {
      const folderId = await searchFolder(accessToken, FOLDER_NAME);
      const fileId = await searchFile(accessToken, WRITING_SESSIONS_FILE_NAME, folderId || undefined);
      if (fileId) {
        const sessions = await readFile<WritingSessionRecord[]>(accessToken, fileId);
        if (sessions) {
          // Sort by lastModified descending
          setSavedSessions(sessions.sort((a, b) => b.lastModified - a.lastModified));
        }
      }
      setSyncStatus('');
    } catch (error) {
      console.error('Failed to load writing sessions:', error);
      setSyncStatus('讀取紀錄失敗');
      setTimeout(() => setSyncStatus(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSession = async (latestGradingResults?: GradingRecord[], silent: boolean = false) => {
    if (!accessToken) {
      if (!silent) alert('請先登入 Google 帳號以儲存紀錄。');
      return;
    }
    if (!topic.trim()) {
      if (!silent) alert('請先設定寫作主題再儲存。');
      return;
    }

    if (!silent) {
      setIsSyncing(true);
      setSyncStatus('正在儲存進度至雲端...');
    }

    const currentResults = latestGradingResults || gradingResults;
    const currentTopic = topic.trim();

    try {
      let updatedSessions = [...savedSessions];
      
      // 尋找相同主題的紀錄
      const existingSessionIndex = updatedSessions.findIndex(s => s.topic === currentTopic);
      
      let sessionId = currentTopic + '_' + Date.now().toString();

      if (existingSessionIndex !== -1) {
        const existingSession = updatedSessions[existingSessionIndex];
        
        // 簡單的比對邏輯：若對話筆數相近 (差異小於 4 筆) 且作文字數差異不大 (差異小於 50 字)，視為同一份草稿
        const msgDiff = Math.abs((existingSession.chatHistory?.length || 0) - messages.length);
        const contentDiff = Math.abs(existingSession.content.length - writingContent.length);
        
        if (msgDiff <= 4 && contentDiff <= 50) {
          // 高度相似，覆寫既有紀錄 ID
          sessionId = existingSession.id;
          // 將原本的紀錄先移除，後續統一加在最前面
          updatedSessions.splice(existingSessionIndex, 1);
        }
      }

      const currentSession: WritingSessionRecord = {
        id: sessionId,
        topic: currentTopic,
        content: writingContent,
        materials,
        chatHistory: messages,
        gradingResults: currentResults,
        lastModified: Date.now()
      };

      updatedSessions = [currentSession, ...updatedSessions];
      
      const folderId = await searchFolder(accessToken, FOLDER_NAME);
      await saveWritingSessions(accessToken, updatedSessions, folderId || undefined);
      
      setSavedSessions(updatedSessions);
      if (!silent) {
        setSyncStatus('儲存成功！');
        setTimeout(() => setSyncStatus(''), 3000);
      }
      setHasUnsavedChanges(false); // 儲存成功後重置狀態
      setIsWritingUnsaved(false);
    } catch (error) {
      console.error('Failed to save session:', error);
      if (!silent) {
        setSyncStatus('儲存失敗');
        setTimeout(() => setSyncStatus(''), 3000);
      }
    } finally {
      if (!silent) {
        setIsSyncing(false);
      }
    }
  };

  const handleLoadSession = (session: WritingSessionRecord) => {
    if (confirm(`確定要載入「${session.topic}」的紀錄嗎？目前的進度將會被覆蓋。`)) {
      setTopic(session.topic);
      setIsTopicSet(true);
      setWritingContent(session.content);
      setMaterials(session.materials || []);
      setMessages(session.chatHistory || []);
      setGradingResults(session.gradingResults || []);
      
      // Delay resetting the unsaved flag so the changes caused by setting states don't re-trigger it
      setTimeout(() => {
        setHasUnsavedChanges(false);
        setIsWritingUnsaved(false);
      }, 100);
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Helper function to extract materials and progress reports from AI response
  const processAIText = async (text: string) => {
    // 1. Extract Materials: [MATERIAL: XXX]
    const materialRegex = /\[MATERIAL:\s*(.+?)\]/g;
    let materialMatch;
    const newMaterials: string[] = [];
    
    while ((materialMatch = materialRegex.exec(text)) !== null) {
      if (materialMatch[1] && !materials.includes(materialMatch[1].trim())) {
        newMaterials.push(materialMatch[1].trim());
      }
    }
    
    if (newMaterials.length > 0) {
      setMaterials(prev => {
        // Only add unique ones not already in state
        const uniqueNew = newMaterials.filter(m => !prev.includes(m));
        return [...prev, ...uniqueNew];
      });
    }

    // 2. Extract Progress Report: [PROGRESS_REPORT: {...}]
    const progressRegex = /\[PROGRESS_REPORT:\s*(\{.*?\})\]/s;
    const progressMatch = progressRegex.exec(text);
    
    if (progressMatch && progressMatch[1] && accessToken) {
      try {
        const reportData: WritingProgressReport = JSON.parse(progressMatch[1]);
        // Save report to cloud
        const folderId = await searchFolder(accessToken, FOLDER_NAME);
        const fileId = await searchFile(accessToken, WRITING_PROGRESS_FILE_NAME, folderId || undefined);
        let existingReports: WritingProgressReport[] = [];
        
        if (fileId) {
          const content = await readFile<WritingProgressReport[]>(accessToken, fileId);
          if (content && Array.isArray(content)) {
            existingReports = content;
          }
        }
        
        existingReports.push(reportData);
        await saveWritingProgress(accessToken, existingReports, folderId || undefined);
        console.log("Progress report saved successfully!");
      } catch (err) {
        console.error("Failed to parse or save progress report:", err);
      }
    }
    
    // Remove the tags from the text shown to the user
    return text.replace(/\[MATERIAL:\s*(.+?)\]/g, '').replace(/\[PROGRESS_REPORT:\s*(\{.*?\})\]/s, '').trim();
  };

  const handleSetTopic = async () => {
    if (!topic.trim() || isTopicSet) return;
    setIsTopicSet(true);
    
    const systemPrompt = `我想寫一篇關於【${topic.trim()}】的作文，請引導我開始寫作。`;
    const updatedHistory: ChatMessage[] = [{ role: 'user', content: systemPrompt }];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const response = await chatWithWritingAI(updatedHistory, level, modelSettings);
      const cleanContent = await processAIText(response.content);
      setMessages(prev => [...prev, { role: 'assistant', content: cleanContent }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `【系統提示】發生錯誤：${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
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
      
      const cleanContent = await processAIText(response.content);
      
      setMessages(prev => [...prev, { role: 'assistant', content: cleanContent }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `【系統提示】發生錯誤：${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitWriting = async () => {
    if (!writingContent.trim() || isGrading) return;
    
    setIsGradingModalOpen(true);
    setIsGrading(true);
    
    try {
      const response = await gradeWriting(writingContent.trim(), materials, level, modelSettings);
      const newRecord: GradingRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        result: response.data
      };
      // 放到陣列最前面
      setGradingResults(prev => {
        const newResults = [newRecord, ...prev];
        // 批改完成後自動觸發儲存雲端紀錄 (silent save)
        if (accessToken && topic.trim()) {
          handleSaveSession(newResults, true);
        }
        return newResults;
      });
    } catch (error: any) {
      console.error(error);
      alert(`批改發生錯誤：${error.message}`);
    } finally {
      setIsGrading(false);
    }
  };

  const handleDeleteGradingResult = (id: string) => {
    if (confirm('確定要刪除這筆批改紀錄嗎？')) {
      setGradingResults(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      
      {/* 頂部主題設定區 */}
      <div style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-strong)' }}>寫作主題設定</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '500px' }}>
            <span style={{ fontWeight: 'bold' }}>關於：</span>
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isTopicSet || isLoading}
              placeholder="例如：校外教學、我最喜歡的動物..."
              style={{ 
                flex: 1, 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid var(--border-subtle)',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
            {!isTopicSet && (
              <button 
                onClick={handleSetTopic}
                disabled={!topic.trim() || isLoading}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: (!topic.trim() || isLoading) ? '#ccc' : 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  cursor: (!topic.trim() || isLoading) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                設定主題並開始
              </button>
            )}
            {isTopicSet && (
              <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                ✓ 主題已設定
              </span>
            )}
          </div>
        </div>
        
        {/* 雲端存檔功能區 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isSyncing && <span style={{ fontSize: '0.9rem', color: '#64748b', animation: 'pulse 2s infinite' }}>{syncStatus}</span>}
          {!isSyncing && syncStatus && <span style={{ fontSize: '0.9rem', color: '#10b981' }}>{syncStatus}</span>}
          
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            disabled={!accessToken}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              color: 'var(--primary-strong)',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: (!accessToken) ? 'not-allowed' : 'pointer',
              opacity: (!accessToken) ? 0.5 : 1,
              fontWeight: 'bold',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ☁️ 雲端紀錄
          </button>
          
          <button 
            onClick={() => handleSaveSession()}
            disabled={!accessToken || !topic.trim() || isSyncing}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!accessToken || !topic.trim() || isSyncing) ? 'not-allowed' : 'pointer',
              opacity: (!accessToken || !topic.trim() || isSyncing) ? 0.5 : 1,
              fontWeight: 'bold',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            💾 儲存目前進度
          </button>
        </div>
      </div>

      <div 
        style={{ 
          width: '100%', 
          flex: 1,
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setIsGradingModalOpen(true)}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: 'white', 
                color: 'var(--primary)', 
                border: '1px solid var(--primary)', 
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>查看批改紀錄</span>
              {gradingResults.length > 0 && (
                <span style={{ 
                  backgroundColor: 'var(--primary)', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: '20px', 
                  height: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.75rem' 
                }}>
                  {gradingResults.length}
                </span>
              )}
            </button>
            <button 
              onClick={handleSubmitWriting}
              disabled={!writingContent.trim() || isGrading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: (!writingContent.trim() || isGrading) ? '#ccc' : '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '999px',
                cursor: (!writingContent.trim() || isGrading) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                boxShadow: (!writingContent.trim() || isGrading) ? 'none' : '0 4px 10px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              送出批改
            </button>
          </div>
        </div>
        
        <textarea 
          value={writingContent}
          onChange={(e) => setWritingContent(e.target.value)}
          disabled={isLoading || isGrading}
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
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea 
              rows={3}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder="輸入你想討論的內容... (Shift+Enter 換行)"
              disabled={isLoading}
              style={{ 
                flex: 1, 
                padding: '12px 18px', 
                borderRadius: '12px', 
                border: '1px solid var(--border-subtle)',
                outline: 'none',
                fontSize: '0.95rem',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5
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
                transition: 'background-color 0.2s',
                marginBottom: '4px'
              }}
            >
              發送
            </button>
          </form>
        </div>
      </div>

      <WritingDiffModal
        isOpen={isGradingModalOpen}
        onClose={() => setIsGradingModalOpen(false)}
        gradingResults={gradingResults}
        onDeleteResult={handleDeleteGradingResult}
        isLoading={isGrading}
      />
      </div>

      {/* 下方的雲端紀錄列表 (如果超出螢幕可以讓頁面 scroll) */}
      <WritingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        savedSessions={savedSessions}
        onLoadSession={handleLoadSession}
        onRefresh={loadSavedSessions}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
      />
    </div>
  );
};
