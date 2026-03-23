import { useState, type FormEvent } from 'react';
import './Login.css';

// ── Role colour tinting for the ASCII logo ────────────────────────────────

interface RoleColours {
  colour: string;
  glow: string;     // text-shadow colour — same hue, dimmed
  subtitle: string; // subtitle colour — same hue at 60% opacity
}

const ROLE_COLOUR_MAP: Record<string, RoleColours> = {
  netrunner: { colour: '#00d4ff', glow: 'rgba(0,212,255,0.5)',   subtitle: 'rgba(0,212,255,0.6)'   },
  solo:      { colour: '#ff4444', glow: 'rgba(255,68,68,0.5)',   subtitle: 'rgba(255,68,68,0.6)'   },
  exec:      { colour: '#4488ff', glow: 'rgba(68,136,255,0.5)',  subtitle: 'rgba(68,136,255,0.6)'  },
  medtech:   { colour: '#e0e0e0', glow: 'rgba(224,224,224,0.5)', subtitle: 'rgba(224,224,224,0.6)' },
  rockerboy: { colour: '#ff00aa', glow: 'rgba(255,0,170,0.5)',   subtitle: 'rgba(255,0,170,0.6)'   },
  media:     { colour: '#ffdd00', glow: 'rgba(255,221,0,0.5)',   subtitle: 'rgba(255,221,0,0.6)'   },
  tech:      { colour: '#ffb000', glow: 'rgba(255,176,0,0.5)',   subtitle: 'rgba(255,176,0,0.6)'   },
  lawman:    { colour: '#ff8800', glow: 'rgba(255,136,0,0.5)',   subtitle: 'rgba(255,136,0,0.6)'   },
  fixer:     { colour: 'var(--primary)', glow: 'var(--primary-dim)', subtitle: 'var(--primary-dim)' },
  nomad:     { colour: '#ffaa44', glow: 'rgba(255,170,68,0.5)',  subtitle: 'rgba(255,170,68,0.6)'  },
};

const DEFAULT_COLOURS: RoleColours = {
  colour: 'var(--primary)',
  glow: 'var(--primary-dim)',
  subtitle: 'var(--primary-dim)',
};

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ error: unknown }>;
  onSignup: (email: string, password: string, handle: string, displayName: string, role: string) => Promise<{ error: unknown }>;
  successMessage?: string;
}

export function Login({ onLogin, onSignup, successMessage }: LoginProps) {
  const [roleColours] = useState<RoleColours>(() => {
    const lastRole = localStorage.getItem('mesh_last_role') ?? '';
    return ROLE_COLOUR_MAP[lastRole.toLowerCase().trim()] ?? DEFAULT_COLOURS;
  });

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
          <pre className="login-ascii glow" style={{ color: roleColours.colour, textShadow: `0 0 5px ${roleColours.glow}` }}>{`
 ███╗   ███╗███████╗███████╗██╗  ██╗
 ████╗ ████║██╔════╝██╔════╝██║  ██║
 ██╔████╔██║█████╗  ███████╗███████║
 ██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║
 ██║ ╚═╝ ██║███████╗███████║██║  ██║
 ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝`}</pre>
          <div className="login-subtitle" style={{ color: roleColours.subtitle }}>PERSONAL TERMINAL SYSTEM</div>
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
