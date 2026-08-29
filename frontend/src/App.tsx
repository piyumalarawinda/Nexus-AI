import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, SessionItem } from './components/Sidebar';
import { ToolInspector, ToolStepData } from './components/ToolInspector';
import { AuthModal } from './components/AuthModal';
import { Send, Bot, User as UserIcon, Sparkles, LogOut, AlertTriangle, Plus } from 'lucide-react';

export interface ChatMessageUI {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolSteps?: ToolStepData[];
  isStreaming?: boolean;
}

export interface UserProfile {
  email: string;
  name: string;
}

const MAX_SESSION_MESSAGES = 100;

// Helper to strip any emojis from text
function stripEmojis(str: string): string {
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();
}

// Clean Formatted Text Component: Removes emojis, converts numbered lists to bullets, and renders clean text paragraphs
function CleanFormattedText({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="formatted-chat-text" style={{ lineHeight: 1.68 }}>
      {lines.map((line, lineIdx) => {
        let trimmed = line.trim();

        // 1. Handle Headers (###, ##, #)
        const isHeader = /^#{1,6}\s+/.test(trimmed);
        if (isHeader) {
          const rawHeader = trimmed.replace(/^#{1,6}\s+/, '');
          const cleanHeader = stripEmojis(rawHeader);
          if (!cleanHeader) return null;

          return (
            <div
              key={lineIdx}
              style={{
                fontSize: '1.04rem',
                fontWeight: 800,
                color: '#231b15',
                marginTop: lineIdx === 0 ? '0px' : '14px',
                marginBottom: '6px',
                letterSpacing: '-0.01em'
              }}
            >
              {parseBoldInline(cleanHeader)}
            </div>
          );
        }

        // 2. Handle Empty Lines (Paragraph spacing)
        if (!trimmed) {
          return <div key={lineIdx} style={{ height: '6px' }} />;
        }

        // 3. Handle Bullet Points (* or -) and Numbered Items (1., 2., 3.) -> Convert all to Bullet Points
        const isBulletOrNumber = /^([\*\-]|(\d+[\.\)]))\s+/.test(trimmed);
        if (isBulletOrNumber) {
          const itemText = trimmed.replace(/^([\*\-]|(\d+[\.\)]))\s+/, '');
          const cleanItemText = stripEmojis(itemText);
          if (!cleanItemText) return null;

          return (
            <div key={lineIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0 4px 6px' }}>
              <span style={{ color: '#f97316', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>•</span>
              <span style={{ color: '#2d241e' }}>{parseBoldInline(cleanItemText)}</span>
            </div>
          );
        }

        // 4. Normal Paragraph Line
        const cleanLine = stripEmojis(line);
        if (!cleanLine) return null;

        return (
          <div key={lineIdx} style={{ margin: '4px 0', color: '#2d241e' }}>
            {parseBoldInline(cleanLine)}
          </div>
        );
      })}
    </div>
  );
}

// Helper to strip **bold** and render <strong> tags without raw asterisks
function parseBoldInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: '#18110c' }}>
          {stripEmojis(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} style={{ fontStyle: 'italic', color: '#44372c' }}>
          {stripEmojis(part.slice(1, -1))}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '0.86rem', fontFamily: 'monospace' }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return stripEmojis(part);
  });
}

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('mock');
  const [isStreaming, setIsStreaming] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isMessageLimitReached = messages.length >= MAX_SESSION_MESSAGES;

  // Check saved user email on initial load
  useEffect(() => {
    const savedEmail = localStorage.getItem('nexus_user_email');
    const savedName = localStorage.getItem('nexus_user_name');
    if (savedEmail) {
      setUser({ email: savedEmail, name: savedName || savedEmail.split('@')[0] });
    }
  }, []);

  const handleLogin = (email: string, name: string) => {
    localStorage.setItem('nexus_user_email', email);
    localStorage.setItem('nexus_user_name', name);
    setUser({ email, name });
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_user_email');
    localStorage.removeItem('nexus_user_name');
    setUser(null);
    setCurrentSessionId(null);
    setMessages([]);
  };

  // Auto-scroll chat stream to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load Sessions List
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/v1/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  // Load Session Messages when session selected
  const handleSelectSession = async (id: string) => {
    setCurrentSessionId(id);
    try {
      const res = await fetch(`/api/v1/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        const formattedMessages: ChatMessageUI[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          toolSteps: m.toolCalls ? JSON.parse(m.toolCalls) : undefined
        }));
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`/api/v1/sessions/${id}`, { method: 'DELETE' });
      if (currentSessionId === id) handleNewChat();
      await fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  // Main SSE Chat Stream Dispatcher
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || promptInput;
    if (!text.trim() || isStreaming || isMessageLimitReached) return;

    setPromptInput('');
    setIsStreaming(true);

    const userMsgId = 'user-' + Date.now();
    const assistantMsgId = 'asst-' + Date.now();

    const userMessage: ChatMessageUI = {
      id: userMsgId,
      role: 'user',
      content: text
    };

    const assistantMessage: ChatMessageUI = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      toolSteps: [],
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);

    try {
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          prompt: text,
          provider: selectedProvider,
          userEmail: user?.email
        })
      });

      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '').trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'session_init') {
                if (!currentSessionId) {
                  setCurrentSessionId(event.data.sessionId);
                  fetchSessions();
                }
              } else if (['reasoning', 'tool_call', 'tool_result', 'rag_context'].includes(event.type)) {
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    const newSteps = [...(m.toolSteps || [])];
                    if (event.type === 'rag_context') {
                      newSteps.push({ ragContext: { content: event.content, data: event.data } });
                    } else if (event.type === 'reasoning') {
                      newSteps.push({ reasoning: event.content });
                    } else if (event.type === 'tool_call') {
                      newSteps.push({ toolName: event.data.toolName, args: event.data.args });
                    } else if (event.type === 'tool_result') {
                      newSteps.push({ result: event.data });
                    }
                    return { ...m, toolSteps: newSteps };
                  }
                  return m;
                }));
              } else if (event.type === 'token') {
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    return { ...m, content: m.content + (event.content || '') };
                  }
                  return m;
                }));
              } else if (event.type === 'done') {
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMsgId) {
                    return { ...m, isStreaming: false };
                  }
                  return m;
                }));
              }
            } catch (e) {
              console.error('JSON parse error frame:', line);
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId) {
          return { ...m, content: m.content + `\n\n⚠️ Error: ${err.message}`, isStreaming: false };
        }
        return m;
      }));
    } finally {
      setIsStreaming(false);
      fetchSessions();
    }
  };

  return (
    <div className="app-container">
      {/* Email Login Gateway Modal */}
      {!user && <AuthModal onLogin={handleLogin} />}

      {/* Sidebar Navigation */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
      />

      {/* Main Viewport */}
      <main className="main-viewport">
        {/* Top Bar */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#231b15' }}>
              Agentic Assistant Console
            </h3>
          </div>

          <div className="header-status">
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '5px 12px 5px 8px', borderRadius: '20px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #d97706)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 800 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textTransform: 'none' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#231b15', lineHeight: 1.1 }}>{user.name}</span>
                  <span style={{ fontSize: '0.68rem', color: '#8c7c6e', fontWeight: 600 }}>{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Switch Account / Log Out"
                  style={{ background: 'transparent', border: 'none', color: '#8c7c6e', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', marginLeft: '4px' }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}

            <div className="status-badge">
              <span className="status-dot"></span> {selectedProvider.toUpperCase()} Active
            </div>
          </div>
        </header>

        {/* Dedicated Assistant Chat Container */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 68px)' }}>
          {/* Chat Messages Feed */}
          <div className="chat-scroll-area">
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto 0', padding: '40px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #f97316, #d97706)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', boxShadow: '0 6px 25px rgba(249, 115, 22, 0.35)' }}>
                  <Sparkles size={34} color="#fff" />
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#231b15', marginBottom: '8px' }}>
                  Welcome back, {user?.name || 'User'}! 👋
                </h2>
                <p style={{ color: '#78695c', fontSize: '0.94rem', maxWidth: '540px', margin: '0 auto 10px auto', lineHeight: 1.6, fontWeight: 500 }}>
                  Logged in as <strong style={{ color: '#231b15' }}>{user?.email}</strong>. Ask any question, perform calculations, or explore technical concepts.
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`message-bubble ${msg.role}`}>
                  <div className={`avatar ${msg.role}`}>
                    {msg.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                  </div>

                  <div className="message-body">
                    <div className="message-meta">
                      <span className="message-author">
                        {msg.role === 'user' ? (user?.name || 'You') : 'Nexus AI Assistant'}
                      </span>
                      <span>•</span>
                      <span>{msg.role === 'assistant' ? selectedProvider.toUpperCase() : 'Prompt'}</span>
                    </div>

                    {/* Tool Steps Inspector Card */}
                    {msg.toolSteps && msg.toolSteps.length > 0 && (
                      <ToolInspector steps={msg.toolSteps} />
                    )}

                    <div className="message-text">
                      <CleanFormattedText content={msg.content} />
                      {msg.isStreaming && (
                        <span style={{ display: 'inline-block', width: '8px', height: '16px', background: '#f97316', marginLeft: '4px', animation: 'pulse-glow 0.8s infinite' }}></span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Chat Input Dock */}
          <div className="input-dock">
            {/* 100 Message Limit Warning Banner */}
            {isMessageLimitReached && (
              <div className="limit-warning-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={20} color="#dc2626" />
                  <span style={{ color: '#991b1b', fontSize: '0.88rem', fontWeight: 600 }}>
                    <strong>Session Limit Reached ({MAX_SESSION_MESSAGES}/{MAX_SESSION_MESSAGES})</strong>: You have reached the 100 message limit for this chat session. Please start a new session to continue chatting.
                  </span>
                </div>
                <button className="new-session-banner-btn" onClick={handleNewChat}>
                  <Plus size={16} /> Start New Session
                </button>
              </div>
            )}

            <div className="input-wrapper">
              <textarea
                className="chat-input"
                placeholder={isMessageLimitReached ? "Message limit reached (100/100). Click 'Start New Session' above to continue." : "Ask a question in English or Sinhala, request calculations, or explore technical concepts..."}
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                disabled={isStreaming || isMessageLimitReached}
              />
              <button
                className="send-btn"
                onClick={() => handleSendMessage()}
                disabled={isStreaming || isMessageLimitReached || !promptInput.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
