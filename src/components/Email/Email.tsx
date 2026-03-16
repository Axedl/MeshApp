import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, Email, NpcIdentity } from '../../types';
import './Email.css';

interface EmailModuleProps {
  user: MeshUser;
  onUnreadChange: (count: number) => void;
}

type EmailView = 'inbox' | 'sent' | 'compose' | 'read';

export function EmailModule({ user, onUnreadChange }: EmailModuleProps) {
  const [view, setView] = useState<EmailView>('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');

  // GM state
  const [npcIdentities, setNpcIdentities] = useState<NpcIdentity[]>([]);
  const [sendAsNpc, setSendAsNpc] = useState<string>('');
  const [sendToAll, setSendToAll] = useState(false);
  const [allUsers, setAllUsers] = useState<MeshUser[]>([]);

  const fetchEmails = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_emails')
      .select('*, from_user:mesh_users!mesh_emails_from_user_id_fkey(*), from_npc:mesh_npc_identities!mesh_emails_from_npc_id_fkey(*), to_user:mesh_users!mesh_emails_to_user_id_fkey(*)')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setEmails(data);
      onUnreadChange(data.filter(e => !e.is_read).length);
    }
    setLoading(false);
  }, [user.id, onUnreadChange]);

  const fetchSentEmails = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_emails')
      .select('*, from_user:mesh_users!mesh_emails_from_user_id_fkey(*), from_npc:mesh_npc_identities!mesh_emails_from_npc_id_fkey(*), to_user:mesh_users!mesh_emails_to_user_id_fkey(*)')
      .eq('from_user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setSentEmails(data);
  }, [user.id]);

  useEffect(() => {
    fetchEmails();
    fetchSentEmails();

    if (user.is_gm) {
      supabase.from('mesh_npc_identities').select('*').then(({ data }) => {
        if (data) setNpcIdentities(data);
      });
    }

    supabase.from('mesh_users').select('*').eq('is_gm', false).then(({ data }) => {
      if (data) setAllUsers(data);
    });
  }, [fetchEmails, fetchSentEmails, user.is_gm]);

  useRealtime({
    table: 'mesh_emails',
    filter: `to_user_id=eq.${user.id}`,
    onInsert: () => fetchEmails(),
  });

  const openEmail = async (email: Email) => {
    setSelectedEmail(email);
    setView('read');
    if (!email.is_read) {
      await supabase.from('mesh_emails').update({ is_read: true }).eq('id', email.id);
      fetchEmails();
    }
  };

  const handleSend = async () => {
    setComposeError('');
    setSending(true);

    if (sendToAll && user.is_gm) {
      // Send to all players
      const inserts = allUsers.map(u => ({
        from_user_id: sendAsNpc ? null : user.id,
        from_npc_id: sendAsNpc || null,
        to_user_id: u.id,
        subject,
        body,
      }));
      const { error } = await supabase.from('mesh_emails').insert(inserts);
      if (error) {
        setComposeError(`[ERR] ${error.message}`);
        setSending(false);
        return;
      }
    } else {
      // Resolve recipient handle
      const { data: recipient } = await supabase
        .from('mesh_users')
        .select('id')
        .eq('handle', to)
        .single();

      if (!recipient) {
        setComposeError('[ERR] Recipient handle not found.');
        setSending(false);
        return;
      }

      const { error } = await supabase.from('mesh_emails').insert({
        from_user_id: sendAsNpc ? null : user.id,
        from_npc_id: sendAsNpc || null,
        to_user_id: recipient.id,
        subject,
        body,
      });

      if (error) {
        setComposeError(`[ERR] ${error.message}`);
        setSending(false);
        return;
      }
    }

    setTo('');
    setSubject('');
    setBody('');
    setSendAsNpc('');
    setSendToAll(false);
    setView('sent');
    fetchSentEmails();
    setSending(false);
  };

  const handleReply = (email: Email) => {
    const senderHandle = email.from_user?.handle || email.from_npc?.handle || '';
    setTo(senderHandle);
    setSubject(`RE: ${email.subject}`);
    setBody(`\n\n--- Original message from ${senderHandle} ---\n${email.body}`);
    setView('compose');
  };

  const getSenderName = (email: Email): string => {
    if (email.from_user) return email.from_user.handle;
    if (email.from_npc) return email.from_npc.handle;
    return 'Unknown';
  };

  const formatTime = (ts: string): string => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' +
      d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) {
    return <div className="email-loading">Loading messages...</div>;
  }

  return (
    <div className="email-module">
      <div className="email-toolbar">
        <button className={view === 'inbox' ? 'active' : ''} onClick={() => setView('inbox')}>
          INBOX ({emails.filter(e => !e.is_read).length})
        </button>
        <button className={view === 'sent' ? 'active' : ''} onClick={() => { setView('sent'); fetchSentEmails(); }}>
          SENT
        </button>
        <button className={view === 'compose' ? 'active' : ''} onClick={() => { setView('compose'); setTo(''); setSubject(''); setBody(''); }}>
          + COMPOSE
        </button>
      </div>

      {view === 'inbox' && (
        <div className="email-list">
          {emails.length === 0 ? (
            <div className="email-empty">[No messages in inbox]</div>
          ) : (
            emails.map(email => (
              <div
                key={email.id}
                className={`email-row ${!email.is_read ? 'unread' : ''}`}
                onClick={() => openEmail(email)}
              >
                <span className="email-status">{email.is_read ? ' ' : '●'}</span>
                <span className="email-sender">{getSenderName(email)}</span>
                <span className="email-subject">{email.subject}</span>
                <span className="email-time">{formatTime(email.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'sent' && (
        <div className="email-list">
          {sentEmails.length === 0 ? (
            <div className="email-empty">[No sent messages]</div>
          ) : (
            sentEmails.map(email => (
              <div
                key={email.id}
                className="email-row"
                onClick={() => openEmail(email)}
              >
                <span className="email-status"> </span>
                <span className="email-sender">→ {email.to_user?.handle || '???'}</span>
                <span className="email-subject">{email.subject}</span>
                <span className="email-time">{formatTime(email.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'read' && selectedEmail && (
        <div className="email-reader">
          <div className="email-reader-header">
            <div><span className="label">FROM:</span> {getSenderName(selectedEmail)}</div>
            <div><span className="label">TO:</span> {selectedEmail.to_user?.handle || user.handle}</div>
            <div><span className="label">SUBJ:</span> {selectedEmail.subject}</div>
            <div><span className="label">DATE:</span> {formatTime(selectedEmail.created_at)}</div>
          </div>
          <div className="email-reader-body">{selectedEmail.body}</div>
          <div className="email-reader-actions">
            <button onClick={() => handleReply(selectedEmail)}>REPLY</button>
            <button onClick={() => setView('inbox')}>BACK</button>
          </div>
        </div>
      )}

      {view === 'compose' && (
        <div className="email-compose">
          {user.is_gm && (
            <div className="gm-compose-controls">
              <div className="compose-field">
                <label>SEND AS:</label>
                <select value={sendAsNpc} onChange={e => setSendAsNpc(e.target.value)}>
                  <option value="">Yourself ({user.handle})</option>
                  {npcIdentities.map(npc => (
                    <option key={npc.id} value={npc.id}>{npc.handle} ({npc.display_name})</option>
                  ))}
                </select>
              </div>
              <div className="compose-field">
                <label>
                  <input type="checkbox" checked={sendToAll} onChange={e => setSendToAll(e.target.checked)} />
                  {' '}SEND TO ALL PLAYERS
                </label>
              </div>
            </div>
          )}
          {!sendToAll && (
            <div className="compose-field">
              <label>&gt; TO:</label>
              <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient handle" />
            </div>
          )}
          <div className="compose-field">
            <label>&gt; SUBJ:</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="subject" />
          </div>
          <div className="compose-field compose-body">
            <label>&gt; BODY:</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder="Message body..." />
          </div>
          {composeError && <div className="compose-error">{composeError}</div>}
          <div className="compose-actions">
            <button onClick={handleSend} disabled={sending || (!to && !sendToAll) || !subject}>
              {sending ? 'SENDING...' : '[ SEND ]'}
            </button>
            <button onClick={() => setView('inbox')}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}
