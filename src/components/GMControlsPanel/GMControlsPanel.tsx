import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { SignalBars } from '../SignalBars/SignalBars';
import type { MeshUser } from '../../types';

interface GMControlsPanelProps {
  user: MeshUser;
}

interface GhostSignalRow {
  id: string;
  content: string;
  active: boolean;
  created_at: string;
}

export function GMControlsPanel({ user }: GMControlsPanelProps) {
  if (!user.is_gm) return null;

  return <GMControlsPanelInner />;
}

// Inner component so hooks only run when is_gm is true
function GMControlsPanelInner() {
  // Signal strength
  const [signalStrength, setSignalStrength] = useState<number>(4);
  const [settingSignal, setSettingSignal]   = useState(false);

  // Ghost signals
  const [ghostSignals, setGhostSignals]               = useState<GhostSignalRow[]>([]);
  const [newGhostContent, setNewGhostContent]         = useState('');
  const [creatingGhost, setCreatingGhost]             = useState(false);
  const [ghostError, setGhostError]                   = useState('');
  const [togglingGhost, setTogglingGhost]             = useState<string | null>(null);

  // In-game date / time
  const [dateInput, setDateInput]       = useState('2046-01-17');
  const [timeInput, setTimeInput]       = useState('14:32');
  const [settingDate, setSettingDate]   = useState(false);
  const [settingTime, setSettingTime]   = useState(false);
  const [clockMsg, setClockMsg]         = useState('');

  // ── Fetch helpers ────────────────────────────────────────────────────────

  const fetchSignalStrength = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_config')
      .select('value')
      .eq('key', 'signal_strength')
      .maybeSingle();
    if (data) {
      const n = parseInt(data.value as string, 10);
      if (!isNaN(n)) setSignalStrength(n);
    }
  }, []);

  const fetchGhostSignals = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_ghost_signals')
      .select('*')
      .order('created_at', { ascending: false });
    setGhostSignals((data as GhostSignalRow[]) || []);
  }, []);

  const fetchClock = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_config')
      .select('key, value')
      .in('key', ['ingame_date', 'ingame_time']);
    data?.forEach(row => {
      if (row.key === 'ingame_date') setDateInput(row.value as string);
      if (row.key === 'ingame_time') setTimeInput(row.value as string);
    });
  }, []);

  useEffect(() => {
    fetchSignalStrength();
    fetchGhostSignals();
    fetchClock();
  }, [fetchSignalStrength, fetchGhostSignals, fetchClock]);

  // ── Signal strength ──────────────────────────────────────────────────────

  const handleSetSignal = async (level: number) => {
    setSettingSignal(true);
    await supabase
      .from('mesh_config')
      .update({ value: String(level) })
      .eq('key', 'signal_strength');
    setSignalStrength(level);
    setSettingSignal(false);
  };

  // ── Ghost signals ────────────────────────────────────────────────────────

  const handleCreateGhostSignal = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGhostContent.trim()) return;
    setGhostError('');
    setCreatingGhost(true);
    const { error } = await supabase.from('mesh_ghost_signals').insert({
      content: newGhostContent.trim(),
      active: true,
    });
    if (error) {
      setGhostError(`[DB] ${error.message}`);
    } else {
      setNewGhostContent('');
      fetchGhostSignals();
    }
    setCreatingGhost(false);
  };

  const toggleGhostSignal = async (gs: GhostSignalRow) => {
    setTogglingGhost(gs.id);
    await supabase
      .from('mesh_ghost_signals')
      .update({ active: !gs.active })
      .eq('id', gs.id);
    await fetchGhostSignals();
    setTogglingGhost(null);
  };

  // ── In-game clock ────────────────────────────────────────────────────────

  const handleSetDate = async () => {
    if (!dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setClockMsg('[ERR] Date must be YYYY-MM-DD');
      return;
    }
    setSettingDate(true);
    setClockMsg('');
    await supabase
      .from('mesh_config')
      .update({ value: dateInput })
      .eq('key', 'ingame_date');
    setClockMsg('Date set.');
    setSettingDate(false);
  };

  const handleSetTime = async () => {
    if (!timeInput.match(/^\d{2}:\d{2}$/)) {
      setClockMsg('[ERR] Time must be HH:MM');
      return;
    }
    setSettingTime(true);
    setClockMsg('');
    await supabase
      .from('mesh_config')
      .update({ value: timeInput })
      .eq('key', 'ingame_time');
    setClockMsg('Time set.');
    setSettingTime(false);
  };

  const handleAddDay = async () => {
    if (settingDate) return;
    // Parse, increment, write back
    const parts = dateInput.split('-');
    if (parts.length < 3) return;
    const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`);
    if (isNaN(d.getTime())) return;
    d.setUTCDate(d.getUTCDate() + 1);
    const newDate =
      `${d.getUTCFullYear()}-` +
      `${String(d.getUTCMonth() + 1).padStart(2, '0')}-` +
      `${String(d.getUTCDate()).padStart(2, '0')}`;
    setDateInput(newDate);
    setClockMsg('');
    setSettingDate(true);
    await supabase
      .from('mesh_config')
      .update({ value: newDate })
      .eq('key', 'ingame_date');
    setClockMsg('+1 day set.');
    setSettingDate(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <FloatingPanel
      id="gm-controls"
      title="GM CONTROLS"
      icon="⚙"
      defaultRight={16}
      defaultBottom={60}
      collapsedByDefault={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '11px' }}>

        {/* ── Signal strength ── */}
        <div>
          <div style={{ color: 'var(--primary-dim)', letterSpacing: '1px', marginBottom: '6px' }}>SIGNAL STRENGTH</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {([0, 1, 2, 3, 4] as const).map(level => (
              <button
                key={level}
                className={`signal-control-btn${signalStrength === level ? ' signal-control-btn--active' : ''}`}
                onClick={() => handleSetSignal(level)}
                disabled={settingSignal || signalStrength === level}
                title={level === 0 ? 'No signal' : `Signal ${level}/4`}
              >
                {level === 0 ? '✕' : level}
              </button>
            ))}
            <SignalBars strength={signalStrength} />
          </div>
        </div>

        {/* ── In-game clock ── */}
        <div>
          <div style={{ color: 'var(--primary-dim)', letterSpacing: '1px', marginBottom: '6px' }}>IN-GAME CLOCK</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <input
              type="text"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{ width: '100px', fontSize: '11px' }}
            />
            <button onClick={handleSetDate} disabled={settingDate} style={{ fontSize: '11px' }}>
              {settingDate ? '...' : '[ SET ]'}
            </button>
            <button onClick={handleAddDay} disabled={settingDate} style={{ fontSize: '11px' }}>
              {settingDate ? '...' : '[ +1 DAY ]'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="text"
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              placeholder="HH:MM"
              style={{ width: '60px', fontSize: '11px' }}
            />
            <button onClick={handleSetTime} disabled={settingTime} style={{ fontSize: '11px' }}>
              {settingTime ? '...' : '[ SET ]'}
            </button>
          </div>

          {clockMsg && (
            <div style={{ marginTop: '4px', color: clockMsg.startsWith('[ERR]') ? '#ff6666' : 'var(--primary-dim)' }}>
              {clockMsg}
            </div>
          )}
        </div>

        {/* ── Ghost signals ── */}
        <div>
          <div style={{ color: 'var(--primary-dim)', letterSpacing: '1px', marginBottom: '6px' }}>GHOST SIGNALS</div>

          {ghostSignals.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              {ghostSignals.map(gs => (
                <div key={gs.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: gs.active ? 1 : 0.5 }}>
                  <span style={{ flex: 1, color: 'var(--primary)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {gs.content}
                  </span>
                  <span style={{ fontSize: '9px', color: gs.active ? 'var(--primary)' : 'var(--primary-dim)', letterSpacing: '1px', flexShrink: 0 }}>
                    {gs.active ? 'ON' : 'OFF'}
                  </span>
                  <button
                    onClick={() => toggleGhostSignal(gs)}
                    disabled={togglingGhost === gs.id}
                    style={{ fontSize: '10px', flexShrink: 0 }}
                  >
                    {gs.active ? 'DEACTIVATE' : 'ACTIVATE'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleCreateGhostSignal} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <textarea
              value={newGhostContent}
              onChange={e => setNewGhostContent(e.target.value)}
              placeholder="Fragment text to broadcast..."
              rows={2}
              disabled={creatingGhost}
              style={{ fontSize: '11px', resize: 'vertical' }}
            />
            {ghostError && <div style={{ color: '#ff6666', fontSize: '10px' }}>{ghostError}</div>}
            <button type="submit" disabled={creatingGhost || !newGhostContent.trim()} style={{ fontSize: '11px' }}>
              {creatingGhost ? 'BROADCASTING...' : '[ BROADCAST FRAGMENT ]'}
            </button>
          </form>
        </div>

      </div>
    </FloatingPanel>
  );
}
