import { useState } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { EmailModule } from '../Email/Email';
import { ChatModule } from '../Chat/Chat';
import { NetSearchModule } from '../NetSearch/NetSearch';
import { ContactsModule } from '../Contacts/Contacts';
import { FilesModule } from '../Files/Files';
import { SettingsModule } from '../Settings/Settings';
import { UserManagementModule } from '../UserManagement/UserManagement';
import { CharacterSheetModule } from '../CharacterSheet/CharacterSheet';
import { DiceModule } from '../Dice/Dice';
import { HackingModule } from '../Hacking/Hacking';
import { RunnerModule } from '../Runner/Runner';
import type { MeshUser, AppModule } from '../../types';
import './Terminal.css';

interface TerminalProps {
  user: MeshUser;
  onLogout: () => void;
  onSchemeChange: (scheme: string) => void;
  currentScheme: string;
  customColour: string;
  onCustomColourChange: (colour: string) => void;
}

const MODULES: { id: AppModule; label: string; icon: string; gmOnly?: boolean; visible?: (u: MeshUser) => boolean }[] = [
  { id: 'email',   label: 'EMAIL',    icon: '✉' },
  { id: 'chat',    label: 'CHAT',     icon: '⬡' },
  { id: 'netsearch', label: 'NET',    icon: '◎' },
  { id: 'contacts', label: 'CONTACTS', icon: '◆' },
  { id: 'files',   label: 'FILES',    icon: '▤' },
  { id: 'sheet',   label: 'SHEET',    icon: '◈' },
  { id: 'dice',    label: 'DICE',     icon: '⚄' },
  { id: 'runner',  label: 'RUNNER',   icon: '▸' },
  { id: 'hacking', label: 'JACK IN',  icon: '⌬', visible: (u) => u.is_gm || u.role.toLowerCase() === 'netrunner' },
  { id: 'users',   label: 'USERS',    icon: '⊕', gmOnly: true },
  { id: 'settings', label: 'CONFIG',  icon: '⚙' },
];

export function Terminal({ user, onLogout, onSchemeChange, currentScheme, customColour, onCustomColourChange }: TerminalProps) {
  const [activeModule, setActiveModule] = useState<AppModule>('email');

  const handleOpenSprawl = async () => {
    try {
      const w = new WebviewWindow('sprawl', {
        url: 'https://thesprawl.netlify.app/',
        title: 'THE SPRAWL',
        width: 1200,
        height: 800,
        decorations: true,
      });
      w.once('tauri://error', (e) => console.error('Sprawl window error', e));
    } catch {
      // browser/dev env fallback
      window.open('https://thesprawl.netlify.app/', '_blank');
    }
  };
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [newFiles, setNewFiles] = useState(0);

  const getBadge = (id: AppModule): number => {
    if (id === 'email') return unreadEmails;
    if (id === 'chat') return unreadChat;
    if (id === 'files') return newFiles;
    return 0;
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'email':
        return <EmailModule user={user} onUnreadChange={setUnreadEmails} />;
      case 'chat':
        return <ChatModule user={user} onUnreadChange={setUnreadChat} isActive={activeModule === 'chat'} />;
      case 'netsearch':
        return <NetSearchModule user={user} />;
      case 'contacts':
        return <ContactsModule user={user} />;
      case 'files':
        return <FilesModule user={user} onNewFilesChange={setNewFiles} />;
      case 'sheet':
        return <CharacterSheetModule user={user} />;
      case 'dice':
        return <DiceModule user={user} />;
      case 'hacking':
        return <HackingModule user={user} />;
      case 'runner':
        return <RunnerModule user={user} />;
      case 'users':
        return <UserManagementModule user={user} />;
      case 'settings':
        return (
          <SettingsModule
            user={user}
            onLogout={onLogout}
            onSchemeChange={onSchemeChange}
            currentScheme={currentScheme}
            customColour={customColour}
            onCustomColourChange={onCustomColourChange}
          />
        );
    }
  };

  const visibleModules = MODULES.filter(mod =>
    (!mod.gmOnly || user.is_gm) &&
    (!mod.visible || mod.visible(user))
  );

  return (
    <div className="terminal">
      <div className="terminal-sidebar">
        <div className="sidebar-user">
          <div className="sidebar-handle glow">{user.handle}</div>
          <div className="sidebar-role">{user.role}</div>
          {user.is_gm && <div className="sidebar-gm-badge">[GM]</div>}
        </div>
        <div className="sidebar-divider" />
        <nav className="sidebar-nav">
          {visibleModules.map(mod => {
            const badge = getBadge(mod.id);
            return (
              <button
                key={mod.id}
                className={`sidebar-btn ${activeModule === mod.id ? 'active' : ''}`}
                onClick={() => setActiveModule(mod.id)}
              >
                <span className="sidebar-icon">{mod.icon}</span>
                <span className="sidebar-label">{mod.label}</span>
                {badge > 0 && <span className="sidebar-badge">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-divider" />
        <button className="sidebar-btn sprawl-btn" onClick={handleOpenSprawl} title="Open The Sprawl">
          <span className="sidebar-icon">▦</span>
          <span className="sidebar-label">SPRAWL</span>
          <span className="sidebar-ext">↗</span>
        </button>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot online" />
            <span>ONLINE</span>
          </div>
        </div>
      </div>
      <div className="terminal-content">
        <div className="module-header">
          <span className="module-title">
            {visibleModules.find(m => m.id === activeModule)?.icon}{' '}
            {visibleModules.find(m => m.id === activeModule)?.label}
          </span>
          <span className="module-divider">{'─'.repeat(60)}</span>
        </div>
        <div className="module-body">
          {renderModule()}
        </div>
      </div>
    </div>
  );
}
