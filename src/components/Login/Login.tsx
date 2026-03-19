import { useState, type FormEvent } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ error: unknown }>;
  onSignup: (email: string, password: string, handle: string, displayName: string, role: string) => Promise<{ error: unknown }>;
  successMessage?: string;
}

export function Login({ onLogin, onSignup, successMessage }: LoginProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignup) {
      const { error } = await onSignup(email, password, handle, displayName, role);
      if (error) {
        setError(`[AUTH] Registration failed. ${(error as Error).message || 'Unknown error.'}`);
      }
    } else {
      const { error } = await onLogin(email, password);
      if (error) {
        setError('[AUTH] Access denied. Invalid credentials.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <pre className="login-ascii glow">{`
 ███╗   ███╗███████╗███████╗██╗  ██╗
 ████╗ ████║██╔════╝██╔════╝██║  ██║
 ██╔████╔██║█████╗  ███████╗███████║
 ██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║
 ██║ ╚═╝ ██║███████╗███████║██║  ██║
 ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝`}</pre>
          <div className="login-subtitle">PERSONAL TERMINAL SYSTEM</div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-prompt">
            <span className="prompt-label">{isSignup ? 'REGISTER NEW USER' : 'AUTHENTICATE'}</span>
          </div>

          <div className="login-field">
            <label>&gt; EMAIL:</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label>&gt; PASSWORD:</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {isSignup && (
            <>
              <div className="login-field">
                <label>&gt; HANDLE:</label>
                <input
                  type="text"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  placeholder="Your character's handle"
                  required
                  disabled={loading}
                />
              </div>
              <div className="login-field">
                <label>&gt; NAME:</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Character full name"
                  required
                  disabled={loading}
                />
              </div>
              <div className="login-field">
                <label>&gt; ROLE:</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="" disabled>Select role...</option>
                  <option>Rockerboy</option>
                  <option>Solo</option>
                  <option>Netrunner</option>
                  <option>Tech</option>
                  <option>Medtech</option>
                  <option>Media</option>
                  <option>Exec</option>
                  <option>Lawman</option>
                  <option>Fixer</option>
                  <option>Nomad</option>
                </select>
              </div>
            </>
          )}

          {successMessage && !isSignup && <div className="login-success">{successMessage}</div>}
          {error && <div className="login-error">{error}</div>}

          <div className="login-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'PROCESSING...' : isSignup ? '[ REGISTER ]' : '[ LOGIN ]'}
            </button>
          </div>

          <div className="login-toggle">
            <button type="button" className="link-btn" onClick={() => { setIsSignup(!isSignup); setError(''); }}>
              {isSignup ? '> Already registered? Login' : '> New user? Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
