import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, CombatSession, CombatParticipant, PcSheet } from '../../types';
import './Combat.css';

interface CombatModuleProps {
  user: MeshUser;
  onCombatActiveChange?: (active: boolean) => void;
}

const WOUND_LABELS = ['OK', 'LIGHT', 'SERIOUS', 'CRITICAL', 'MORTAL', 'DEAD'];
const WOUND_CLASSES = ['wound-ok', 'wound-light', 'wound-serious', 'wound-critical', 'wound-mortal', 'wound-dead'];

export function CombatModule({ user, onCombatActiveChange }: CombatModuleProps) {
  const [sessions, setSessions] = useState<CombatSession[]>([]);
  const [activeSession, setActiveSession] = useState<CombatSession | null>(null);
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [pcSheets, setPcSheets] = useState<PcSheet[]>([]);
  const [allUsers, setAllUsers] = useState<MeshUser[]>([]);
  const [loading, setLoading] = useState(true);

  // GM: create session
  const [newSessionName, setNewSessionName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // GM: add participant
  const [addName, setAddName] = useState('');
  const [addInitiative, setAddInitiative] = useState('');
  const [addHpMax, setAddHpMax] = useState('');
  const [addIsNpc, setAddIsNpc] = useState(true);
  const [addPcSheet, setAddPcSheet] = useState('');
  const [addNotes, setAddNotes] = useState('');

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_combat_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSessions(data as CombatSession[]);
    setLoading(false);
  }, []);

  const fetchParticipants = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('mesh_combat_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_order', { ascending: true });
    if (data) setParticipants(data as CombatParticipant[]);
  }, []);

  useEffect(() => {
    fetchSessions();
    if (user.is_gm) {
      supabase.from('mesh_pc_sheets').select('*').then(({ data, error }) => {
        if (error) console.error('[Combat] Failed to load PC sheets:', error.message);
        if (data) setPcSheets(data as PcSheet[]);
      });
      supabase.from('mesh_users').select('*').then(({ data, error }) => {
        if (error) console.error('[Combat] Failed to load users:', error.message);
        if (data) setAllUsers(data as MeshUser[]);
      });
    }
  }, [fetchSessions, user.is_gm]);

  useEffect(() => {
    if (activeSession) fetchParticipants(activeSession.id);
  }, [activeSession, fetchParticipants]);

  // Notify parent when combat goes active/inactive
  useEffect(() => {
    onCombatActiveChange?.(activeSession?.status === 'active');
  }, [activeSession, onCombatActiveChange]);

  useRealtime({
    table: 'mesh_combat_sessions',
    onChange: () => {
      fetchSessions();
      if (activeSession) {
        supabase.from('mesh_combat_sessions').select('*').eq('id', activeSession.id).single()
          .then(({ data }) => { if (data) setActiveSession(data as CombatSession); });
      }
    },
  });

  useRealtime({
    table: 'mesh_combat_participants',
    filter: activeSession ? `session_id=eq.${activeSession.id}` : undefined,
    onChange: () => { if (activeSession) fetchParticipants(activeSession.id); },
  });

  // ── GM actions ─────────────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    const { data } = await supabase
      .from('mesh_combat_sessions')
      .insert({ name: newSessionName.trim(), created_by: user.id })
      .select()
      .single();
    if (data) {
      setActiveSession(data as CombatSession);
      fetchSessions();
    }
    setNewSessionName('');
    setShowCreate(false);
  };

  const handleAddParticipant = async () => {
    if (!activeSession || !addName.trim()) return;
    const initiative = parseInt(addInitiative) || 0;
    const hp = parseInt(addHpMax) || 10;
    const sortOrder = participants.length;

    let pcSheetId: string | null = null;
    let resolvedName = addName.trim();
    let resolvedHp = hp;

    if (!addIsNpc && addPcSheet) {
      const sheet = pcSheets.find(s => s.id === addPcSheet);
      if (sheet) {
        pcSheetId = sheet.id;
        resolvedName = sheet.handle || resolvedName;
        resolvedHp = sheet.hp_max || hp;
      }
    }

    await supabase.from('mesh_combat_participants').insert({
      session_id: activeSession.id,
      display_name: resolvedName,
      initiative,
      hp_current: resolvedHp,
      hp_max: resolvedHp,
      wound_state: 0,
      is_npc: addIsNpc,
      pc_sheet_id: pcSheetId,
      notes: addNotes.trim(),
      sort_order: sortOrder,
    });

    setAddName('');
    setAddInitiative('');
    setAddHpMax('');
    setAddIsNpc(true);
    setAddPcSheet('');
    setAddNotes('');
    fetchParticipants(activeSession.id);
  };

  const handleSortByInitiative = async () => {
    if (!activeSession) return;
    const sorted = [...participants].sort((a, b) => b.initiative - a.initiative);
    await Promise.all(
      sorted.map((p, i) =>
        supabase.from('mesh_combat_participants').update({ sort_order: i }).eq('id', p.id)
      )
    );
    fetchParticipants(activeSession.id);
  };

  const handleStartCombat = async () => {
    if (!activeSession) return;
    await supabase.from('mesh_combat_sessions').update({ status: 'active', current_participant_index: 0 }).eq('id', activeSession.id);
    fetchSessions();
  };

  const handleNextTurn = async () => {
    if (!activeSession) return;
    const next = (activeSession.current_participant_index + 1) % Math.max(participants.length, 1);
    const newRound = next === 0 ? activeSession.round + 1 : activeSession.round;
    await supabase.from('mesh_combat_sessions').update({
      current_participant_index: next,
      round: newRound,
    }).eq('id', activeSession.id);
  };

  const handleEndCombat = async () => {
    if (!activeSession) return;
    await supabase.from('mesh_combat_sessions').update({ status: 'complete', is_active: false }).eq('id', activeSession.id);
  };

  const handleUpdateHp = async (p: CombatParticipant, delta: number) => {
    const newHp = Math.max(0, Math.min(p.hp_max, p.hp_current + delta));
    const woundState = Math.min(5, Math.floor(((p.hp_max - newHp) / Math.max(p.hp_max, 1)) * 6));
    await supabase.from('mesh_combat_participants')
      .update({ hp_current: newHp, wound_state: woundState })
      .eq('id', p.id);
    fetchParticipants(activeSession!.id);
  };

  const handleRemoveParticipant = async (id: string) => {
    await supabase.from('mesh_combat_participants').delete().eq('id', id);
    fetchParticipants(activeSession!.id);
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' });

  if (loading) return <div className="combat-loading">Loading combat data...</div>;

  return (
    <div className="combat-module">
      {/* ── Session selector ── */}
      <div className="combat-sidebar">
        <div className="combat-sidebar-header">SESSIONS</div>
        <div className="combat-session-list">
          {sessions.map(s => (
            <button
              key={s.id}
              className={`combat-session-btn ${activeSession?.id === s.id ? 'active' : ''} status-${s.status}`}
              onClick={() => setActiveSession(s)}
            >
              <span className="combat-session-name">{s.name}</span>
              <span className="combat-session-status">{s.status.toUpperCase()}</span>
              <span className="combat-session-date">{formatDate(s.created_at)}</span>
            </button>
          ))}
        </div>
        {user.is_gm && (
          <div className="combat-sidebar-footer">
            {showCreate ? (
              <div className="combat-create-form">
                <input
                  className="combat-create-input"
                  value={newSessionName}
                  onChange={e => setNewSessionName(e.target.value)}
                  placeholder="Encounter name..."
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateSession(); if (e.key === 'Escape') setShowCreate(false); }}
                  autoFocus
                />
                <div className="combat-create-btns">
                  <button onClick={handleCreateSession} disabled={!newSessionName.trim()}>CREATE</button>
                  <button onClick={() => setShowCreate(false)}>✕</button>
                </div>
              </div>
            ) : (
              <button className="combat-new-btn" onClick={() => setShowCreate(true)}>+ NEW ENCOUNTER</button>
            )}
          </div>
        )}
      </div>

      {/* ── Main combat area ── */}
      <div className="combat-main">
        {!activeSession ? (
          <div className="combat-empty">Select an encounter or create a new one</div>
        ) : (
          <>
            <div className="combat-header">
              <div className="combat-title">{activeSession.name}</div>
              <div className="combat-round">
                {activeSession.status === 'active' && <span className="combat-round-badge">ROUND {activeSession.round}</span>}
                <span className={`combat-status-badge status-${activeSession.status}`}>{activeSession.status.toUpperCase()}</span>
              </div>
            </div>

            {/* GM controls */}
            {user.is_gm && (
              <div className="combat-gm-controls">
                {activeSession.status === 'pending' && (
                  <button onClick={handleStartCombat} className="combat-start-btn">⚔ START COMBAT</button>
                )}
                {activeSession.status === 'active' && (
                  <>
                    <button onClick={handleNextTurn} className="combat-next-btn">▶ NEXT TURN</button>
                    <button onClick={handleEndCombat} className="combat-end-btn">■ END COMBAT</button>
                  </>
                )}
                {activeSession.status === 'pending' && participants.length > 1 && (
                  <button onClick={handleSortByInitiative} className="combat-sort-btn">↕ SORT BY INITIATIVE</button>
                )}
              </div>
            )}

            {/* Participants list */}
            <div className="combat-participants">
              {participants.length === 0 && (
                <div className="combat-empty-participants">[ No participants — add them below ]</div>
              )}
              {participants.map((p, idx) => {
                const isActive = activeSession.status === 'active' && idx === activeSession.current_participant_index;
                const hpPct = p.hp_max > 0 ? (p.hp_current / p.hp_max) * 100 : 0;
                return (
                  <div key={p.id} className={`combat-participant ${isActive ? 'active-turn' : ''} ${p.is_npc ? 'is-npc' : 'is-pc'}`}>
                    {isActive && <span className="turn-indicator">▶</span>}
                    <div className="participant-info">
                      <span className="participant-name">{p.display_name}</span>
                      <span className="participant-type">{p.is_npc ? 'NPC' : 'PC'}</span>
                      <span className={`participant-wound ${WOUND_CLASSES[p.wound_state ?? 0]}`}>
                        {WOUND_LABELS[p.wound_state ?? 0]}
                      </span>
                      {p.notes && <span className="participant-notes">{p.notes}</span>}
                    </div>
                    <div className="participant-stats">
                      <span className="participant-init">INIT: {p.initiative}</span>
                      <div className="participant-hp-row">
                        <div className="participant-hp-bar">
                          <div className="participant-hp-fill" style={{ width: `${hpPct}%` }} />
                        </div>
                        <span className="participant-hp-text">{p.hp_current}/{p.hp_max}</span>
                      </div>
                    </div>
                    {user.is_gm && activeSession.status !== 'complete' && (
                      <div className="participant-gm-actions">
                        <button className="hp-btn" onClick={() => handleUpdateHp(p, -1)}>-1</button>
                        <button className="hp-btn" onClick={() => handleUpdateHp(p, -5)}>-5</button>
                        <button className="hp-btn heal" onClick={() => handleUpdateHp(p, 1)}>+1</button>
                        <button className="hp-btn heal" onClick={() => handleUpdateHp(p, 5)}>+5</button>
                        <button className="remove-btn" onClick={() => handleRemoveParticipant(p.id)}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* GM: add participant */}
            {user.is_gm && activeSession.status !== 'complete' && (
              <div className="combat-add-participant">
                <div className="add-participant-header">[GM] ADD PARTICIPANT</div>
                <div className="add-participant-row">
                  <label className="add-toggle">
                    <input type="checkbox" checked={!addIsNpc} onChange={e => { setAddIsNpc(!e.target.checked); setAddPcSheet(''); }} />
                    FROM PC SHEET
                  </label>
                  {!addIsNpc && (
                    <select
                      className="add-select"
                      value={addPcSheet}
                      onChange={e => {
                        setAddPcSheet(e.target.value);
                        const sheet = pcSheets.find(s => s.id === e.target.value);
                        if (sheet) { setAddName(sheet.handle); setAddHpMax(String(sheet.hp_max)); }
                      }}
                    >
                      <option value="">Select PC...</option>
                      {pcSheets.map(s => {
                        const u = allUsers.find(u => u.id === s.owner_id);
                        return <option key={s.id} value={s.id}>{s.handle} ({u?.handle ?? '?'})</option>;
                      })}
                    </select>
                  )}
                </div>
                <div className="add-participant-fields">
                  <input className="add-input" placeholder="Name" value={addName} onChange={e => setAddName(e.target.value)} />
                  <input className="add-input small" type="number" placeholder="INIT" value={addInitiative} onChange={e => setAddInitiative(e.target.value)} />
                  <input className="add-input small" type="number" placeholder="HP" value={addHpMax} onChange={e => setAddHpMax(e.target.value)} />
                  <input className="add-input" placeholder="Notes (opt.)" value={addNotes} onChange={e => setAddNotes(e.target.value)} />
                  <button className="add-btn" onClick={handleAddParticipant} disabled={!addName.trim()}>+ ADD</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
