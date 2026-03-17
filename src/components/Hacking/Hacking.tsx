import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, HackSession, IceNode, PcSheet } from '../../types';
import './Hacking.css';

interface HackingModuleProps {
  user: MeshUser;
}

const ICE_TYPES = ['Killer', 'Skunk', 'Hellhound', 'Asp', 'Scorpion', 'Wisp'] as const;

// ─── Dice helpers ─────────────────────────────────────────────────────────

function d10(): number { return Math.floor(Math.random() * 10) + 1; }
function d6(): number  { return Math.floor(Math.random() * 6) + 1; }

// ─── Sub-components ───────────────────────────────────────────────────────

interface NetArchitectureProps {
  nodes: IceNode[];
  currentIndex: number;
  onAttemptBreach: (node: IceNode, index: number) => void;
  disabled: boolean;
  flatlined: boolean;
}

function NetArchitecture({ nodes, currentIndex, onAttemptBreach, disabled, flatlined }: NetArchitectureProps) {
  if (nodes.length === 0) {
    return <div className="hack-arch-empty">NO ARCHITECTURE DATA</div>;
  }

  return (
    <div className="hack-arch-scroll">
      <svg
        className="hack-arch-svg"
        width={nodes.length * 160 + 40}
        height={120}
        aria-label="Net Architecture"
      >
        {/* Connecting lines */}
        {nodes.map((_, i) => {
          if (i === nodes.length - 1) return null;
          const x1 = 20 + i * 160 + 130;
          const x2 = 20 + (i + 1) * 160;
          return (
            <line
              key={`line-${i}`}
              x1={x1} y1={60}
              x2={x2} y2={60}
              stroke="var(--primary-dim)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((node, i) => {
          const x = 20 + i * 160;
          const isCurrent = i === currentIndex && !flatlined;
          const color =
            node.status === 'breached' ? '#00cc44' :
            node.status === 'failed'   ? '#cc2222' :
            isCurrent                  ? 'var(--primary)' :
                                         'var(--primary-dim)';
          const canClick = node.status === 'locked' && i === currentIndex && !disabled && !flatlined;
          return (
            <g
              key={node.id}
              className={`hack-node-g ${canClick ? 'hack-node-clickable' : ''}`}
              onClick={canClick ? () => onAttemptBreach(node, i) : undefined}
              role={canClick ? 'button' : undefined}
              aria-label={canClick ? `Breach ${node.name}` : undefined}
            >
              <rect
                x={x} y={30}
                width={130} height={60}
                fill="var(--bg-light)"
                stroke={color}
                strokeWidth={isCurrent ? 2 : 1}
                filter={isCurrent ? 'url(#glow)' : undefined}
              />
              <text x={x + 65} y={52} textAnchor="middle" fill={color} fontSize="11" fontFamily="var(--font-mono)">
                {node.name}
              </text>
              <text x={x + 65} y={66} textAnchor="middle" fill={color} fontSize="10" fontFamily="var(--font-mono)" opacity="0.7">
                {node.type.toUpperCase()}
              </text>
              <text x={x + 65} y={80} textAnchor="middle" fill={color} fontSize="10" fontFamily="var(--font-mono)">
                {node.status === 'locked'   ? `DIFF: ${node.difficulty}` :
                 node.status === 'breached' ? '✓ BREACHED' :
                                              '✗ LOCKED'}
              </text>
            </g>
          );
        })}
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}

// ─── GM View ──────────────────────────────────────────────────────────────

interface GmViewProps {
  user: MeshUser;
  sessions: HackSession[];
  allUsers: MeshUser[];
  onRefresh: () => void;
}

interface PendingNode {
  tempId: string;
  name: string;
  difficulty: number;
  type: string;
}

function GmView({ user, sessions, allUsers, onRefresh }: GmViewProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [sessionName, setSessionName] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [pendingNodes, setPendingNodes] = useState<PendingNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addNode = () => {
    setPendingNodes(prev => [
      ...prev,
      { tempId: crypto.randomUUID(), name: 'WATCHDOG', difficulty: 2, type: 'Killer' },
    ]);
  };

  const updateNode = (tempId: string, field: keyof Omit<PendingNode, 'tempId'>, value: string | number) => {
    setPendingNodes(prev => prev.map(n => n.tempId === tempId ? { ...n, [field]: value } : n));
  };

  const removeNode = (tempId: string) => {
    setPendingNodes(prev => prev.filter(n => n.tempId !== tempId));
  };

  const moveNode = (tempId: string, dir: -1 | 1) => {
    setPendingNodes(prev => {
      const idx = prev.findIndex(n => n.tempId === tempId);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const handleCreate = async () => {
    if (!sessionName.trim()) { setError('Session name required.'); return; }
    if (pendingNodes.length === 0) { setError('Add at least one ICE node.'); return; }
    setSaving(true);
    setError('');

    const architecture: IceNode[] = pendingNodes.map(n => ({
      id: crypto.randomUUID(),
      name: n.name.trim() || 'UNNAMED',
      difficulty: n.difficulty,
      type: n.type,
      status: 'locked' as const,
    }));

    const { error: dbErr } = await supabase.from('mesh_hack_sessions').insert({
      created_by: user.id,
      assigned_to: assignTo || null,
      name: sessionName.trim(),
      architecture,
      status: 'pending',
      current_node_index: 0,
    });

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }

    setSessionName('');
    setPendingNodes([]);
    setAssignTo('');
    setView('list');
    onRefresh();
  };

  const handleStartRun = async (session: HackSession) => {
    await supabase.from('mesh_hack_sessions')
      .update({ status: 'active' })
      .eq('id', session.id);
    onRefresh();
  };

  const handleDelete = async (session: HackSession) => {
    await supabase.from('mesh_hack_sessions').delete().eq('id', session.id);
    onRefresh();
  };

  const players = allUsers.filter(u => !u.is_gm);

  if (view === 'create') {
    return (
      <div className="hack-gm-create">
        <div className="hack-form-header">
          <span>CREATE HACK SESSION</span>
          <button className="hack-back-btn" onClick={() => setView('list')}>← BACK</button>
        </div>

        <div className="hack-field">
          <label className="hack-label">SESSION NAME</label>
          <input
            className="hack-input"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            placeholder="e.g. Arasaka Data Heist"
          />
        </div>

        <div className="hack-field">
          <label className="hack-label">ASSIGN TO PLAYER</label>
          <select className="hack-select" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
            <option value="">— Unassigned —</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.handle} ({p.role})</option>
            ))}
          </select>
        </div>

        <div className="hack-field">
          <div className="hack-nodes-header">
            <label className="hack-label">ICE ARCHITECTURE</label>
            <button className="hack-add-node-btn" onClick={addNode}>+ ADD NODE</button>
          </div>
          {pendingNodes.length === 0 && (
            <div className="hack-nodes-empty">No nodes — add some ICE above.</div>
          )}
          {pendingNodes.map((node, idx) => (
            <div key={node.tempId} className="hack-node-editor">
              <div className="hack-node-controls">
                <button className="hack-node-move-btn" onClick={() => moveNode(node.tempId, -1)} disabled={idx === 0}>↑</button>
                <button className="hack-node-move-btn" onClick={() => moveNode(node.tempId, 1)} disabled={idx === pendingNodes.length - 1}>↓</button>
                <button className="hack-node-del-btn" onClick={() => removeNode(node.tempId)}>✕</button>
              </div>
              <input
                className="hack-input hack-node-name"
                value={node.name}
                onChange={e => updateNode(node.tempId, 'name', e.target.value)}
                placeholder="Node name"
              />
              <select
                className="hack-select hack-node-type"
                value={node.type}
                onChange={e => updateNode(node.tempId, 'type', e.target.value)}
              >
                {ICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="hack-difficulty-row">
                <label className="hack-label-inline">DIFF</label>
                <input
                  type="number" min={1} max={5}
                  className="hack-input hack-diff-input"
                  value={node.difficulty}
                  onChange={e => updateNode(node.tempId, 'difficulty', Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <div className="hack-error">{error}</div>}

        <button
          className="hack-create-btn"
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? 'UPLOADING...' : 'CREATE SESSION'}
        </button>
      </div>
    );
  }

  // List view
  return (
    <div className="hack-gm-list">
      <div className="hack-list-header">
        <span className="hack-list-title">HACK SESSIONS</span>
        <button className="hack-new-btn" onClick={() => setView('create')}>+ NEW SESSION</button>
      </div>

      {sessions.length === 0 ? (
        <div className="hack-empty">No sessions yet. Create one to get started.</div>
      ) : (
        <div className="hack-sessions-table">
          {sessions.map(s => {
            const assignedUser = allUsers.find(u => u.id === s.assigned_to);
            const breachedCount = (s.architecture as IceNode[]).filter(n => n.status === 'breached').length;
            return (
              <div key={s.id} className={`hack-session-row hack-status-${s.status}`}>
                <div className="hack-session-info">
                  <span className="hack-session-name">{s.name}</span>
                  <span className={`hack-session-status hack-status-badge-${s.status}`}>{s.status.toUpperCase()}</span>
                  <span className="hack-session-meta">
                    {assignedUser ? `→ ${assignedUser.handle}` : 'Unassigned'}
                    {' · '}
                    {breachedCount}/{s.architecture.length} nodes
                  </span>
                </div>
                <div className="hack-session-actions">
                  {s.status === 'pending' && (
                    <button className="hack-action-btn start" onClick={() => handleStartRun(s)}>▸ START RUN</button>
                  )}
                  <button className="hack-action-btn delete" onClick={() => handleDelete(s)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Player View ──────────────────────────────────────────────────────────

interface PlayerViewProps {
  session: HackSession;
  user: MeshUser;
  pcSheet: PcSheet | null;
}

interface BreachLog {
  text: string;
  success: boolean;
}

function PlayerView({ session, user, pcSheet }: PlayerViewProps) {
  const [sessionHp, setSessionHp] = useState<number | null>(null);
  const [breachLog, setBreachLog] = useState<BreachLog[]>([]);
  const [rolling, setRolling] = useState(false);
  const [currentArch, setCurrentArch] = useState<IceNode[]>(session.architecture);
  const [currentIndex, setCurrentIndex] = useState(session.current_node_index);
  const [sessionStatus, setSessionStatus] = useState(session.status);

  // Initialise HP from pcSheet on mount
  useEffect(() => {
    if (pcSheet !== null) {
      setSessionHp(pcSheet.hp_current);
    }
  }, [pcSheet]);

  // Keep in sync with realtime updates
  useEffect(() => {
    setCurrentArch(session.architecture);
    setCurrentIndex(session.current_node_index);
    setSessionStatus(session.status);
  }, [session]);

  const addLog = (text: string, success: boolean) => {
    setBreachLog(prev => [{ text, success }, ...prev].slice(0, 30));
  };

  const handleBreach = async (node: IceNode, nodeIdx: number) => {
    if (rolling || sessionHp === null || sessionHp <= 0) return;

    setRolling(true);

    const interfaceStat = pcSheet?.stat_int ?? 4; // default 4 if no sheet
    const roll = d10();
    const total = roll + interfaceStat;
    const threshold = node.difficulty * 4;
    const success = total >= threshold;

    addLog(
      `BREACH ${node.name.toUpperCase()}: d10(${roll}) + INT(${interfaceStat}) = ${total} vs ${threshold} — ${success ? 'SUCCESS' : 'FAILURE'}`,
      success
    );

    const updatedArch = currentArch.map((n, i) =>
      i === nodeIdx ? { ...n, status: success ? 'breached' as const : 'failed' as const } : n
    );

    let newStatus = sessionStatus as HackSession['status'];
    let newIndex = currentIndex;
    let newHp = sessionHp;

    if (success) {
      newIndex = nodeIdx + 1;
      if (newIndex >= updatedArch.length) {
        newStatus = 'complete';
        addLog('>> ALL NODES BREACHED. ACCESS GRANTED. JACKING OUT.', true);
      }
    } else {
      // Damage
      const dmg = d6();
      newHp = Math.max(0, sessionHp - dmg);
      setSessionHp(newHp);
      addLog(`>> COUNTERATTACK: -${dmg} HP (${newHp} remaining)`, false);

      if (newHp <= 0) {
        newStatus = 'flatlined';
        addLog('>> FLATLINE. RUNNER DOWN.', false);
      }
      // On failure, node stays locked but index advances (can't retry — standard CPR rules)
      newIndex = nodeIdx + 1;
      if (newIndex >= updatedArch.length && newStatus !== 'flatlined') {
        newStatus = 'complete';
      }
    }

    setCurrentArch(updatedArch);
    setCurrentIndex(newIndex);
    setSessionStatus(newStatus);

    // Persist to DB
    await supabase.from('mesh_hack_sessions').update({
      architecture: updatedArch,
      current_node_index: newIndex,
      status: newStatus,
    }).eq('id', session.id);

    // Update pc_sheet HP if it changed
    if (!success && pcSheet) {
      await supabase.from('mesh_pc_sheets').update({ hp_current: newHp }).eq('owner_id', user.id);
    }

    setRolling(false);
  };

  const hpMax = pcSheet?.hp_max ?? 40;
  const hpPct = sessionHp !== null ? (sessionHp / hpMax) * 100 : 100;
  const interfaceStat = pcSheet?.stat_int ?? '?';

  return (
    <div className="hack-player-view">
      {/* Status banner */}
      {sessionStatus === 'flatlined' && (
        <div className="hack-flatline-banner">
          ██ FLATLINE — RUNNER DOWN ██
        </div>
      )}
      {sessionStatus === 'complete' && (
        <div className="hack-complete-banner">
          ✓ RUN COMPLETE — JACKED OUT CLEAN
        </div>
      )}

      <div className="hack-player-header">
        <div className="hack-run-name">{session.name.toUpperCase()}</div>
        <div className="hack-player-stats">
          <span className="hack-stat">INT: {interfaceStat}</span>
          <div className="hack-hp-bar-wrap">
            <span className="hack-stat">HP</span>
            <div className="hack-hp-bar">
              <div
                className="hack-hp-fill"
                style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'var(--primary)' : hpPct > 25 ? '#ffb000' : '#cc2222' }}
              />
            </div>
            <span className="hack-stat">{sessionHp ?? '?'}/{hpMax}</span>
          </div>
        </div>
      </div>

      <div className="hack-arch-label">// NET ARCHITECTURE //</div>
      <NetArchitecture
        nodes={currentArch}
        currentIndex={currentIndex}
        onAttemptBreach={handleBreach}
        disabled={rolling || sessionStatus !== 'active'}
        flatlined={sessionStatus === 'flatlined'}
      />

      {sessionStatus === 'active' && currentIndex < currentArch.length && (
        <div className="hack-breach-hint">
          Click the highlighted node to attempt breach.
        </div>
      )}

      {/* Breach log */}
      {breachLog.length > 0 && (
        <div className="hack-breach-log">
          <div className="hack-log-label">// BREACH LOG //</div>
          {breachLog.map((entry, i) => (
            <div key={i} className={`hack-log-line ${entry.success ? 'log-success' : 'log-fail'}`}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────

export function HackingModule({ user }: HackingModuleProps) {
  const [sessions, setSessions] = useState<HackSession[]>([]);
  const [allUsers, setAllUsers] = useState<MeshUser[]>([]);
  const [pcSheet, setPcSheet] = useState<PcSheet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_hack_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSessions(data as HackSession[]);
  }, []);

  const fetchAllUsers = useCallback(async () => {
    const { data } = await supabase.from('mesh_users').select('*');
    if (data) setAllUsers(data as MeshUser[]);
  }, []);

  const fetchPcSheet = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_pc_sheets')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (data) setPcSheet(data as PcSheet);
  }, [user.id]);

  useEffect(() => {
    Promise.all([fetchSessions(), fetchAllUsers(), fetchPcSheet()])
      .finally(() => setLoading(false));
  }, [fetchSessions, fetchAllUsers, fetchPcSheet]);

  useRealtime({
    table: 'mesh_hack_sessions',
    onInsert: () => fetchSessions(),
    onUpdate: () => fetchSessions(),
    onDelete: () => fetchSessions(),
  });

  if (loading) {
    return <div className="hack-loading">Initialising NET interface<span className="hack-blink">_</span></div>;
  }

  // Player: show their active session if one exists
  if (!user.is_gm) {
    const activeSession = sessions.find(
      s => s.assigned_to === user.id && (s.status === 'active' || s.status === 'complete' || s.status === 'flatlined')
    );

    if (!activeSession) {
      const pendingSession = sessions.find(s => s.assigned_to === user.id && s.status === 'pending');
      return (
        <div className="hack-player-wait">
          <div className="hack-wait-icon">◉</div>
          {pendingSession ? (
            <>
              <div className="hack-wait-title">SESSION QUEUED: {pendingSession.name.toUpperCase()}</div>
              <div className="hack-wait-sub">Waiting for GM to start the run...</div>
            </>
          ) : (
            <>
              <div className="hack-wait-title">NO ACTIVE RUN</div>
              <div className="hack-wait-sub">Waiting for GM to assign a hack session...</div>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="hack-module">
        <PlayerView session={activeSession} user={user} pcSheet={pcSheet} />
      </div>
    );
  }

  // GM view
  return (
    <div className="hack-module">
      <GmView
        user={user}
        sessions={sessions}
        allUsers={allUsers}
        onRefresh={fetchSessions}
      />
    </div>
  );
}
