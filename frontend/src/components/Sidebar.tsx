import React from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';

export interface SessionItem {
  id: string;
  title: string;
  modelProvider: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface SidebarProps {
  sessions: SessionItem[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  selectedProvider,
  setSelectedProvider
}) => {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand-header">
        <div className="brand-logo-icon">
          <Zap size={24} color="#fff" />
        </div>
        <div>
          <div className="brand-title">Nexus AI</div>
          <div className="brand-subtitle">Agentic AI Assistant</div>
        </div>
      </div>

      {/* New Chat Button */}
      <button className="new-chat-btn" onClick={onNewChat} style={{ marginTop: '12px' }}>
        <Plus size={18} /> New Agent Session
      </button>

      {/* Sessions List */}
      <div className="sidebar-content" style={{ marginTop: '14px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#78695c', marginBottom: '10px', paddingLeft: '4px', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Chat Trajectories</span>
            <span style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {sessions.length}
            </span>
          </div>
          {sessions.map(s => (
            <div
              key={s.id}
              className={`session-item ${currentSessionId === s.id ? 'active' : ''}`}
              onClick={() => onSelectSession(s.id)}
            >
              <div className="session-title-text">{s.title}</div>
              <button
                className="session-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(s.id);
                }}
                title="Delete Session"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Provider Selector Footer */}
      <div className="sidebar-footer">
        <div className="provider-label">
          <span>Active LLM Engine</span>
          <span style={{ color: selectedProvider === 'mock' ? '#f97316' : '#059669' }}>
            ● {selectedProvider === 'mock' ? 'Mock Mode' : 'Live AI'}
          </span>
        </div>
        
        <select
          className="provider-select"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
        >
          <option value="mock">⚡ Nexus Mock Engine (Offline)</option>
          <option value="gemini">♊ Google Gemini 1.5 Flash (Live)</option>
          <option value="openai">🤖 OpenAI GPT-4o (Live)</option>
        </select>
      </div>
    </aside>
  );
};
