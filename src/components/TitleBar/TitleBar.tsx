import { useState, useEffect } from 'react';
import './TitleBar.css';

// Dynamic import for Tauri API - gracefully handle browser environment
let tauriWindow: typeof import('@tauri-apps/api/window') | null = null;

async function loadTauriApi() {
  try {
    tauriWindow = await import('@tauri-apps/api/window');
  } catch {
    // Running in browser, not Tauri
  }
}

loadTauriApi();

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [version, setVersion] = useState('');

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        if (tauriWindow) {
          const win = tauriWindow.getCurrentWindow();
          setIsMaximized(await win.isMaximized());
        }
      } catch { /* browser env */ }
    };
    checkMaximized();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        setVersion(await getVersion());
      } catch { /* browser env */ }
    })();
  }, []);

  const handleMinimize = async () => {
    try {
      if (tauriWindow) await tauriWindow.getCurrentWindow().minimize();
    } catch { /* browser env */ }
  };

  const handleMaximize = async () => {
    try {
      if (tauriWindow) {
        const win = tauriWindow.getCurrentWindow();
        await win.toggleMaximize();
        setIsMaximized(await win.isMaximized());
      }
    } catch { /* browser env */ }
  };

  const handleClose = async () => {
    try {
      if (tauriWindow) await tauriWindow.getCurrentWindow().close();
    } catch { /* browser env */ }
  };

  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar-label" data-tauri-drag-region>
        <span className="title-bar-icon">&#9632;</span>
        <span>MESH{version ? ` v${version}` : ''}</span>
        <span className="title-bar-separator">|</span>
        <span className="title-bar-status">CONNECTED</span>
      </div>
      <div className="title-bar-controls">
        <button className="title-btn" onClick={handleMinimize} title="Minimize">
          &#9472;
        </button>
        <button className="title-btn" onClick={handleMaximize} title="Maximize">
          {isMaximized ? '◻' : '□'}
        </button>
        <button className="title-btn title-btn-close" onClick={handleClose} title="Close">
          &#10005;
        </button>
      </div>
    </div>
  );
}
