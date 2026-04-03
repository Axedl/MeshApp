import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { KiriHouBodyDiagram } from './KiriHouBodyDiagram';
import type { KiriHouCanvas as KiriHouCanvasType, KiriHouEntry, KiriHouBodyRegion, MeshUser } from '../../types';
import './KiriHouCanvas.css';

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

export function KiriHouCanvas({ user }: Props) {
  const [canvas, setCanvas] = useState<KiriHouCanvasType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New entry form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRegion, setFormRegion] = useState<KiriHouBodyRegion>('torso');
  const [formDate, setFormDate] = useState('');
  const [formClinic, setFormClinic] = useState('');
  const [formCost, setFormCost] = useState('0');
  const [formNote, setFormNote] = useState('');

  // Drift-based sealed note unlocks — keyed by entry id
  const [unlockedByDrift, setUnlockedByDrift] = useState<Set<string>>(new Set());

  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadCanvas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mesh_kiri_hou_canvas')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    setCanvas(data ?? null);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { loadCanvas(); }, [loadCanvas]);

  // Check drift-based unlocks for sealed notes after canvas loads
  useEffect(() => {
    if (!canvas?.entries.length) return;
    const sealedWithThreshold = canvas.entries.filter(
      e => e.gm_note_sealed && e.gm_note_drift_unlock !== null
    );
    if (!sealedWithThreshold.length) return;

    Promise.all(
      sealedWithThreshold.map(async (entry) => {
        const { data } = await supabase.rpc('get_my_drift_unlock_status', {
          p_canvas_owner_id: user.id,
          p_entry_id: entry.id,
        });
        return { id: entry.id, unlock: !!data };
      })
    ).then(results => {
      setUnlockedByDrift(new Set(results.filter(r => r.unlock).map(r => r.id)));
    });
  }, [canvas, user.id]);

  async function ensureCanvas(): Promise<KiriHouCanvasType> {
    if (canvas) return canvas;
    const { data } = await supabase
      .from('mesh_kiri_hou_canvas')
      .insert({ owner_id: user.id, entries: [] })
      .select()
      .single();
    setCanvas(data);
    return data;
  }

  async function saveEntries(entries: KiriHouEntry[]) {
    setSaving(true);
    const c = await ensureCanvas();
    await supabase
      .from('mesh_kiri_hou_canvas')
      .update({ entries, updated_at: new Date().toISOString() })
      .eq('id', c.id);
    setCanvas(prev => prev ? { ...prev, entries } : prev);
    setSaving(false);
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const newEntry: KiriHouEntry = {
      id: crypto.randomUUID(),
      cyberware_name: formName.trim(),
      body_region: formRegion,
      install_date: formDate.trim(),
      clinic_name: formClinic.trim(),
      humanity_cost: parseInt(formCost, 10) || 0,
      gm_note: '',
      gm_note_sealed: false,
      gm_note_drift_unlock: null,
      player_note: formNote.trim(),
      created_at: new Date().toISOString(),
    };
    const existing = canvas?.entries ?? [];
    await saveEntries([...existing, newEntry]);
    setShowForm(false);
    setFormName(''); setFormDate(''); setFormClinic(''); setFormCost('0'); setFormNote('');
  }

  async function handlePlayerNoteBlur(entryId: string, value: string) {
    if (!canvas) return;
    const entries = canvas.entries.map(e =>
      e.id === entryId ? { ...e, player_note: value } : e
    );
    await saveEntries(entries);
  }

  async function handleUnlockSeal(entryId: string) {
    if (!canvas) return;
    const entries = canvas.entries.map(e =>
      e.id === entryId ? { ...e, gm_note_sealed: false } : e
    );
    await saveEntries(entries);
  }

  function scrollToEntry(region: KiriHouBodyRegion) {
    const entry = canvas?.entries.find(e => e.body_region === region);
    if (entry && entryRefs.current[entry.id]) {
      entryRefs.current[entry.id]!.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (loading) {
    return <div className="kiri-module"><div className="kiri-loading">LOADING KIRI HOU...</div></div>;
  }

  const entries = canvas?.entries ?? [];

  return (
    <div className="kiri-module">
      <div className="kiri-header">
        <span className="kiri-title">◎ KIRI HOU — CYBERWARE RECORD</span>
        {saving && <span className="kiri-saving">SAVING...</span>}
      </div>

      <div className="kiri-body">
        {/* Left: body diagram */}
        <div className="kiri-diagram-col">
          <KiriHouBodyDiagram entries={entries} onRegionClick={scrollToEntry} />
          <div className="kiri-legend">
            <span className="kiri-legend-dot" style={{ color: 'var(--primary-dim)' }}>●</span> LOW
            <span className="kiri-legend-dot" style={{ color: '#ffb000' }}>●</span> MED
            <span className="kiri-legend-dot" style={{ color: '#cc2222' }}>●</span> HIGH
          </div>
        </div>

        {/* Right: entries list */}
        <div className="kiri-entries-col">
          {entries.length === 0 && (
            <div className="kiri-empty">NO CYBERWARE ON RECORD</div>
          )}

          {entries.map(entry => {
            const driftUnlocked = unlockedByDrift.has(entry.id);
            const showGmNote = !entry.gm_note_sealed || driftUnlocked;

            return (
              <div
                key={entry.id}
                className="kiri-entry"
                ref={el => { entryRefs.current[entry.id] = el; }}
              >
                <div className="kiri-entry-header">
                  <span className="kiri-entry-name">{entry.cyberware_name}</span>
                  <span className="kiri-entry-hum">{entry.humanity_cost} HUM</span>
                </div>
                <div className="kiri-entry-meta">
                  {REGION_LABELS[entry.body_region]}
                  {entry.clinic_name ? ` · ${entry.clinic_name}` : ''}
                  {entry.install_date ? ` · ${entry.install_date}` : ''}
                </div>
                <div className="kiri-entry-divider" />

                <div className="kiri-entry-player-note">
                  <textarea
                    className="kiri-note-input"
                    defaultValue={entry.player_note}
                    placeholder="[ your notes ]"
                    rows={2}
                    onBlur={e => handlePlayerNoteBlur(entry.id, e.target.value)}
                  />
                </div>

                {entry.gm_note && (
                  <div className="kiri-entry-gm-note">
                    {showGmNote ? (
                      <span className="kiri-gm-note-text">{entry.gm_note}</span>
                    ) : (
                      <button
                        className="kiri-sealed-btn"
                        onClick={() => handleUnlockSeal(entry.id)}
                      >
                        [ SEALED NOTE — PRESS TO UNLOCK ]
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add entry form toggle */}
          {!showForm ? (
            <button className="kiri-add-btn" onClick={() => setShowForm(true)}>
              + LOG NEW CYBERWARE
            </button>
          ) : (
            <form className="kiri-form" onSubmit={handleAddEntry}>
              <div className="kiri-form-title">NEW INSTALL</div>
              <input
                className="kiri-form-input"
                placeholder="Cyberware name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
              />
              <select
                className="kiri-form-input"
                value={formRegion}
                onChange={e => setFormRegion(e.target.value as KiriHouBodyRegion)}
              >
                {BODY_REGIONS.map(r => (
                  <option key={r} value={r}>{REGION_LABELS[r]}</option>
                ))}
              </select>
              <input
                className="kiri-form-input"
                placeholder="Install date (e.g. 12 Jan 2046)"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
              />
              <input
                className="kiri-form-input"
                placeholder="Clinic / location"
                value={formClinic}
                onChange={e => setFormClinic(e.target.value)}
              />
              <input
                className="kiri-form-input"
                placeholder="Humanity cost"
                type="number"
                min={0}
                value={formCost}
                onChange={e => setFormCost(e.target.value)}
              />
              <textarea
                className="kiri-form-input"
                placeholder="Your notes (optional)"
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                rows={3}
              />
              <div className="kiri-form-actions">
                <button type="submit" className="kiri-form-save">LOG INSTALL</button>
                <button type="button" className="kiri-form-cancel" onClick={() => setShowForm(false)}>CANCEL</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
