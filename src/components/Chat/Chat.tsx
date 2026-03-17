import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, ChatMessage, NpcIdentity, ChatChannel } from '../../types';
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
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef(0);
  const activeChannelRef = useRef<string | null>(null);

  // GM state
  const [npcIdentities, setNpcIdentities] = useState<NpcIdentity[]>([]);
  const [sendAsNpc, setSendAsNpc] = useState('');
  const [isSystemMsg, setIsSystemMsg] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Fetch channels ──────────────────────────────────────────────────────
  const fetchChannels = useCallback(async (): Promise<ChatChannel[] | null> => {
    const { data } = await supabase
      .from('mesh_chat_channels')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: true });
    if (data) setChannels(data as ChatChannel[]);
    return data as ChatChannel[] | null;
  }, []);

  // ── Seed "general" channel if none exist ────────────────────────────────
  const ensureGeneralChannel = useCallback(async (existing: ChatChannel[] | null): Promise<string | null> => {
    if (existing && existing.length > 0) {
      const general = existing.find(c => !c.is_dm && c.name === 'general') ?? existing.find(c => !c.is_dm) ?? existing[0];
      return general.id;
    }
    if (!user.is_gm) return null; // non-GMs wait for GM to create one

    const { data } = await supabase
      .from('mesh_chat_channels')
      .insert({ name: 'general', description: 'Main channel', is_dm: false, created_by: user.id })
      .select()
      .single();

    if (data) {
      // Migrate all existing messages with no channel_id into general
      await supabase
        .from('mesh_chat_messages')
        .update({ channel_id: data.id })
        .is('channel_id', null);

      setChannels([data as ChatChannel]);
      return data.id;
    }
    return null;
  }, [user.id, user.is_gm]);

  // ── Fetch messages for a channel ────────────────────────────────────────
  const fetchMessages = useCallback(async (channelId: string | null) => {
    if (!channelId) { setMessages([]); return; }
    const { data } = await supabase
      .from('mesh_chat_messages')
      .select('*, from_user:mesh_users!mesh_chat_messages_from_user_id_fkey(*), from_npc:mesh_npc_identities!mesh_chat_messages_from_npc_id_fkey(*)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) {
      setMessages(data as ChatMessage[]);
      setTimeout(scrollToBottom, 50);
    }
  }, []);

  const fetchOnlineUsers = useCallback(async () => {
    const { data } = await supabase.from('mesh_users').select('*').eq('is_online', true);
    if (data) setOnlineUsers(data as MeshUser[]);
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const fetched = await fetchChannels();
      if (cancelled) return;

      const channelId = await ensureGeneralChannel(fetched);
      if (cancelled) return;

      if (channelId) {
        setActiveChannelId(channelId);
        activeChannelRef.current = channelId;
        await fetchMessages(channelId);
      }

      await fetchOnlineUsers();

      if (user.is_gm) {
        const { data } = await supabase.from('mesh_npc_identities').select('*');
        if (data && !cancelled) setNpcIdentities(data);
      }

      if (!cancelled) setLoading(false);
    }

    init();
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Switch channel ───────────────────────────────────────────────────────
  const switchChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId);
    activeChannelRef.current = channelId;
    setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    fetchMessages(channelId);
  }, [fetchMessages]);

  // ── Clear unread when module is active ───────────────────────────────────
  useEffect(() => {
    if (isActive) {
      unreadRef.current = 0;
      onUnreadChange(0);
    }
  }, [isActive, onUnreadChange]);

  // ── Realtime: messages ───────────────────────────────────────────────────
  useRealtime({
    table: 'mesh_chat_messages',
    filter: activeChannelId ? `channel_id=eq.${activeChannelId}` : undefined,
    onInsert: (payload) => {
      const incomingChannelId = (payload as Record<string, unknown>)['channel_id'] as string | null;
      if (incomingChannelId === activeChannelRef.current) {
        fetchMessages(activeChannelRef.current);
        if (!isActive) {
          unreadRef.current += 1;
          onUnreadChange(unreadRef.current);
        }
      } else if (incomingChannelId) {
        setUnreadCounts(prev => ({
          ...prev,
          [incomingChannelId]: (prev[incomingChannelId] ?? 0) + 1,
        }));
        if (!isActive) {
          unreadRef.current += 1;
          onUnreadChange(unreadRef.current);
        }
      }
    },
  });

  // ── Realtime: channels ───────────────────────────────────────────────────
  useRealtime({
    table: 'mesh_chat_channels',
    onInsert: () => fetchChannels(),
    onUpdate: () => fetchChannels(),
  });

  // ── Send message ────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !activeChannelId) return;

    const msg: Record<string, unknown> = {
      message: input.trim(),
      is_system: false,
      channel_id: activeChannelId,
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

  // ── Create channel (GM) ──────────────────────────────────────────────────
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const { data } = await supabase
      .from('mesh_chat_channels')
      .insert({
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        description: newChannelDesc.trim() || null,
        is_dm: false,
        created_by: user.id,
      })
      .select()
      .single();
    if (data) {
      setChannels(prev => [...prev, data as ChatChannel]);
      switchChannel(data.id);
    }
    setNewChannelName('');
    setNewChannelDesc('');
    setShowCreateChannel(false);
  };

  // ── Open / create DM ────────────────────────────────────────────────────
  const openDm = async (otherUser: MeshUser) => {
    if (otherUser.id === user.id) return;

    const existing = channels.find(
      c => c.is_dm &&
        c.dm_participants?.includes(user.id) &&
        c.dm_participants?.includes(otherUser.id)
    );
    if (existing) { switchChannel(existing.id); return; }

    const { data } = await supabase
      .from('mesh_chat_channels')
      .insert({
        name: `dm-${user.handle}-${otherUser.handle}`,
        is_dm: true,
        dm_participants: [user.id, otherUser.id],
        created_by: user.id,
      })
      .select()
      .single();

    if (data) {
      setChannels(prev => [...prev, data as ChatChannel]);
      switchChannel(data.id);
    }
  };

  const getSenderName = (msg: ChatMessage): string => {
    if (msg.is_system) return 'SYSTEM';
    if (msg.from_user) return msg.from_user.handle;
    if (msg.from_npc) return msg.from_npc.handle;
    return '???';
  };

  const formatTime = (ts: string): string =>
    new Date(ts).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: false });

  const channelDisplayName = (ch: ChatChannel): string => {
    if (!ch.is_dm) return `#${ch.name}`;
    const otherId = ch.dm_participants?.find(id => id !== user.id);
    const other = onlineUsers.find(u => u.id === otherId);
    return `@${other?.handle ?? 'user'}`;
  };

  const regularChannels = channels.filter(c => !c.is_dm);
  const dmChannels = channels.filter(c => c.is_dm);

  if (loading) {
    return <div className="chat-loading">Connecting to channel...</div>;
  }

  return (
    <div className="chat-module">
      {/* ── Channel list sidebar ── */}
      <div className="chat-channels-panel">
        <div className="chat-channels-header">CHANNELS</div>

        <div className="chat-channel-list">
          {regularChannels.map(ch => {
            const unread = unreadCounts[ch.id] ?? 0;
            return (
              <button
                key={ch.id}
                className={`chat-channel-btn ${activeChannelId === ch.id ? 'active' : ''}`}
                onClick={() => switchChannel(ch.id)}
              >
                <span className="chat-channel-name">{channelDisplayName(ch)}</span>
                {unread > 0 && <span className="chat-channel-badge">{unread}</span>}
              </button>
            );
          })}
        </div>

        {dmChannels.length > 0 && (
          <>
            <div className="chat-channels-section-label">DIRECT</div>
            <div className="chat-channel-list">
              {dmChannels.map(ch => {
                const unread = unreadCounts[ch.id] ?? 0;
                return (
                  <button
                    key={ch.id}
                    className={`chat-channel-btn ${activeChannelId === ch.id ? 'active' : ''}`}
                    onClick={() => switchChannel(ch.id)}
                  >
                    <span className="chat-channel-name">{channelDisplayName(ch)}</span>
                    {unread > 0 && <span className="chat-channel-badge">{unread}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {user.is_gm && (
          <div className="chat-channels-footer">
            {showCreateChannel ? (
              <div className="chat-create-channel-form">
                <input
                  className="chat-create-input"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="channel-name"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateChannel();
                    if (e.key === 'Escape') setShowCreateChannel(false);
                  }}
                  autoFocus
                />
                <input
                  className="chat-create-input"
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="description (opt.)"
                />
                <div className="chat-create-channel-btns">
                  <button className="chat-create-confirm-btn" onClick={handleCreateChannel}>ADD</button>
                  <button className="chat-create-cancel-btn" onClick={() => setShowCreateChannel(false)}>✕</button>
                </div>
              </div>
            ) : (
              <button className="chat-add-channel-btn" onClick={() => setShowCreateChannel(true)}>
                + NEW CHANNEL
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main chat area ── */}
      <div className="chat-main">
        {activeChannelId ? (
          <>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">No messages yet in this channel.</div>
              )}
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
                    <input
                      type="checkbox"
                      checked={isSystemMsg}
                      onChange={e => { setIsSystemMsg(e.target.checked); if (e.target.checked) setSendAsNpc(''); }}
                    />
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
          </>
        ) : (
          <div className="chat-no-channel">
            {user.is_gm
              ? 'No channels yet. Create one using "+ NEW CHANNEL" in the sidebar.'
              : 'No channels available. Ask your GM to create one.'}
          </div>
        )}
      </div>

      {/* ── Online users sidebar ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">ONLINE ({onlineUsers.length})</div>
        <div className="chat-user-list">
          {onlineUsers.map(u => (
            <div key={u.id} className="chat-user-item">
              <span className="status-dot online" />
              <span className="chat-user-handle">{u.handle}</span>
              {u.is_gm && <span className="chat-gm-tag">GM</span>}
              {u.id !== user.id && (
                <button className="chat-dm-btn" onClick={() => openDm(u)} title={`DM ${u.handle}`}>DM</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
