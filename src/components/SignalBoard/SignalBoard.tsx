import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fireDeadDrop } from '../../lib/fireDeadDrop';
import type {
  MeshUser,
  GlitchType,
  DriftState,
  BlackwallTrap,
  DeadDrop,
  DeadDropDelivery,
  DeadDropTrigger,
  KiriHouCanvas,
  KiriHouEntry,
  KiriHouBodyRegion,
} from '../../types';
import './SignalBoard.css';

type SBTab = 'drift' | 'blackwall' | 'deaddrops' | 'kirihOU';

const AUTO_GLITCHES: Record<number, GlitchType[]> = {
  0: [],
  1: ['boot_anomaly'],
  2: ['boot_anomaly', 'search_metadata'],
  3: ['boot_anomaly', 'search_metadata', 'clock_drift'],
  4: ['boot_anomaly', 'search_metadata', 'clock_drift', 'chat_flicker'],
  5: ['boot_anomaly', 'search_metadata', 'clock_drift', 'chat_flicker', 'module_ghost'],
};

const ALL_GLITCHES: GlitchType[] = [
  'boot_anomaly', 'search_metadata', 'clock_drift', 'chat_flicker', 'module_ghost',
];

const BODY_REGIONS: KiriHouBodyRegion[] = [
  'head', 'eyes', 'spine', 'torso', 'left_arm', 'right_arm', 'hands', 'left_leg', 'right_leg',
];

const REGION_LABELS: Record<KiriHouBodyRegion, string> = {
  head: 'Head', eyes: 'Eyes', spine: 'Spine', torso: 'Torso',
  left_arm: 'Left Arm', right_arm: 'Right Arm', hands: 'Hands',
  left_leg: 'Left Leg', right_leg: 'Right Leg',
};

interface Props {
  user: MeshUser;
}

export function SignalBoard({ user }: Props) {
  const [tab, setTab] = useState<SBTab>('drift');

  if (!user.is_gm) return null;

  return (
    <div className="sb-module">
      <div className="sb-header">
        <span className="sb-title">◈ SIGNAL BOARD</span>
        <div className="sb-tabs">
          {(['drift', 'blackwall', 'deaddrops', 'kirihOU'] as SBTab[]).map(t => (
            <button
              key={t}
              className={`sb-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'drift' ? 'DRIFT' : t === 'blackwall' ? 'BLACKWALL' : t === 'deaddrops' ? 'DEAD DROPS' : 'KIRI HOU'}
            </button>
          ))}
        </div>
      </div>

      <div className="sb-body">
        {tab === 'drift'     && <DriftTab />}
        {tab === 'blackwall' && <BlackwallTab gmUser={user} />}
        {tab === 'deaddrops' && <DeadDropsTab gmUser={user} />}
        {tab === 'kirihOU'   && <KiriHouTab />}
      </div>
    </div>
  );
}

// ============================================================
// DRIFT TAB
// ============================================================

function DriftTab() {
  const [players, setPlayers] = useState<MeshUser[]>([]);
  const [driftMap, setDriftMap] = useState<Record<string, DriftState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('mesh_users')
      .select('*')
      .eq('is_gm', false)
      .then(({ data }) => setPlayers(data ?? []));

    supabase
      .from('mesh_drift_state')
      .select('*')
      .then(({ data }) => {
        const map: Record<string, DriftState> = {};
        for (const row of data ?? []) map[row.user_id] = row;
        setDriftMap(map);
      });
  }, []);

  async function saveDrift(userId: string, level: number, glitches: GlitchType[]) {
    setSaving(userId);
    await supabase.from('mesh_drift_state').upsert(
      { user_id: userId, drift_level: level, active_glitches: glitches, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    setDriftMap(prev => ({ ...prev, [userId]: { user_id: userId, drift_level: level, active_glitches: glitches } }));
    setSaving(null);
  }

  function resolveGlitches(level: number, manualExtras: GlitchType[]): GlitchType[] {
    const auto = AUTO_GLITCHES[level] ?? [];
    return Array.from(new Set([...auto, ...manualExtras]));
  }

  function getManualExtras(userId: string): GlitchType[] {
    const state = driftMap[userId];
    if (!state) return [];
    const auto = AUTO_GLITCHES[state.drift_level] ?? [];
    return state.active_glitches.filter(g => !auto.includes(g));
  }

  async function setLevel(userId: string, level: number) {
    const manualExtras = getManualExtras(userId);
    await saveDrift(userId, level, resolveGlitches(level, manualExtras));
  }

  async function addGlitch(userId: string, glitch: GlitchType) {
    const state = driftMap[userId] ?? { drift_level: 0, active_glitches: [] };
    const next = Array.from(new Set([...state.active_glitches, glitch]));
    await saveDrift(userId, state.drift_level, next);
  }

  async function clearManual(userId: string) {
    const state = driftMap[userId] ?? { drift_level: 0, active_glitches: [] };
    const auto = AUTO_GLITCHES[state.drift_level] ?? [];
    await saveDrift(userId, state.drift_level, [...auto]);
  }

  return (
    <div className="sb-drift">
      {players.length === 0 && <div className="sb-empty">No players found.</div>}
      {players.map(player => {
        const state = driftMap[player.id];
        const level = state?.drift_level ?? 0;
        const active = state?.active_glitches ?? [];
        const autoActive = AUTO_GLITCHES[level] ?? [];
        const isSaving = saving === player.id;

        return (
          <div key={player.id} className="sb-player-row">
            <div className="sb-player-header">
              <div>
                <span className="sb-player-handle">{player.handle}</span>
                <span className="sb-player-role">{player.role}</span>
              </div>
              <div className="sb-drift-controls">
                <button
                  className="sb-drift-btn"
                  disabled={level <= 0 || isSaving}
                  onClick={() => setLevel(player.id, level - 1)}
                >−</button>
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`sb-drift-level-btn${level === n ? ' active' : ''}`}
                    disabled={isSaving}
                    onClick={() => setLevel(player.id, n)}
                  >{n}</button>
                ))}
                <button
                  className="sb-drift-btn"
                  disabled={level >= 5 || isSaving}
                  onClick={() => setLevel(player.id, level + 1)}
                >+</button>
              </div>
            </div>

            <div className="sb-glitch-row">
              <span className="sb-glitch-label">ACTIVE GLITCHES:</span>
              {active.map(g => (
                <span key={g} className={`sb-glitch-tag${autoActive.includes(g) ? '' : ' manual'}`}>{g}</span>
              ))}
              <AddGlitchDropdown
                active={active}
                onAdd={g => addGlitch(player.id, g)}
              />
              <button className="sb-clear-btn" onClick={() => clearManual(player.id)}>CLEAR MANUAL</button>
            </div>

            <div className="sb-auto-note">
              Auto at level {level}: {autoActive.join(', ') || 'none'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddGlitchDropdown({ active, onAdd }: { active: GlitchType[]; onAdd: (g: GlitchType) => void }) {
  const [open, setOpen] = useState(false);
  const available = ALL_GLITCHES.filter(g => !active.includes(g));
  if (!available.length) return null;

  return (
    <div className="sb-glitch-add-wrap">
      <button className="sb-add-glitch-btn" onClick={() => setOpen(o => !o)}>[+ ADD]</button>
      {open && (
        <div className="sb-glitch-dropdown">
          {available.map(g => (
            <button key={g} className="sb-glitch-option" onClick={() => { onAdd(g); setOpen(false); }}>{g}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BLACKWALL TAB
// ============================================================

function BlackwallTab({ gmUser }: { gmUser: MeshUser }) {
  const [traps, setTraps] = useState<BlackwallTrap[]>([]);
  const [fireCounts, setFireCounts] = useState<Record<string, number>>({});
  const [keyword, setKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [corruption, setCorruption] = useState<1 | 2 | 3>(2);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: trapData } = await supabase
      .from('mesh_blackwall_traps')
      .select('*')
      .order('created_at', { ascending: false });
    setTraps(trapData ?? []);

    if (trapData?.length) {
      const { data: fires } = await supabase
        .from('mesh_blackwall_trap_fires')
        .select('trap_id');
      const counts: Record<string, number> = {};
      for (const f of fires ?? []) {
        counts[f.trap_id] = (counts[f.trap_id] ?? 0) + 1;
      }
      setFireCounts(counts);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleArmTrap(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('mesh_blackwall_traps').insert({
      created_by: gmUser.id,
      trigger_keyword: keyword.trim().toLowerCase(),
      title: title.trim(),
      body: body.trim(),
      corruption_level: corruption,
      is_armed: true,
    });
    setKeyword(''); setTitle(''); setBody(''); setCorruption(2);
    await load();
    setSaving(false);
  }

  async function reArmTrap(trap: BlackwallTrap) {
    await supabase.from('mesh_blackwall_traps').update({ is_armed: true }).eq('id', trap.id);
    await supabase.from('mesh_blackwall_trap_fires').delete().eq('trap_id', trap.id);
    await load();
  }

  async function deleteTrap(trap: BlackwallTrap) {
    await supabase.from('mesh_blackwall_traps').delete().eq('id', trap.id);
    setTraps(prev => prev.filter(t => t.id !== trap.id));
  }

  return (
    <div className="sb-blackwall">
      <form className="sb-bw-form" onSubmit={handleArmTrap}>
        <div className="sb-section-title">ARM NEW TRAP</div>
        <div className="sb-form-row">
          <input
            className="sb-input"
            placeholder="Trigger keyword"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            required
          />
          <input
            className="sb-input"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <textarea
          className="sb-input sb-textarea"
          placeholder="Body content..."
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={4}
          required
        />
        <div className="sb-form-row">
          <span className="sb-label">CORRUPTION:</span>
          {([1, 2, 3] as const).map(n => (
            <button
              key={n}
              type="button"
              className={`sb-corruption-btn${corruption === n ? ' active' : ''}`}
              onClick={() => setCorruption(n)}
            >{n}</button>
          ))}
          <button type="submit" className="sb-arm-btn" disabled={saving}>ARM TRAP</button>
        </div>
      </form>

      <div className="sb-trap-list">
        {traps.length === 0 && <div className="sb-empty">No traps armed.</div>}
        {traps.map(trap => (
          <div key={trap.id} className={`sb-trap-row${trap.is_armed ? '' : ' fired'}`}>
            <div className="sb-trap-info">
              <span className="sb-trap-keyword">{trap.trigger_keyword}</span>
              <span className="sb-trap-title">{trap.title}</span>
              <span className="sb-trap-corruption">CORRUPTION: {trap.corruption_level}</span>
            </div>
            <div className="sb-trap-status">
              <span className={`sb-trap-badge${trap.is_armed ? ' armed' : ' fired'}`}>
                {trap.is_armed ? 'ARMED' : `FIRED BY ${fireCounts[trap.id] ?? 0}`}
              </span>
              {!trap.is_armed && (
                <button className="sb-action-btn" onClick={() => reArmTrap(trap)}>RE-ARM</button>
              )}
              <button className="sb-action-btn danger" onClick={() => deleteTrap(trap)}>DELETE</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DEAD DROPS TAB
// ============================================================

function DeadDropsTab({ gmUser }: { gmUser: MeshUser }) {
  const [players, setPlayers] = useState<MeshUser[]>([]);
  const [drops, setDrops] = useState<DeadDrop[]>([]);
  const [targetId, setTargetId] = useState<string>('all');
  const [delivery, setDelivery] = useState<DeadDropDelivery>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [trigger, setTrigger] = useState<DeadDropTrigger>('manual');
  const [triggerDate, setTriggerDate] = useState('');
  const [triggerContentId, setTriggerContentId] = useState('');
  const [saving, setSaving] = useState(false);
  const firingRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_dead_drops')
      .select('*')
      .order('created_at', { ascending: false });
    setDrops(data ?? []);
  }, []);

  useEffect(() => {
    supabase.from('mesh_users').select('*').eq('is_gm', false)
      .then(({ data }) => setPlayers(data ?? []));
    load();
  }, [load]);

  // Date-triggered drop polling (60s interval)
  useEffect(() => {
    const check = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('mesh_dead_drops')
        .select('*')
        .eq('trigger_type', 'date')
        .eq('is_armed', true)
        .lte('trigger_date', now);

      for (const drop of data ?? []) {
        if (firingRef.current.has(drop.id)) continue;
        firingRef.current.add(drop.id);
        const targets = drop.target_user_id
          ? [drop.target_user_id]
          : players.map(p => p.id);
        for (const uid of targets) {
          await fireDeadDrop(drop, uid);
        }
        firingRef.current.delete(drop.id);
      }
      if ((data ?? []).length > 0) load();
    };

    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [players, load]);

  async function handleArmDrop(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('mesh_dead_drops').insert({
      created_by: gmUser.id,
      target_user_id: targetId === 'all' ? null : targetId,
      delivery_method: delivery,
      subject: subject.trim(),
      body: body.trim(),
      trigger_type: trigger,
      trigger_date: trigger === 'date' ? new Date(triggerDate).toISOString() : null,
      trigger_content_id: trigger === 'content_opened' ? triggerContentId.trim() : null,
      is_armed: true,
    });
    setSubject(''); setBody(''); setTriggerDate(''); setTriggerContentId('');
    await load();
    setSaving(false);
  }

  async function handleFire(drop: DeadDrop) {
    if (firingRef.current.has(drop.id)) return;
    firingRef.current.add(drop.id);
    const targets = drop.target_user_id
      ? [drop.target_user_id]
      : players.map(p => p.id);
    for (const uid of targets) {
      await fireDeadDrop(drop, uid);
    }
    firingRef.current.delete(drop.id);
    await load();
  }

  async function handleRearm(drop: DeadDrop) {
    await supabase.from('mesh_dead_drops').update({ is_armed: true, fired_at: null }).eq('id', drop.id);
    await load();
  }

  const targetName = (drop: DeadDrop) => {
    if (!drop.target_user_id) return 'ALL PLAYERS';
    return players.find(p => p.id === drop.target_user_id)?.handle ?? drop.target_user_id;
  };

  const triggerLabel = (drop: DeadDrop) => {
    if (drop.trigger_type === 'manual') return 'MANUAL';
    if (drop.trigger_type === 'date') return `DATE: ${drop.trigger_date ? new Date(drop.trigger_date).toLocaleString() : '?'}`;
    return `ON OPEN: ${drop.trigger_content_id ?? '?'}`;
  };

  return (
    <div className="sb-deaddrops">
      <form className="sb-dd-form" onSubmit={handleArmDrop}>
        <div className="sb-section-title">ARM NEW DROP</div>
        <div className="sb-form-row">
          <span className="sb-label">TARGET:</span>
          <select className="sb-select" value={targetId} onChange={e => setTargetId(e.target.value)}>
            <option value="all">ALL PLAYERS</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.handle}</option>)}
          </select>
          <span className="sb-label">DELIVERY:</span>
          {(['email', 'file', 'netsearch'] as DeadDropDelivery[]).map(d => (
            <button
              key={d}
              type="button"
              className={`sb-toggle-btn${delivery === d ? ' active' : ''}`}
              onClick={() => setDelivery(d)}
            >{d.toUpperCase()}</button>
          ))}
        </div>
        <input
          className="sb-input"
          placeholder={delivery === 'email' ? 'Subject' : delivery === 'file' ? 'Filename' : 'Result title'}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          required
        />
        <textarea
          className="sb-input sb-textarea"
          placeholder="Body..."
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={4}
          required
        />
        <div className="sb-form-row">
          <span className="sb-label">TRIGGER:</span>
          {(['manual', 'date', 'content_opened'] as DeadDropTrigger[]).map(t => (
            <button
              key={t}
              type="button"
              className={`sb-toggle-btn${trigger === t ? ' active' : ''}`}
              onClick={() => setTrigger(t)}
            >{t === 'content_opened' ? 'ON CONTENT OPEN' : t.toUpperCase()}</button>
          ))}
        </div>
        {trigger === 'date' && (
          <input
            className="sb-input"
            type="datetime-local"
            value={triggerDate}
            onChange={e => setTriggerDate(e.target.value)}
            required
          />
        )}
        {trigger === 'content_opened' && (
          <input
            className="sb-input"
            placeholder="Net content UUID"
            value={triggerContentId}
            onChange={e => setTriggerContentId(e.target.value)}
            required
          />
        )}
        <button type="submit" className="sb-arm-btn" disabled={saving}>ARM DROP</button>
      </form>

      <div className="sb-drop-list">
        {drops.length === 0 && <div className="sb-empty">No drops configured.</div>}
        {drops.map(drop => (
          <div key={drop.id} className={`sb-drop-row${drop.is_armed ? '' : ' fired'}`}>
            <div className="sb-drop-info">
              <span className="sb-drop-target">→ {targetName(drop)}</span>
              <span className="sb-drop-method">[{drop.delivery_method.toUpperCase()}]</span>
              <span className="sb-drop-trigger">{triggerLabel(drop)}</span>
              <span className={`sb-trap-badge${drop.is_armed ? ' armed' : ' fired'}`}>
                {drop.is_armed ? 'ARMED' : `FIRED: ${drop.fired_at ? new Date(drop.fired_at).toLocaleString() : '?'}`}
              </span>
            </div>
            <div className="sb-drop-subject">{drop.subject}</div>
            <div className="sb-drop-actions">
              {drop.is_armed && (
                <button className="sb-action-btn" onClick={() => handleFire(drop)}>FIRE NOW</button>
              )}
              {!drop.is_armed && (
                <button className="sb-action-btn" onClick={() => handleRearm(drop)}>RE-ARM</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// KIRI HOU TAB (GM view)
// ============================================================

function KiriHouTab() {
  const [players, setPlayers] = useState<MeshUser[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [canvas, setCanvas] = useState<KiriHouCanvas | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gmNote, setGmNote] = useState('');
  const [sealed, setSealed] = useState(false);
  const [driftUnlock, setDriftUnlock] = useState<string>('none');
  const [editClinic, setEditClinic] = useState('');
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);

  // New entry form for GM
  const [showGmForm, setShowGmForm] = useState(false);
  const [gmFormName, setGmFormName] = useState('');
  const [gmFormRegion, setGmFormRegion] = useState<KiriHouBodyRegion>('torso');
  const [gmFormDate, setGmFormDate] = useState('');
  const [gmFormClinic, setGmFormClinic] = useState('');
  const [gmFormCost, setGmFormCost] = useState('0');

  useEffect(() => {
    supabase.from('mesh_users').select('*').eq('is_gm', false)
      .then(({ data }) => {
        setPlayers(data ?? []);
        if (data?.length) setSelectedId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setCanvas(null);
    setEditingId(null);
    supabase.from('mesh_kiri_hou_canvas').select('*').eq('owner_id', selectedId).maybeSingle()
      .then(({ data }) => setCanvas(data ?? null));
  }, [selectedId]);

  function startEdit(entry: KiriHouEntry) {
    setEditingId(entry.id);
    setGmNote(entry.gm_note);
    setSealed(entry.gm_note_sealed);
    setDriftUnlock(entry.gm_note_drift_unlock !== null ? String(entry.gm_note_drift_unlock) : 'none');
    setEditClinic(entry.clinic_name);
    setEditDate(entry.install_date);
  }

  async function saveEdit(entryId: string) {
    if (!canvas) return;
    setSaving(true);
    const entries = canvas.entries.map(e => {
      if (e.id !== entryId) return e;
      return {
        ...e,
        gm_note: gmNote,
        gm_note_sealed: sealed,
        gm_note_drift_unlock: driftUnlock === 'none' ? null : parseInt(driftUnlock, 10),
        clinic_name: editClinic,
        install_date: editDate,
      };
    });
    await supabase.from('mesh_kiri_hou_canvas').update({ entries, updated_at: new Date().toISOString() }).eq('id', canvas.id);
    setCanvas(prev => prev ? { ...prev, entries } : prev);
    setEditingId(null);
    setSaving(false);
  }

  async function handleGmAddEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const newEntry: KiriHouEntry = {
      id: crypto.randomUUID(),
      cyberware_name: gmFormName.trim(),
      body_region: gmFormRegion,
      install_date: gmFormDate.trim(),
      clinic_name: gmFormClinic.trim(),
      humanity_cost: parseInt(gmFormCost, 10) || 0,
      gm_note: '',
      gm_note_sealed: false,
      gm_note_drift_unlock: null,
      player_note: '',
      created_at: new Date().toISOString(),
    };

    let currentCanvas = canvas;
    if (!currentCanvas) {
      const { data } = await supabase
        .from('mesh_kiri_hou_canvas')
        .insert({ owner_id: selectedId, entries: [newEntry] })
        .select().single();
      setCanvas(data);
    } else {
      const entries = [...currentCanvas.entries, newEntry];
      await supabase.from('mesh_kiri_hou_canvas').update({ entries, updated_at: new Date().toISOString() }).eq('id', currentCanvas.id);
      setCanvas({ ...currentCanvas, entries });
    }

    setShowGmForm(false);
    setGmFormName(''); setGmFormDate(''); setGmFormClinic(''); setGmFormCost('0');
    setSaving(false);
  }

  const entries = canvas?.entries ?? [];

  return (
    <div className="sb-kirihOU">
      <div className="sb-form-row">
        <span className="sb-label">PLAYER:</span>
        <select className="sb-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.handle}</option>)}
        </select>
      </div>

      {!canvas && selectedId && (
        <div className="sb-empty">No canvas record for this player.</div>
      )}

      <div className="sb-kiri-table">
        {entries.length > 0 && (
          <table className="sb-table">
            <thead>
              <tr>
                <th>CYBERWARE</th>
                <th>REGION</th>
                <th>HUM</th>
                <th>INSTALL DATE</th>
                <th>GM NOTE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <React.Fragment key={entry.id}>
                  <tr>
                    <td>{entry.cyberware_name}</td>
                    <td>{REGION_LABELS[entry.body_region]}</td>
                    <td>{entry.humanity_cost}</td>
                    <td>{entry.install_date || '—'}</td>
                    <td>
                      {entry.gm_note
                        ? (entry.gm_note_sealed ? '[SEALED]' : entry.gm_note.slice(0, 30) + (entry.gm_note.length > 30 ? '…' : ''))
                        : '—'}
                    </td>
                    <td>
                      <button className="sb-action-btn" onClick={() => startEdit(entry)}>EDIT</button>
                    </td>
                  </tr>
                  {editingId === entry.id && (
                    <tr className="sb-edit-row">
                      <td colSpan={6}>
                        <div className="sb-edit-form">
                          <textarea
                            className="sb-input"
                            placeholder="GM note..."
                            value={gmNote}
                            onChange={e => setGmNote(e.target.value)}
                            rows={3}
                          />
                          <div className="sb-form-row">
                            <label className="sb-check-label">
                              <input type="checkbox" checked={sealed} onChange={e => setSealed(e.target.checked)} />
                              SEALED
                            </label>
                            <span className="sb-label">DRIFT UNLOCK:</span>
                            <select className="sb-select" value={driftUnlock} onChange={e => setDriftUnlock(e.target.value)}>
                              <option value="none">None</option>
                              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Level {n}</option>)}
                            </select>
                            <input
                              className="sb-input"
                              placeholder="Clinic"
                              value={editClinic}
                              onChange={e => setEditClinic(e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <input
                              className="sb-input"
                              placeholder="Install date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <button className="sb-action-btn" onClick={() => saveEdit(entry.id)} disabled={saving}>SAVE</button>
                            <button className="sb-action-btn" onClick={() => setEditingId(null)}>CANCEL</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!showGmForm ? (
        <button className="sb-arm-btn" style={{ marginTop: '1rem' }} onClick={() => setShowGmForm(true)}>
          + ADD ENTRY FOR PLAYER
        </button>
      ) : (
        <form className="sb-dd-form" onSubmit={handleGmAddEntry} style={{ marginTop: '1rem' }}>
          <div className="sb-section-title">ADD CYBERWARE FOR {players.find(p => p.id === selectedId)?.handle ?? '?'}</div>
          <input className="sb-input" placeholder="Cyberware name" value={gmFormName} onChange={e => setGmFormName(e.target.value)} required />
          <div className="sb-form-row">
            <select className="sb-select" value={gmFormRegion} onChange={e => setGmFormRegion(e.target.value as KiriHouBodyRegion)}>
              {BODY_REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
            </select>
            <input className="sb-input" placeholder="Install date" value={gmFormDate} onChange={e => setGmFormDate(e.target.value)} />
            <input className="sb-input" placeholder="Clinic" value={gmFormClinic} onChange={e => setGmFormClinic(e.target.value)} />
            <input className="sb-input" type="number" min={0} placeholder="Humanity cost" value={gmFormCost} onChange={e => setGmFormCost(e.target.value)} />
          </div>
          <div className="sb-form-row">
            <button type="submit" className="sb-arm-btn" disabled={saving}>ADD</button>
            <button type="button" className="sb-action-btn" onClick={() => setShowGmForm(false)}>CANCEL</button>
          </div>
        </form>
      )}
    </div>
  );
}
