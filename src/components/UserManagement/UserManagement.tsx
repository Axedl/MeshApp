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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('mesh_users')
      .select('*')
      .order('created_at', { ascending: true });
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
              <th>EMAIL</th>
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
                <td style={{ opacity: 0.5, fontSize: '11px' }}>—</td>
                <td>
                  {u.is_gm ? <span className="gm-tag">GM</span> : 'USER'}
                </td>
                <td>{u.is_online ? '● ONLINE' : '○ OFFLINE'}</td>
                <td>
                  {u.id !== user.id && (
                    <button
                      className="users-toggle-gm"
                      onClick={() => toggleGm(u)}
                    >
                      {u.is_gm ? 'REVOKE GM' : 'GRANT GM'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
