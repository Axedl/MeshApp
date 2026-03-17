import { useState, useCallback, useEffect } from 'react';
import { TitleBar } from './components/TitleBar/TitleBar';
import { Boot } from './components/Boot/Boot';
import { Login } from './components/Login/Login';
import { Terminal } from './components/Terminal/Terminal';
import { useAuth } from './hooks/useAuth';
import { useColourScheme } from './hooks/useColourScheme';
import './App.css';

type AppState = 'boot' | 'login' | 'terminal';

function App() {
  const [appState, setAppState] = useState<AppState>('boot');
  const { meshUser, loading, login, logout, signup } = useAuth();
  const { schemeName, setSchemeName, customColour, setCustomColour } = useColourScheme(
    meshUser?.colour_scheme || 'green'
  );

  const handleBootComplete = useCallback(() => {
    setAppState('login');
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const result = await login(email, password);
    if (!result.error) {
      setAppState('terminal');
    }
    return result;
  };

  const handleSignup = async (email: string, password: string, handle: string, displayName: string, role: string) => {
    const result = await signup(email, password, handle, displayName, role);
    if (!result.error) {
      setAppState('terminal');
    }
    return result;
  };

  const handleLogout = async () => {
    await logout();
    setAppState('login');
  };

  // If user is already authenticated (e.g. session restored on launch), skip to terminal
  useEffect(() => {
    if (!loading && meshUser && appState === 'login') {
      setAppState('terminal');
    }
  }, [loading, meshUser, appState]);

  return (
    <div className="app-container crt-flicker">
      <TitleBar />
      <div className="app-content">
        {appState === 'boot' && <Boot onComplete={handleBootComplete} />}
        {appState === 'login' && !loading && (
          <Login onLogin={handleLogin} onSignup={handleSignup} />
        )}
        {appState === 'login' && loading && (
          <div className="loading-screen">
            <span className="cursor-blink">Authenticating...</span>
          </div>
        )}
        {appState === 'terminal' && meshUser && (
          <Terminal
            user={meshUser}
            onLogout={handleLogout}
            onSchemeChange={setSchemeName}
            currentScheme={schemeName}
            customColour={customColour}
            onCustomColourChange={setCustomColour}
          />
        )}
      </div>
      <div className="crt-overlay" />
    </div>
  );
}

export default App;
