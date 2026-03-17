import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser } from '../../types';
import './UserManagement.css';

interface UserManagementProps {
  user: MeshUser;
}

export function UserManagementModule({ user }: UserManagementProps) {
  const [users, setUsers] = useState<MeshUser[]>([]);
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error: fetchError } = await supabase
      .from('mesh_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (fetchError) {
      setError(`[DB] Failed to load users: ${fetchError.message}`);
    }
    setUsers(data || []);
    setLoading(false);
  };

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
          <input
            type="text"
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="Solo, Netrunner, Fixer..."
            disabled={creating}
          />
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
              <th>ACCESS</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.handle}</td>
                <td>{u.display_name}</td>
                <td>{u.role}</td>
                <td>
                  {u.is_gm ? <span className="gm-tag">GM</span> : 'USER'}
                </td>
                <td>{u.is_online ? '● ONLINE' : '○ OFFLINE'}</td>
                <td className="users-actions-cell">
                  {u.id !== user.id && (
                    <>
                      <button
                        className="users-toggle-gm"
                        onClick={() => toggleGm(u)}
                      >
                        {u.is_gm ? 'REVOKE GM' : 'GRANT GM'}
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
            ))}
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
