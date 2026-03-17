import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, PcSheet } from '../../types';
import './CharacterSheet.css';

interface CharacterSheetModuleProps {
  user: MeshUser;
}

type SheetTab = 'stats' | 'skills' | 'cyberware' | 'weapons' | 'notes';

interface SkillEntry  { name: string; level: number; stat: string }
interface CyberEntry  { name: string; humanity_cost: number; notes: string }
interface WeaponEntry { name: string; damage: string; rof: number; notes: string }
interface GearEntry   { name: string; notes: string }

const WOUND_LABELS = ['UNINJURED', 'LIGHTLY WOUNDED', 'SERIOUSLY WOUNDED', 'CRITICALLY WOUNDED', 'MORTALLY WOUNDED', 'DEAD'];
const WOUND_CLASSES = ['wound-ok', 'wound-light', 'wound-serious', 'wound-critical', 'wound-mortal', 'wound-dead'];

const STAT_KEYS: { key: keyof PcSheet; label: string }[] = [
  { key: 'stat_int',  label: 'INT' },
  { key: 'stat_ref',  label: 'REF' },
  { key: 'stat_dex',  label: 'DEX' },
  { key: 'stat_tech', label: 'TECH' },
  { key: 'stat_cool', label: 'COOL' },
  { key: 'stat_will', label: 'WILL' },
  { key: 'stat_luck', label: 'LUCK' },
  { key: 'stat_move', label: 'MOVE' },
  { key: 'stat_body', label: 'BODY' },
  { key: 'stat_emp',  label: 'EMP' },
];

export function CharacterSheetModule({ user }: CharacterSheetModuleProps) {
  const [sheet, setSheet] = useState<PcSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SheetTab>('stats');
  const [dirty, setDirty] = useState(false);

  // GM state
  const [allSheets, setAllSheets] = useState<(PcSheet & { owner_handle?: string })[]>([]);
  const [gmSelectedId, setGmSelectedId] = useState<string | null>(null);
  const gmViewedSheet = user.is_gm && gmSelectedId
    ? allSheets.find(s => s.owner_id === gmSelectedId) ?? null
    : null;

  const displaySheet = user.is_gm && gmViewedSheet ? gmViewedSheet : sheet;
  const isReadOnly = user.is_gm && !!gmViewedSheet;

  const loadSheet = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mesh_pc_sheets')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    setSheet(data as PcSheet | null);
    setLoading(false);
  }, [user.id]);

  const loadAllSheets = useCallback(async () => {
    if (!user.is_gm) return;
    const { data: sheets } = await supabase
      .from('mesh_pc_sheets')
      .select('*');
    if (!sheets) return;
    const { data: users } = await supabase
      .from('mesh_users')
      .select('id, handle');
    const userMap: Record<string, string> = {};
    if (users) users.forEach((u: { id: string; handle: string }) => { userMap[u.id] = u.handle; });
    setAllSheets((sheets as PcSheet[]).map(s => ({ ...s, owner_handle: userMap[s.owner_id] ?? s.owner_id })));
  }, [user.is_gm]);

  useEffect(() => {
    loadSheet();
    loadAllSheets();
  }, [loadSheet, loadAllSheets]);

  const createSheet = async () => {
    const blank: Partial<PcSheet> = {
      owner_id: user.id,
      handle: user.handle,
      role: user.role,
      reputation: 0,
      stat_int: 0, stat_ref: 0, stat_dex: 0, stat_tech: 0, stat_cool: 0,
      stat_will: 0, stat_luck: 0, stat_move: 0, stat_body: 0, stat_emp: 0,
      hp_current: 0, hp_max: 0, humanity_current: 0, wound_state: 0,
      skills: [], cyberware: [], weapons: [], gear: [], notes: '',
    };
    const { data } = await supabase.from('mesh_pc_sheets').insert(blank).select().single();
    if (data) setSheet(data as PcSheet);
  };

  const saveSheet = async () => {
    if (!sheet || isReadOnly) return;
    setSaving(true);
    await supabase.from('mesh_pc_sheets').update(sheet).eq('id', sheet.id);
    setSaving(false);
    setDirty(false);
  };

  const update = <K extends keyof PcSheet>(field: K, value: PcSheet[K]) => {
    if (isReadOnly || !displaySheet) return;
    setSheet(prev => prev ? { ...prev, [field]: value } : prev);
    setDirty(true);
  };

  const updateNum = (field: keyof PcSheet, raw: string) => {
    const n = parseInt(raw, 10);
    update(field, (isNaN(n) ? 0 : Math.max(0, Math.min(10, n))) as PcSheet[typeof field]);
  };

  // ── Skill helpers ──────────────────────────────────────────────────────────
  const skills = (displaySheet?.skills ?? []) as SkillEntry[];
  const addSkill = () => {
    update('skills', [...skills, { name: '', level: 0, stat: 'INT' }] as PcSheet['skills']);
  };
  const updateSkill = (i: number, patch: Partial<SkillEntry>) => {
    const next = skills.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    update('skills', next as PcSheet['skills']);
  };
  const removeSkill = (i: number) => {
    update('skills', skills.filter((_, idx) => idx !== i) as PcSheet['skills']);
  };

  // ── Cyberware helpers ──────────────────────────────────────────────────────
  const cyber = (displaySheet?.cyberware ?? []) as CyberEntry[];
  const addCyber = () => {
    update('cyberware', [...cyber, { name: '', humanity_cost: 0, notes: '' }] as PcSheet['cyberware']);
  };
  const updateCyber = (i: number, patch: Partial<CyberEntry>) => {
    const next = cyber.map((c, idx) => idx === i ? { ...c, ...patch } : c);
    update('cyberware', next as PcSheet['cyberware']);
  };
  const removeCyber = (i: number) => {
    update('cyberware', cyber.filter((_, idx) => idx !== i) as PcSheet['cyberware']);
  };
  const totalHumanityCost = cyber.reduce((sum, c) => sum + (c.humanity_cost || 0), 0);

  // ── Weapon helpers ─────────────────────────────────────────────────────────
  const weapons = (displaySheet?.weapons ?? []) as WeaponEntry[];
  const addWeapon = () => {
    update('weapons', [...weapons, { name: '', damage: '', rof: 1, notes: '' }] as PcSheet['weapons']);
  };
  const updateWeapon = (i: number, patch: Partial<WeaponEntry>) => {
    const next = weapons.map((w, idx) => idx === i ? { ...w, ...patch } : w);
    update('weapons', next as PcSheet['weapons']);
  };
  const removeWeapon = (i: number) => {
    update('weapons', weapons.filter((_, idx) => idx !== i) as PcSheet['weapons']);
  };

  // ── Gear helpers ───────────────────────────────────────────────────────────
  const gear = (displaySheet?.gear ?? []) as GearEntry[];
  const addGear = () => {
    update('gear', [...gear, { name: '', notes: '' }] as PcSheet['gear']);
  };
  const updateGear = (i: number, patch: Partial<GearEntry>) => {
    const next = gear.map((g, idx) => idx === i ? { ...g, ...patch } : g);
    update('gear', next as PcSheet['gear']);
  };
  const removeGear = (i: number) => {
    update('gear', gear.filter((_, idx) => idx !== i) as PcSheet['gear']);
  };

  if (loading) {
    return <div className="sheet-loading">[ LOADING CHARACTER DATA... ]</div>;
  }

  // No sheet yet (player only)
  if (!displaySheet && !user.is_gm) {
    return (
      <div className="sheet-empty">
        <div className="sheet-empty-text">[ NO CHARACTER SHEET FOUND ]</div>
        <button className="sheet-create-btn" onClick={createSheet}>
          + INITIALISE CHARACTER SHEET
        </button>
      </div>
    );
  }

  // GM with no sheets at all
  if (user.is_gm && !displaySheet && allSheets.length === 0) {
    return (
      <div className="sheet-empty">
        <div className="sheet-empty-text">[ NO CHARACTER SHEETS ON FILE ]</div>
      </div>
    );
  }

  return (
    <div className="sheet-module">
      {/* GM selector */}
      {user.is_gm && (
        <div className="sheet-gm-bar">
          <span className="sheet-gm-label">[GM] VIEWING:</span>
          <select
            className="sheet-gm-select"
            value={gmSelectedId ?? ''}
            onChange={e => setGmSelectedId(e.target.value || null)}
          >
            <option value="">— my own sheet —</option>
            {allSheets.map(s => (
              <option key={s.owner_id} value={s.owner_id}>
                {(s as PcSheet & { owner_handle?: string }).owner_handle ?? s.owner_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header */}
      {displaySheet && (
        <>
          <div className="sheet-header">
            <div className="sheet-header-left">
              {isReadOnly ? (
                <>
                  <span className="sheet-handle glow">{displaySheet.handle || '???'}</span>
                  <span className="sheet-role">{displaySheet.role || '—'}</span>
                </>
              ) : (
                <>
                  <input
                    className="sheet-handle-input glow"
                    value={sheet?.handle ?? ''}
                    onChange={e => update('handle', e.target.value)}
                    placeholder="HANDLE"
                  />
                  <input
                    className="sheet-role-input"
                    value={sheet?.role ?? ''}
                    onChange={e => update('role', e.target.value)}
                    placeholder="ROLE"
                  />
                </>
              )}
            </div>
            <div className="sheet-header-right">
              <div className={`sheet-wound ${WOUND_CLASSES[displaySheet.wound_state ?? 0]}`}>
                {WOUND_LABELS[displaySheet.wound_state ?? 0]}
              </div>
              <div className="sheet-rep">REP: {displaySheet.reputation}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="sheet-tabs">
            {(['stats', 'skills', 'cyberware', 'weapons', 'notes'] as SheetTab[]).map(tab => (
              <button
                key={tab}
                className={`sheet-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="sheet-body">
            {/* ── STATS ── */}
            {activeTab === 'stats' && (
              <div className="sheet-stats">
                <div className="stats-grid">
                  {STAT_KEYS.map(({ key, label }) => (
                    <div key={key} className="stat-row">
                      <span className="stat-label">{label}</span>
                      {isReadOnly ? (
                        <span className="stat-value">{displaySheet[key] as number}</span>
                      ) : (
                        <input
                          type="number"
                          className="stat-input"
                          min={0} max={10}
                          value={sheet?.[key] as number ?? 0}
                          onChange={e => updateNum(key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="stats-derived">
                  <div className="derived-section">
                    <div className="derived-title">HIT POINTS</div>
                    <div className="derived-row">
                      {isReadOnly ? (
                        <span>{displaySheet.hp_current} / {displaySheet.hp_max}</span>
                      ) : (
                        <>
                          <input type="number" className="derived-input" min={0}
                            value={sheet?.hp_current ?? 0}
                            onChange={e => update('hp_current', parseInt(e.target.value) || 0)}
                          />
                          <span className="derived-sep">/</span>
                          <input type="number" className="derived-input" min={0}
                            value={sheet?.hp_max ?? 0}
                            onChange={e => update('hp_max', parseInt(e.target.value) || 0)}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="derived-section">
                    <div className="derived-title">HUMANITY</div>
                    <div className="derived-row">
                      {isReadOnly ? (
                        <span>{displaySheet.humanity_current}</span>
                      ) : (
                        <input type="number" className="derived-input" min={0} max={100}
                          value={sheet?.humanity_current ?? 0}
                          onChange={e => update('humanity_current', parseInt(e.target.value) || 0)}
                        />
                      )}
                      <span className="derived-sep">/ {(displaySheet.stat_emp ?? 0) * 10}</span>
                    </div>
                    {totalHumanityCost > 0 && (
                      <div className="derived-sub">Cyberware cost: {totalHumanityCost}</div>
                    )}
                  </div>

                  <div className="derived-section">
                    <div className="derived-title">WOUND STATE</div>
                    {isReadOnly ? (
                      <div className={`wound-display ${WOUND_CLASSES[displaySheet.wound_state ?? 0]}`}>
                        {WOUND_LABELS[displaySheet.wound_state ?? 0]}
                      </div>
                    ) : (
                      <div className="wound-track">
                        {WOUND_LABELS.map((label, i) => (
                          <button
                            key={i}
                            className={`wound-btn ${(sheet?.wound_state ?? 0) === i ? 'active ' + WOUND_CLASSES[i] : ''}`}
                            onClick={() => update('wound_state', i)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isReadOnly && (
                    <div className="derived-section">
                      <div className="derived-title">REPUTATION</div>
                      <input type="number" className="derived-input" min={0}
                        value={sheet?.reputation ?? 0}
                        onChange={e => update('reputation', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SKILLS ── */}
            {activeTab === 'skills' && (
              <div className="sheet-list-section">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>SKILL</th>
                      <th>STAT</th>
                      <th>LVL</th>
                      {!isReadOnly && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((s, i) => (
                      <tr key={i}>
                        <td>
                          {isReadOnly ? s.name : (
                            <input value={s.name} onChange={e => updateSkill(i, { name: e.target.value })} placeholder="Skill name" />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? s.stat : (
                            <select value={s.stat} onChange={e => updateSkill(i, { stat: e.target.value })}>
                              {['INT','REF','DEX','TECH','COOL','WILL','LUCK','MOVE','BODY','EMP'].map(st => (
                                <option key={st}>{st}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          {isReadOnly ? s.level : (
                            <input type="number" min={0} max={10} value={s.level}
                              onChange={e => updateSkill(i, { level: parseInt(e.target.value) || 0 })} />
                          )}
                        </td>
                        {!isReadOnly && <td><button className="sheet-remove-btn" onClick={() => removeSkill(i)}>✕</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isReadOnly && (
                  <button className="sheet-add-btn" onClick={addSkill}>+ ADD SKILL</button>
                )}
              </div>
            )}

            {/* ── CYBERWARE ── */}
            {activeTab === 'cyberware' && (
              <div className="sheet-list-section">
                {totalHumanityCost > 0 && (
                  <div className="cyber-total">TOTAL HUMANITY COST: {totalHumanityCost}</div>
                )}
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>CYBERWARE</th>
                      <th>HUM</th>
                      <th>NOTES</th>
                      {!isReadOnly && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cyber.map((c, i) => (
                      <tr key={i}>
                        <td>
                          {isReadOnly ? c.name : (
                            <input value={c.name} onChange={e => updateCyber(i, { name: e.target.value })} placeholder="Implant name" />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? c.humanity_cost : (
                            <input type="number" min={0} value={c.humanity_cost}
                              onChange={e => updateCyber(i, { humanity_cost: parseInt(e.target.value) || 0 })} />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? c.notes : (
                            <input value={c.notes} onChange={e => updateCyber(i, { notes: e.target.value })} placeholder="Notes" />
                          )}
                        </td>
                        {!isReadOnly && <td><button className="sheet-remove-btn" onClick={() => removeCyber(i)}>✕</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isReadOnly && (
                  <button className="sheet-add-btn" onClick={addCyber}>+ ADD CYBERWARE</button>
                )}
              </div>
            )}

            {/* ── WEAPONS & GEAR ── */}
            {activeTab === 'weapons' && (
              <div className="sheet-list-section">
                <div className="sheet-subsection-title">WEAPONS</div>
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>DMG</th>
                      <th>ROF</th>
                      <th>NOTES</th>
                      {!isReadOnly && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.map((w, i) => (
                      <tr key={i}>
                        <td>
                          {isReadOnly ? w.name : (
                            <input value={w.name} onChange={e => updateWeapon(i, { name: e.target.value })} placeholder="Weapon" />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? w.damage : (
                            <input value={w.damage} onChange={e => updateWeapon(i, { damage: e.target.value })} placeholder="3d6" />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? w.rof : (
                            <input type="number" min={1} value={w.rof}
                              onChange={e => updateWeapon(i, { rof: parseInt(e.target.value) || 1 })} />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? w.notes : (
                            <input value={w.notes} onChange={e => updateWeapon(i, { notes: e.target.value })} placeholder="Notes" />
                          )}
                        </td>
                        {!isReadOnly && <td><button className="sheet-remove-btn" onClick={() => removeWeapon(i)}>✕</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isReadOnly && (
                  <button className="sheet-add-btn" onClick={addWeapon}>+ ADD WEAPON</button>
                )}

                <div className="sheet-subsection-title" style={{ marginTop: '20px' }}>GEAR</div>
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>ITEM</th>
                      <th>NOTES</th>
                      {!isReadOnly && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {gear.map((g, i) => (
                      <tr key={i}>
                        <td>
                          {isReadOnly ? g.name : (
                            <input value={g.name} onChange={e => updateGear(i, { name: e.target.value })} placeholder="Item" />
                          )}
                        </td>
                        <td>
                          {isReadOnly ? g.notes : (
                            <input value={g.notes} onChange={e => updateGear(i, { notes: e.target.value })} placeholder="Notes" />
                          )}
                        </td>
                        {!isReadOnly && <td><button className="sheet-remove-btn" onClick={() => removeGear(i)}>✕</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isReadOnly && (
                  <button className="sheet-add-btn" onClick={addGear}>+ ADD GEAR</button>
                )}
              </div>
            )}

            {/* ── NOTES ── */}
            {activeTab === 'notes' && (
              <div className="sheet-notes-section">
                {isReadOnly ? (
                  <pre className="sheet-notes-display">{displaySheet.notes || '[ no notes ]'}</pre>
                ) : (
                  <textarea
                    className="sheet-notes-input"
                    value={sheet?.notes ?? ''}
                    onChange={e => update('notes', e.target.value)}
                    placeholder="Freeform notes, contacts, job history..."
                    rows={20}
                  />
                )}
              </div>
            )}
          </div>

          {/* Save bar */}
          {!isReadOnly && (
            <div className="sheet-save-bar">
              {dirty && <span className="sheet-dirty">● UNSAVED CHANGES</span>}
              <button className="sheet-save-btn" onClick={saveSheet} disabled={saving || !dirty}>
                {saving ? 'SAVING...' : '[ SAVE SHEET ]'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
