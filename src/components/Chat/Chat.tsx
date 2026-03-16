import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, ChatMessage, NpcIdentity } from '../../types';
import './Chat.css';

interface ChatModuleProps {
  user: MeshUser;
  onUnreadChange: (count: number) => void;
  isActive: boolean;
}

export function ChatModule({ user, onUnreadChange, isActive }: ChatModuleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<MeshUser[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef(0);

  // GM state
  const [npcIdentities, setNpcIdentities] = useState<NpcIdentity[]>([]);
  const [sendAsNpc, setSendAsNpc] = useState('');
  const [isSystemMsg, setIsSystemMsg] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_chat_messages')
      .select('*, from_user:mesh_users!mesh_chat_messages_from_user_id_fkey(*), from_npc:mesh_npc_identities!mesh_chat_messages_from_npc_id_fkey(*)')
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 50);
    }
    setLoading(false);
  }, []);

  const fetchOnlineUsers = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_users')
      .select('*')
      .eq('is_online', true);
    if (data) setOnlineUsers(data);
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 30000);

    if (user.is_gm) {
      supabase.from('mesh_npc_identities').select('*').then(({ data }) => {
        if (data) setNpcIdentities(data);
      });
    }

    return () => clearInterval(interval);
  }, [fetchMessages, fetchOnlineUsers, user.is_gm]);

  useEffect(() => {
    if (isActive) {
      unreadRef.current = 0;
      onUnreadChange(0);
    }
  }, [isActive, onUnreadChange]);

  useRealtime({
    table: 'mesh_chat_messages',
    onInsert: () => {
      fetchMessages();
      if (!isActive) {
        unreadRef.current += 1;
        onUnreadChange(unreadRef.current);
      }
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    const msg: Record<string, unknown> = {
      message: input.trim(),
      is_system: false,
    };

    if (isSystemMsg && user.is_gm) {
      msg.is_system = true;
      msg.from_user_id = user.id;
    } else if (sendAsNpc && user.is_gm) {
      msg.from_npc_id = sendAsNpc;
    } else {
      msg.from_user_id = user.id;
    }

    await supabase.from('mesh_chat_messages').insert(msg);
    setInput('');
    setIsSystemMsg(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSenderName = (msg: ChatMessage): string => {
    if (msg.is_system) return 'SYSTEM';
    if (msg.from_user) return msg.from_user.handle;
    if (msg.from_npc) return msg.from_npc.handle;
    return '???';
  };

  const formatTime = (ts: string): string => {
    return new Date(ts).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) {
    return <div className="chat-loading">Connecting to channel...</div>;
  }

  return (
    <div className="chat-module">
      <div className="chat-main">
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-msg ${msg.is_system ? 'system-msg' : ''}`}>
              <span className="chat-time">{formatTime(msg.created_at)}</span>
              <span className={`chat-sender ${msg.is_system ? 'system-sender' : ''}`}>
                {msg.is_system ? '[SYSTEM ALERT]' : `<${getSenderName(msg)}>`}
              </span>
              <span className="chat-text">{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area">
          {user.is_gm && (
            <div className="chat-gm-controls">
              <select value={sendAsNpc} onChange={e => { setSendAsNpc(e.target.value); setIsSystemMsg(false); }}>
                <option value="">You ({user.handle})</option>
                {npcIdentities.map(npc => (
                  <option key={npc.id} value={npc.id}>{npc.handle}</option>
                ))}
              </select>
              <label className="system-toggle">
                <input type="checkbox" checked={isSystemMsg} onChange={e => { setIsSystemMsg(e.target.checked); if (e.target.checked) setSendAsNpc(''); }} />
                SYS
              </label>
            </div>
          )}
          <div className="chat-input-row">
            <span className="chat-prompt">&gt;</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message..."
              className="chat-input"
            />
            <button onClick={handleSend} className="chat-send">SEND</button>
          </div>
        </div>
      </div>

      <div className="chat-sidebar">
        <div className="chat-sidebar-header">ONLINE ({onlineUsers.length})</div>
        <div className="chat-user-list">
          {onlineUsers.map(u => (
            <div key={u.id} className="chat-user-item">
              <span className="status-dot online" />
              <span className="chat-user-handle">{u.handle}</span>
              {u.is_gm && <span className="chat-gm-tag">GM</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
