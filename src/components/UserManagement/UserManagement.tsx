import React, { useState, useEffect, useCallback, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser } from '../../types';
import { SignalBars } from '../SignalBars/SignalBars';
import './UserManagement.css';

interface UserManagementProps {
  user: MeshUser;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  gm_user_id: string | null;
  active: boolean;
  created_at: string;
}

interface EditState {
  display_name: string;
  role: string;
  campaign_id: string | null;
}

interface GhostSignalRow {
  id: string;
  content: string;
  active: boolean;
  created_at: string;
}

const ROLES = ['Rockerboy', 'Solo', 'Netrunner', 'Tech', 'Medtech', 'Media', 'Exec', 'Lawman', 'Fixer', 'Nomad'];

export function UserManagementModule({ user }: UserManagementProps) {
  const [users, setUsers] = useState<MeshUser[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // New user form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [isGm, setIsGm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<MeshUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [togglingCampaign, setTogglingCampaign] = useState<string | null>(null);

  // Signal strength
  const [signalStrength, setSignalStrength] = useState<number>(4);
  const [settingSignal, setSettingSignal] = useState(false);

  // Ghost signals
  const [ghostSignals, setGhostSignals] = useState<GhostSignalRow[]>([]);
  const [newGhostContent, setNewGhostContent] = useState('');
  const [creatingGhostSignal, setCreatingGhostSignal] = useState(false);
  const [ghostSignalError, setGhostSignalError] = useState('');
  const [togglingGhostSignal, setTogglingGhostSignal] = useState<string | null>(null);

  // Inline user edit
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ display_name: '', role: '', campaign_id: null });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    const [usersResult, emailsResult] = await Promise.all([
      supabase.from('mesh_users').select('*').order('created_at', { ascending: true }),
      supabase.functions.invoke('get-user-emails'),
    ]);

    if (usersResult.error) {
      setError(`[DB] Failed to load users: ${usersResult.error.message}`);
    }
    setUsers(usersResult.data || []);

    if (emailsResult.data?.emails) {
      setEmails(emailsResult.data.emails);
    }

    setLoading(false);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: true });
    setCampaigns(data || []);
  }, []);

  const fetchGhostSignals = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_ghost_signals')
      .select('*')
      .order('created_at', { ascending: false });
    setGhostSignals(data || []);
  }, []);

  const fetchSignalStrength = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_config')
      .select('value')
      .eq('key', 'signal_strength')
      .maybeSingle();
    if (data) {
      const n = parseInt(data.value, 10);
      if (!isNaN(n)) setSignalStrength(n);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCampaigns();
    fetchSignalStrength();
    fetchGhostSignals();
  }, [fetchUsers, fetchCampaigns, fetchSignalStrength, fetchGhostSignals]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    // We need to sign up a new user via Supabase Auth.
    // Since we're already logged in as GM, we'll use a secondary client
    // to avoid losing our session. We sign up the new user, then
    // create their mesh_users profile.
    //
    // NOTE: This uses the public signUp endpoint. The GM stays logged in
    // because Supabase Auth signUp on the anon key creates the user
    // but doesn't automatically sign them in when autoconfirm is off.
    // If autoconfirm is on, it may swap the session — we handle that below.

    try {
      // Store current session so we can restore it
      const { data: currentSession } = await supabase.auth.getSession();

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(`[AUTH] ${authError.message}`);
        setCreating(false);
        return;
      }

      if (!data.user) {
        setError('[AUTH] No user returned from registration.');
        setCreating(false);
        return;
      }

      const newUserId = data.user.id;

      // If signUp swapped our session, restore the GM session
      const { data: checkSession } = await supabase.auth.getSession();
      if (checkSession.session?.user?.id !== user.id && currentSession.session) {
        await supabase.auth.setSession({
          access_token: currentSession.session.access_token,
          refresh_token: currentSession.session.refresh_token,
        });
      }

      // Create mesh_users profile
      const { error: profileError } = await supabase.from('mesh_users').insert({
        id: newUserId,
        handle,
        display_name: displayName,
        role: role || 'Unknown',
        colour_scheme: 'green',
        is_gm: isGm,
        is_online: false,
      });

      if (profileError) {
        setError(`[DB] Profile creation failed: ${profileError.message}`);
        setCreating(false);
        return;
      }

      setSuccess(`[OK] User "${handle}" created. Email: ${email}`);
      setEmail('');
      setPassword('');
      setHandle('');
      setDisplayName('');
      setRole('');
      setIsGm(false);
      fetchUsers();
    } catch (err) {
      setError(`[ERROR] ${(err as Error).message}`);
    }

    setCreating(false);
  };

  const toggleGm = async (targetUser: MeshUser) => {
    if (targetUser.id === user.id) return; // Can't de-GM yourself
    await supabase
      .from('mesh_users')
      .update({ is_gm: !targetUser.is_gm })
      .eq('id', targetUser.id);
    fetchUsers();
  };

  const handleDelete = async (targetUser: MeshUser) => {
    setDeleting(true);
    setError('');
    setSuccess('');

    const { data, error: fnError } = await supabase.functions.invoke('delete-user', {
      body: { userId: targetUser.id },
    });

    if (fnError) {
      // Try to extract the real error message from the function response body
      let errorMsg = fnError.message;
      try {
        const body = (fnError as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json
          ? await (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context.json()
          : data;
        if (body?.error) errorMsg = body.error;
      } catch { /* fall back to generic message */ }
      setError(`[ERROR] ${errorMsg}`);
    } else {
      setSuccess(`[OK] User "${targetUser.handle}" has been permanently deleted.`);
      setUsers(prev => prev.filter(u => u.id !== targetUser.id));
      setConfirmDelete(null);
    }

    setDeleting(false);
  };

  const handleResetPassword = async (targetUser: MeshUser) => {
    setResetting(true);
    setError('');
    setSuccess('');

    const { data, error: fnError } = await supabase.functions.invoke('reset-password', {
      body: { userId: targetUser.id, newPassword: resetPassword },
    });

    if (fnError) {
      let errorMsg = fnError.message;
      try {
        const body = (fnError as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json
          ? await (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context.json()
          : data;
        if (body?.error) errorMsg = body.error;
      } catch { /* fall back */ }
      setError(`[ERROR] ${errorMsg}`);
    } else {
      setSuccess(`[OK] Password for "${targetUser.handle}" has been reset.`);
      setResetTarget(null);
      setResetPassword('');
    }

    setResetting(false);
  };

  const handleSetSignal = async (level: number) => {
    setSettingSignal(true);
    await supabase
      .from('mesh_config')
      .update({ value: String(level) })
      .eq('key', 'signal_strength');
    setSignalStrength(level);
    setSettingSignal(false);
  };

  const handleCreateGhostSignal = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGhostContent.trim()) return;
    setGhostSignalError('');
    setCreatingGhostSignal(true);
    const { error: err } = await supabase.from('mesh_ghost_signals').insert({
      content: newGhostContent.trim(),
      active: true,
    });
    if (err) {
      setGhostSignalError(`[DB] ${err.message}`);
    } else {
      setNewGhostContent('');
      fetchGhostSignals();
    }
    setCreatingGhostSignal(false);
  };

  const toggleGhostSignalActive = async (signal: GhostSignalRow) => {
    setTogglingGhostSignal(signal.id);
    await supabase
      .from('mesh_ghost_signals')
      .update({ active: !signal.active })
      .eq('id', signal.id);
    await fetchGhostSignals();
    setTogglingGhostSignal(null);
  };

  const handleCreateCampaign = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    setCampaignError('');
    setCreatingCampaign(true);
    const { error: err } = await supabase.from('campaigns').insert({
      name: newCampaignName.trim(),
      description: newCampaignDesc.trim() || null,
      gm_user_id: user.id,
    });
    if (err) {
      setCampaignError(`[DB] ${err.message}`);
    } else {
      setNewCampaignName('');
      setNewCampaignDesc('');
      fetchCampaigns();
    }
    setCreatingCampaign(false);
  };

  const toggleCampaignActive = async (c: Campaign) => {
    setTogglingCampaign(c.id);
    await supabase.from('campaigns').update({ active: !c.active }).eq('id', c.id);
    await fetchCampaigns();
    setTogglingCampaign(null);
  };

  const openEdit = (u: MeshUser) => {
    if (editTarget === u.id) {
      setEditTarget(null);
      return;
    }
    setEditTarget(u.id);
    setEditState({
      display_name: u.display_name,
      role: u.role,
      campaign_id: u.campaign_id ?? null,
    });
    setResetTarget(null);
    setResetPassword('');
  };

  const handleSaveUser = async (u: MeshUser) => {
    setSaving(true);
    const { error: err } = await supabase
      .from('mesh_users')
      .update({
        display_name: editState.display_name,
        role: editState.role,
        campaign_id: editState.campaign_id || null,
      })
      .eq('id', u.id);
    if (err) {
      setError(`[DB] ${err.message}`);
    } else {
      setEditTarget(null);
      fetchUsers();
    }
    setSaving(false);
  };

  if (!user.is_gm) {
    return <div className="users-module">[ACCESS DENIED] GM clearance required.</div>;
  }

  return (
    <div className="users-module">
      <form className="users-create-form" onSubmit={handleCreate}>
        <div className="users-form-header">CREATE NEW USER</div>

        <div className="users-field">
          <label>&gt; EMAIL:</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@mesh.local"
            required
            disabled={creating}
          />
        </div>

        <div className="users-field">
          <label>&gt; PASSWORD:</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Initial password"
            required
            disabled={creating}
          />
        </div>

        <div className="users-field">
          <label>&gt; HANDLE:</label>
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="Character handle"
            required
            disabled={creating}
          />
        </div>

        <div className="users-field">
          <label>&gt; NAME:</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Character full name"
            required
            disabled={creating}
          />
        </div>

        <div className="users-field">
          <label>&gt; ROLE:</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            disabled={creating}
          >
            <option value="" disabled>Select role...</option>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="users-field-checkbox">
          <label>
            <input
              type="checkbox"
              checked={isGm}
              onChange={e => setIsGm(e.target.checked)}
              disabled={creating}
            />
            GRANT GM ACCESS
          </label>
        </div>

        {error && <div className="users-error">{error}</div>}
        {success && <div className="users-success">{success}</div>}

        <div className="users-form-actions">
          <button type="submit" disabled={creating}>
            {creating ? 'CREATING...' : '[ CREATE USER ]'}
          </button>
        </div>
      </form>

      {/* ── CAMPAIGNS ── */}
      <div className="campaigns-section">
        <div className="users-list-header">CAMPAIGNS</div>

        {campaigns.length > 0 && (
          <div className="campaigns-list">
            {campaigns.map(c => (
              <div key={c.id} className={`campaign-row${c.active ? '' : ' campaign-row--inactive'}`}>
                <div className="campaign-row-info">
                  <span className="campaign-row-name">{c.name}</span>
                  {c.description && (
                    <span className="campaign-row-desc">{c.description}</span>
                  )}
                </div>
                <div className="campaign-row-actions">
                  <span className={`campaign-status-tag${c.active ? ' campaign-status-tag--active' : ''}`}>
                    {c.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <button
                    className="campaign-toggle-btn"
                    onClick={() => toggleCampaignActive(c)}
                    disabled={togglingCampaign === c.id}
                  >
                    {c.active ? 'DEACTIVATE' : 'ACTIVATE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form className="campaign-create-form" onSubmit={handleCreateCampaign}>
          <div className="campaign-create-header">NEW CAMPAIGN</div>
          <div className="users-field">
            <label>&gt; NAME:</label>
            <input
              type="text"
              value={newCampaignName}
              onChange={e => setNewCampaignName(e.target.value)}
              placeholder="Campaign name"
              required
              disabled={creatingCampaign}
            />
          </div>
          <div className="users-field">
            <label>&gt; DESCRIPTION:</label>
            <input
              type="text"
              value={newCampaignDesc}
              onChange={e => setNewCampaignDesc(e.target.value)}
              placeholder="Optional description"
              disabled={creatingCampaign}
            />
          </div>
          {campaignError && <div className="users-error">{campaignError}</div>}
          <div className="users-form-actions">
            <button type="submit" disabled={creatingCampaign || !newCampaignName.trim()}>
              {creatingCampaign ? 'CREATING...' : '[ CREATE CAMPAIGN ]'}
            </button>
          </div>
        </form>
      </div>

      {/* ── SIGNAL STRENGTH ── */}
      <div className="signal-section">
        <div className="users-list-header">SIGNAL STRENGTH</div>
        <div className="signal-control">
          <span className="signal-control-label">MESH SIGNAL:</span>
          <div className="signal-control-btns">
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
          </div>
          <SignalBars strength={signalStrength} />
          <span className="signal-control-value">
            {signalStrength === 0 ? 'NO SIGNAL' : `${signalStrength}/4`}
          </span>
        </div>
      </div>

      {/* ── GHOST SIGNALS ── */}
      <div className="ghost-signals-section">
        <div className="users-list-header">GHOST SIGNALS</div>

        {ghostSignals.length > 0 && (
          <div className="ghost-signals-list">
            {ghostSignals.map(gs => (
              <div key={gs.id} className={`ghost-signal-row${gs.active ? '' : ' ghost-signal-row--inactive'}`}>
                <div className="ghost-signal-row-content">{gs.content}</div>
                <div className="ghost-signal-row-actions">
                  <span className={`ghost-signal-status-tag${gs.active ? ' ghost-signal-status-tag--active' : ''}`}>
                    {gs.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <button
                    className="ghost-signal-toggle-btn"
                    onClick={() => toggleGhostSignalActive(gs)}
                    disabled={togglingGhostSignal === gs.id}
                  >
                    {gs.active ? 'DEACTIVATE' : 'ACTIVATE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form className="ghost-signal-create-form" onSubmit={handleCreateGhostSignal}>
          <div className="campaign-create-header">NEW FRAGMENT</div>
          <div className="ghost-signal-field">
            <label>&gt; CONTENT:</label>
            <textarea
              value={newGhostContent}
              onChange={e => setNewGhostContent(e.target.value)}
              placeholder="Fragment text to broadcast..."
              rows={3}
              disabled={creatingGhostSignal}
              className="ghost-signal-textarea"
            />
          </div>
          {ghostSignalError && <div className="users-error">{ghostSignalError}</div>}
          <div className="users-form-actions">
            <button type="submit" disabled={creatingGhostSignal || !newGhostContent.trim()}>
              {creatingGhostSignal ? 'CREATING...' : '[ BROADCAST FRAGMENT ]'}
            </button>
          </div>
        </form>
      </div>

      {/* ── USER LIST ── */}
      <div className="users-list-header">REGISTERED USERS</div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>HANDLE</th>
              <th>NAME</th>
              <th>ROLE</th>
              <th>CAMPAIGN</th>
              <th>EMAIL</th>
              <th>ACCESS</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const campaignName = u.campaign_id
                ? (campaigns.find(c => c.id === u.campaign_id)?.name ?? '—')
                : '—';
              const isEditing = editTarget === u.id;

              return (
                <React.Fragment key={u.id}>
                  <tr
                    className={`users-row${isEditing ? ' users-row--editing' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      openEdit(u);
                    }}
                  >
                    <td>{u.handle}</td>
                    <td>{u.display_name}</td>
                    <td>{u.role}</td>
                    <td className="campaign-cell">{campaignName}</td>
                    <td>{emails[u.id] || '—'}</td>
                    <td>
                      {u.is_gm ? <span className="gm-tag">GM</span> : 'USER'}
                    </td>
                    <td>{u.is_online ? '● ONLINE' : '○ OFFLINE'}</td>
                    <td className="users-actions-cell" onClick={e => e.stopPropagation()}>
                      {u.id !== user.id && (
                        <>
                          <button
                            className="users-toggle-gm"
                            onClick={() => toggleGm(u)}
                          >
                            {u.is_gm ? 'REVOKE GM' : 'GRANT GM'}
                          </button>
                          <button
                            className="users-reset-pw-btn"
                            onClick={() => {
                              setResetTarget(resetTarget === u.id ? null : u.id);
                              setResetPassword('');
                            }}
                          >
                            RESET PW
                          </button>
                          {/* Delete only available for non-GM users — revoke GM first */}
                          {!u.is_gm && (
                            <button
                              className="users-delete-btn"
                              onClick={() => { setConfirmDelete(u); setError(''); setSuccess(''); }}
                            >
                              [ DELETE ]
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {isEditing && (
                    <tr className="users-edit-row">
                      <td colSpan={8} className="users-edit-cell">
                        <div className="users-edit-inline">
                          <div className="users-edit-field">
                            <span className="users-edit-label">&gt; NAME:</span>
                            <input
                              type="text"
                              value={editState.display_name}
                              onChange={e => setEditState(s => ({ ...s, display_name: e.target.value }))}
                              disabled={saving}
                              className="users-edit-input"
                            />
                          </div>
                          <div className="users-edit-field">
                            <span className="users-edit-label">&gt; ROLE:</span>
                            <select
                              value={editState.role}
                              onChange={e => setEditState(s => ({ ...s, role: e.target.value }))}
                              disabled={saving}
                              className="users-edit-select"
                            >
                              <option value="">— Select —</option>
                              {ROLES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="users-edit-field">
                            <span className="users-edit-label">&gt; CAMPAIGN:</span>
                            <select
                              value={editState.campaign_id ?? ''}
                              onChange={e => setEditState(s => ({ ...s, campaign_id: e.target.value || null }))}
                              disabled={saving}
                              className="users-edit-select"
                            >
                              <option value="">None / Unassigned</option>
                              {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}{!c.active ? ' (inactive)' : ''}</option>
                              ))}
                            </select>
                          </div>
                          <div className="users-edit-actions">
                            <button
                              className="users-edit-save-btn"
                              onClick={() => handleSaveUser(u)}
                              disabled={saving || !editState.display_name.trim()}
                            >
                              {saving ? 'SAVING...' : '[ SAVE ]'}
                            </button>
                            <button
                              className="users-edit-cancel-btn"
                              onClick={() => setEditTarget(null)}
                              disabled={saving}
                            >
                              [ CANCEL ]
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Password reset row */}
                  {resetTarget === u.id && (
                    <tr className="users-reset-row">
                      <td colSpan={8} className="users-reset-cell">
                        <div className="users-reset-inline">
                          <span className="users-reset-label">&gt; NEW PASSWORD:</span>
                          <input
                            type="password"
                            value={resetPassword}
                            onChange={e => setResetPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            disabled={resetting}
                            className="users-reset-input"
                          />
                          <button
                            className="users-reset-confirm-btn"
                            onClick={() => handleResetPassword(u)}
                            disabled={resetting || resetPassword.length < 6}
                          >
                            {resetting ? 'RESETTING...' : '[ SET PASSWORD ]'}
                          </button>
                          <button
                            className="users-reset-cancel-btn"
                            onClick={() => { setResetTarget(null); setResetPassword(''); }}
                            disabled={resetting}
                          >
                            [ CANCEL ]
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Delete confirmation panel */}
      {confirmDelete && (
        <div className="users-confirm-delete">
          <div className="users-confirm-header">[CONFIRM DELETE]</div>
          <div className="users-confirm-body">
            Permanently remove user <span className="users-confirm-handle">@{confirmDelete.handle}</span>?
            <br />
            This will erase their account, files, and contact assignments.
            <br />
            Emails sent <em>to</em> them will be deleted. Emails and chat messages
            sent <em>by</em> them will remain with author cleared.
          </div>
          <div className="users-confirm-actions">
            <button
              className="users-confirm-yes"
              onClick={() => handleDelete(confirmDelete)}
              disabled={deleting}
            >
              {deleting ? 'DELETING...' : '[ CONFIRM DELETE ]'}
            </button>
            <button
              className="users-confirm-cancel"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              [ CANCEL ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
