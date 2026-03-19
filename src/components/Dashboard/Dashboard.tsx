import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, PcSheet, IpLogEntry } from '../../types';
import './Dashboard.css';

interface DashboardProps {
  user: MeshUser;
}

interface Campaign {
  id: string;
  name: string;
  active: boolean;
}

interface PlayerCard {
  user: MeshUser;
  sheet: PcSheet | null;
}

interface SkillEntry  { name: string; level: number; stat: string }
interface CyberEntry  { name: string; humanity_cost: number; notes: string }
interface WeaponEntry { name: string; damage: string; rof: number; notes: string }

const WOUND_LABELS = ['UNINJURED', 'LIGHTLY WOUNDED', 'SERIOUSLY WOUNDED', 'CRITICALLY WOUNDED', 'MORTALLY WOUNDED', 'DEAD'];
const WOUND_CLASSES = ['', 'wound-light', 'wound-serious', 'wound-critical', 'wound-mortal', 'wound-dead'];

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

export function GMDashboardModule({ user }: DashboardProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCard | null>(null);
  const [detailTab, setDetailTab] = useState<'stats' | 'skills' | 'cyberware' | 'weapons' | 'notes' | 'ip'>('stats');

  const fetchSheets = useCallback(async (playerList: MeshUser[]) => {
    if (playerList.length === 0) return {};
    const ids = playerList.map(u => u.id);
    const { data } = await supabase.from('mesh_pc_sheets').select('*').in('owner_id', ids);
    const map: Record<string, PcSheet> = {};
    if (data) {
      (data as PcSheet[]).forEach(s => { map[s.owner_id] = s; });
    }
    return map;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);

    const [campaignRes, usersRes] = await Promise.all([
      supabase.from('campaigns').select('id, name, active').eq('active', true).order('created_at', { ascending: true }),
      supabase.from('mesh_users').select('*').eq('is_gm', false).order('created_at', { ascending: true }),
    ]);

    const campaignList: Campaign[] = campaignRes.data || [];
    const userList: MeshUser[] = usersRes.data || [];

    setCampaigns(campaignList);

    const sheetMap = await fetchSheets(userList);
    setPlayers(userList.map(u => ({ user: u, sheet: sheetMap[u.id] ?? null })));
    setLoading(false);
  }, [fetchSheets]);

  const refreshSheets = useCallback(async () => {
    const { data } = await supabase.from('mesh_pc_sheets').select('*');
    if (!data) return;
    const map: Record<string, PcSheet> = {};
    (data as PcSheet[]).forEach(s => { map[s.owner_id] = s; });
    setPlayers(current => current.map(p => ({ ...p, sheet: map[p.user.id] ?? p.sheet })));
    setSelectedPlayer(sel => sel ? { ...sel, sheet: map[sel.user.id] ?? sel.sheet } : sel);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime subscription — no manual refresh needed
  useEffect(() => {
    const channel = supabase
      .channel('dashboard_pc_sheets')
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: 'mesh_pc_sheets' },
        () => { refreshSheets(); }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [refreshSheets]);

  if (!user.is_gm) {
    return <div className="dash-module">[ACCESS DENIED] GM clearance required.</div>;
  }

  const visiblePlayers = selectedCampaignId
    ? players.filter(p => p.user.campaign_id === selectedCampaignId)
    : players;

  // ── Sheet detail overlay ──────────────────────────────────────────────────

  if (selectedPlayer) {
    const { user: pu, sheet: ps } = selectedPlayer;
    const woundIdx = ps?.wound_state ?? 0;
    const hpPct = ps && ps.hp_max > 0 ? Math.max(0, Math.min(100, Math.round((ps.hp_current / ps.hp_max) * 100))) : 0;
    const skills = (ps?.skills ?? []) as SkillEntry[];
    const cyber  = (ps?.cyberware ?? []) as CyberEntry[];
    const weapons = (ps?.weapons ?? []) as WeaponEntry[];
    const totalHumanityCost = cyber.reduce((sum, c) => sum + (c.humanity_cost || 0), 0);

    return (
      <div className="dash-module">
        <div className="dash-detail">
          <div className="dash-detail-header">
            <button className="dash-back-btn" onClick={() => setSelectedPlayer(null)}>← BACK TO DASHBOARD</button>
            <div className="dash-detail-ident">
              <span className="dash-detail-handle glow">{ps?.handle || pu.handle}</span>
              <span className="dash-detail-player">// {pu.display_name}</span>
              <span className="dash-detail-role">{ps?.role || pu.role}</span>
            </div>
            {ps && (
              <div className={`dash-detail-wound ${WOUND_CLASSES[woundIdx]}`}>
                {WOUND_LABELS[woundIdx]}
              </div>
            )}
          </div>

          {!ps ? (
            <div className="dash-no-sheet">[ NO SHEET ON FILE ]</div>
          ) : (
            <>
              <div className="dash-detail-tabs">
                {(['stats', 'skills', 'cyberware', 'weapons', 'notes', 'ip'] as const).map(tab => (
                  <button
                    key={tab}
                    className={`dash-detail-tab${detailTab === tab ? ' active' : ''}`}
                    onClick={() => setDetailTab(tab)}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="dash-detail-body">

                {detailTab === 'stats' && (
                  <div className="dash-stats">
                    <div className="dash-stats-grid">
                      {STAT_KEYS.map(({ key, label }) => (
                        <div key={key} className="dash-stat-row">
                          <span className="dash-stat-label">{label}</span>
                          <span className="dash-stat-value">{ps[key] as number}</span>
                        </div>
                      ))}
                    </div>
                    <div className="dash-derived">
                      <div className="dash-derived-block">
                        <div className="dash-derived-title">HIT POINTS</div>
                        <div className="dash-derived-value">{ps.hp_current} / {ps.hp_max}</div>
                        <div className="dash-hp-bar-wrap">
                          <div className="dash-hp-bar-fill" style={{ width: `${hpPct}%` }} />
                        </div>
                      </div>
                      <div className="dash-derived-block">
                        <div className="dash-derived-title">HUMANITY</div>
                        <div className="dash-derived-value">{ps.humanity_current} / {(ps.stat_emp ?? 0) * 10}</div>
                        {totalHumanityCost > 0 && (
                          <div className="dash-derived-sub">cyber cost: {totalHumanityCost}</div>
                        )}
                      </div>
                      <div className="dash-derived-block">
                        <div className="dash-derived-title">REPUTATION</div>
                        <div className="dash-derived-value">{ps.reputation}</div>
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'skills' && (
                  <div className="dash-list-section">
                    {skills.length === 0 ? (
                      <div className="dash-empty-list">[ No skills on file ]</div>
                    ) : (
                      <table className="dash-table">
                        <thead><tr><th>SKILL</th><th>STAT</th><th>LVL</th></tr></thead>
                        <tbody>
                          {skills.map((s, i) => (
                            <tr key={i}>
                              <td>{s.name}</td>
                              <td>{s.stat}</td>
                              <td>{s.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {detailTab === 'cyberware' && (
                  <div className="dash-list-section">
                    {cyber.length === 0 ? (
                      <div className="dash-empty-list">[ No cyberware on file ]</div>
                    ) : (
                      <table className="dash-table">
                        <thead><tr><th>CYBERWARE</th><th>HUM</th><th>NOTES</th></tr></thead>
                        <tbody>
                          {cyber.map((c, i) => (
                            <tr key={i}>
                              <td>{c.name}</td>
                              <td>{c.humanity_cost}</td>
                              <td>{c.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {detailTab === 'weapons' && (
                  <div className="dash-list-section">
                    {weapons.length === 0 ? (
                      <div className="dash-empty-list">[ No weapons on file ]</div>
                    ) : (
                      <table className="dash-table">
                        <thead><tr><th>WEAPON</th><th>DMG</th><th>ROF</th><th>NOTES</th></tr></thead>
                        <tbody>
                          {weapons.map((w, i) => (
                            <tr key={i}>
                              <td>{w.name}</td>
                              <td>{w.damage}</td>
                              <td>{w.rof}</td>
                              <td>{w.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {detailTab === 'notes' && (
                  <div className="dash-list-section">
                    <pre className="dash-notes">{ps.notes || '[ no notes ]'}</pre>
                  </div>
                )}

                {detailTab === 'ip' && (
                  <div className="dash-list-section">
                    <div className="dash-ip-summary">
                      <div className="dash-ip-stat">
                        <span className="dash-ip-label">TOTAL EARNED</span>
                        <span className="dash-ip-value">{ps.ip_total ?? 0}</span>
                      </div>
                      <div className="dash-ip-stat">
                        <span className="dash-ip-label">SPENT</span>
                        <span className="dash-ip-value">{ps.ip_spent ?? 0}</span>
                      </div>
                      <div className="dash-ip-stat">
                        <span className="dash-ip-label">AVAILABLE</span>
                        <span className="dash-ip-value glow">{(ps.ip_total ?? 0) - (ps.ip_spent ?? 0)}</span>
                      </div>
                    </div>
                    <div className="dash-ip-log-header">IP LOG</div>
                    <div className="dash-ip-log">
                      {((ps.ip_log ?? []) as IpLogEntry[]).length === 0 ? (
                        <div className="dash-empty-list">[ No IP awarded yet ]</div>
                      ) : (
                        [...((ps.ip_log ?? []) as IpLogEntry[])].reverse().map((entry, i) => (
                          <div key={i} className="dash-ip-entry">
                            <span className="dash-ip-amount">+{entry.amount}</span>
                            <span className="dash-ip-source">{entry.source}</span>
                            <span className="dash-ip-date">
                              {new Date(entry.awarded_at).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main dashboard grid ───────────────────────────────────────────────────

  return (
    <div className="dash-module">
      <div className="dash-filter-bar">
        <span className="dash-filter-label">CAMPAIGN:</span>
        <select
          className="dash-campaign-select"
          value={selectedCampaignId}
          onChange={e => setSelectedCampaignId(e.target.value)}
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="dash-player-count">
          {visiblePlayers.length} OPERATIVE{visiblePlayers.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {loading ? (
        <div className="dash-loading">[ RETRIEVING DOSSIERS... ]</div>
      ) : visiblePlayers.length === 0 ? (
        <div className="dash-empty">[ NO OPERATIVES ON FILE ]</div>
      ) : (
        <div className="dash-grid">
          {visiblePlayers.map(({ user: pu, sheet: ps }) => {
            const woundIdx = ps?.wound_state ?? 0;
            const hpPct = ps && ps.hp_max > 0
              ? Math.max(0, Math.min(100, Math.round((ps.hp_current / ps.hp_max) * 100)))
              : 0;
            const campaignName = pu.campaign_id
              ? (campaigns.find(c => c.id === pu.campaign_id)?.name ?? null)
              : null;

            return (
              <div
                key={pu.id}
                className={`dash-card${woundIdx > 0 ? ` dash-card--${WOUND_CLASSES[woundIdx].replace('wound-', '')}` : ''}`}
                onClick={() => { setSelectedPlayer({ user: pu, sheet: ps }); setDetailTab('stats'); }}
              >
                <div className="dash-card-top">
                  <div className="dash-card-ident">
                    <div className="dash-card-handle glow">{ps?.handle || pu.handle}</div>
                    <div className="dash-card-player">{pu.display_name}</div>
                  </div>
                  <div className="dash-card-role">{ps?.role || pu.role || '—'}</div>
                </div>

                {ps ? (
                  <>
                    <div className="dash-card-hp-row">
                      <span className="dash-card-hp-label">HP</span>
                      <div className="dash-card-hp-bar">
                        <div className="dash-card-hp-fill" style={{ width: `${hpPct}%` }} />
                      </div>
                      <span className="dash-card-hp-num">{ps.hp_current}/{ps.hp_max}</span>
                    </div>
                    <div className="dash-card-bottom">
                      <span className="dash-card-humanity">HUM {ps.humanity_current}/{(ps.stat_emp ?? 0) * 10}</span>
                      <span className={`dash-card-wound${woundIdx > 0 ? ` ${WOUND_CLASSES[woundIdx]}` : ''}`}>
                        {WOUND_LABELS[woundIdx]}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="dash-card-no-sheet">[ NO SHEET ON FILE ]</div>
                )}

                {campaignName && (
                  <div className="dash-card-campaign">{campaignName}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
