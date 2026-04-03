import { useState, useEffect, useRef, useCallback } from 'react';
import { EmailModule } from '../Email/Email';
import { ChatModule } from '../Chat/Chat';
import { NetSearchModule } from '../NetSearch/NetSearch';
import { ContactsModule } from '../Contacts/Contacts';
import { FilesModule } from '../Files/Files';
import { SettingsModule } from '../Settings/Settings';
import { UserManagementModule } from '../UserManagement/UserManagement';
import { GMDashboardModule } from '../Dashboard/Dashboard';
import { CharacterSheetModule } from '../CharacterSheet/CharacterSheet';
import { DiceModule } from '../Dice/Dice';
import { HackingModule } from '../Hacking/Hacking';
import RunnerModule from '../Runner/Runner';
import { FixerBoardModule } from '../FixerBoard/FixerBoard';
import { JournalModule } from '../Journal/Journal';
import { CombatModule } from '../Combat/Combat';
import { EloModule } from '../Elo/Elo';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { JackIn } from '../JackIn/JackIn';
import { InWorldClock } from '../InWorldClock/InWorldClock';
import { GMControlsPanel } from '../GMControlsPanel/GMControlsPanel';
import { MiniDiceRoller } from '../Dice/MiniDice';
import { SignalBars } from '../SignalBars/SignalBars';
import { useSignalStrength } from '../../hooks/useSignalStrength';
import { GhostSignal } from '../GhostSignal/GhostSignal';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { RoleIcon } from '../RoleIcon/RoleIcon';
import { useRoleSkin } from '../../hooks/useRoleSkin';
import { useSkin } from '../../hooks/useSkin';
import { useDrift } from '../../hooks/useDrift';
import { SignalBoard } from '../SignalBoard/SignalBoard';
import { KiriHouCanvas } from '../KiriHouCanvas/KiriHouCanvas';
import type { MeshUser, AppModule, PcSheet } from '../../types';
import type { ToastMessage } from '../Toast/Toast';
import { supabase } from '../../lib/supabase';
import { notify } from '../../hooks/useNotifications';
import '../../styles/skins/elo-net.css';
import './Terminal.css';

interface TerminalProps {
  user: MeshUser;
  onLogout: () => void;
  onSchemeChange: (scheme: string) => void;
  currentScheme: string;
  customColour: string;
  onCustomColourChange: (colour: string) => void;
  triggerToast: (type: ToastMessage['type'], message: string) => void;
}

// ── Navigation list ────────────────────────────────────────────────────────

type ModuleEntry = { id: AppModule; label: string; icon: string; gmOnly?: boolean };
type SepEntry    = { separator: true; gmOnly?: boolean };
type NavEntry    = ModuleEntry | SepEntry;

const isSep = (e: NavEntry): e is SepEntry => 'separator' in e;

const NAV_LIST: NavEntry[] = [
  { id: 'email',       label: 'EMAIL',        icon: '✉' },
  { id: 'chat',        label: 'CHAT',         icon: '⬡' },
  { id: 'netsearch',   label: 'NET',          icon: '◎' },
  { id: 'elo',         label: 'ELO',          icon: '✦' },
  { id: 'contacts',    label: 'CONTACTS',     icon: '◆' },
  { id: 'files',       label: 'FILES',        icon: '▤' },
  { separator: true },
  { id: 'sheet',       label: 'SHEET',        icon: '◈' },
  { id: 'dice',        label: 'DICE',         icon: '⚄' },
  { id: 'combat',      label: 'COMBAT',       icon: '⚔' },
  { id: 'runner',      label: 'RUNNER',       icon: '▸' },
  { id: 'hacking',     label: 'JACK IN',      icon: '⌬' },
  { id: 'fixerboard',  label: 'FIXERS',       icon: '◆' },
  { id: 'kirihOU',     label: 'KIRI HOU',     icon: '◎' },
  { separator: true, gmOnly: true },
  { id: 'signalboard', label: 'SIGNAL BOARD', icon: '◈', gmOnly: true },
  { id: 'dashboard',   label: 'DASHBOARD',    icon: '◧', gmOnly: true },
  { id: 'users',       label: 'USERS',        icon: '⊕', gmOnly: true },
  { id: 'journal',     label: 'JOURNAL',      icon: '◉', gmOnly: true },
  { separator: true },
  { id: 'settings',    label: 'CONFIG',       icon: '⚙' },
];

// Flat list of module entries only — used for header display
const MODULES = NAV_LIST.filter((e): e is ModuleEntry => !isSep(e));

// ── Component ──────────────────────────────────────────────────────────────

// Safe modules for ghost rendering — complex stateful modules excluded
const GHOST_SAFE_MODULES: AppModule[] = ['email', 'netsearch', 'contacts', 'fixerboard', 'files'];

export function Terminal({ user, onLogout, onSchemeChange, currentScheme, customColour, onCustomColourChange, triggerToast }: TerminalProps) {
  const [activeModule, setActiveModule] = useState<AppModule>('email');
  const activeModuleRef = useRef<AppModule>('email');
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  useRoleSkin(user.role);
  useSkin(user.role);

  // module_ghost: drift glitch that briefly renders another module at low opacity
  const glitches = useDrift(user.id);
  const [ghostModule, setGhostModule] = useState<AppModule | null>(null);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostCooldownRef = useRef<number>(0);

  const scheduleGhost = useCallback(() => {
    const delay = (8 + Math.random() * 7) * 60 * 1000; // 8–15 minutes
    ghostTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - ghostCooldownRef.current < 8 * 60 * 1000) {
        scheduleGhost();
        return;
      }
      const candidates = GHOST_SAFE_MODULES.filter(m => m !== activeModuleRef.current);
      if (!candidates.length) { scheduleGhost(); return; }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      setGhostModule(pick);
      ghostCooldownRef.current = now;
      setTimeout(() => setGhostModule(null), 600);
      scheduleGhost();
    }, delay);
  }, []);

  useEffect(() => {
    if (!glitches.includes('module_ghost') || user.is_gm) return;
    scheduleGhost();
    return () => { if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glitches.includes('module_ghost')]);

  const [combatActive, setCombatActive] = useState(false);
  const [showSheetPanel, setShowSheetPanel] = useState(true);
  const [showDicePanel, setShowDicePanel] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // Collapsed sidebar below 960px
  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      setIsNarrow((entries[0]?.contentRect.width ?? el.offsetWidth) < 960);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Idle detection — activates after 60s of no interaction
  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;

    const onInteract = () => {
      lastInteractionRef.current = Date.now();
      setIsIdle(false);
    };

    el.addEventListener('mousemove', onInteract);
    el.addEventListener('keydown',   onInteract);
    el.addEventListener('mousedown', onInteract);
    el.addEventListener('touchstart', onInteract);

    const interval = setInterval(() => {
      if (Date.now() - lastInteractionRef.current >= 60_000) {
        setIsIdle(true);
      }
    }, 10_000);

    return () => {
      el.removeEventListener('mousemove', onInteract);
      el.removeEventListener('keydown',   onInteract);
      el.removeEventListener('mousedown', onInteract);
      el.removeEventListener('touchstart', onInteract);
      clearInterval(interval);
    };
  }, []);

  const handleCombatActiveChange = (active: boolean) => {
    setCombatActive(active);
    if (active) { setShowSheetPanel(true); setShowDicePanel(true); }
  };

  const [mySheet, setMySheet] = useState<PcSheet | null>(null);

  // Load own sheet and keep the floating panel live via realtime
  useEffect(() => {
    const fetchSheet = async () => {
      const { data } = await supabase
        .from('mesh_pc_sheets')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (data) setMySheet(data as PcSheet);
    };

    fetchSheet();

    const channel = supabase
      .channel(`my_sheet_${user.id}`)
      .on(
        'postgres_changes' as never,
        { event: 'UPDATE', schema: 'public', table: 'mesh_pc_sheets', filter: `owner_id=eq.${user.id}` },
        () => { fetchSheet(); }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user.id]);

  // Persistent email subscription — lives here so it fires regardless of active module
  useEffect(() => {
    const channel = supabase
      .channel(`email_notify_${user.id}`)
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'mesh_emails', filter: `to_user_id=eq.${user.id}` },
        (payload: { new: Record<string, unknown> }) => {
          const subject = payload.new['subject'] as string | undefined;
          notify('MESH — New Email', subject ? `Subject: ${subject}` : 'You have a new message');
          if (activeModuleRef.current !== 'email') {
            triggerToast('email', subject ? `New message: ${subject}` : 'New message received');
          }
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user.id, triggerToast]);

  const handleOpenSprawl = async () => {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
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

  const signalStrength = useSignalStrength();

  const [unreadEmails, setUnreadEmails] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [newFiles, setNewFiles] = useState(0);

  const getBadge = (id: AppModule): number => {
    if (id === 'email') return unreadEmails;
    if (id === 'chat')  return unreadChat;
    if (id === 'files') return newFiles;
    return 0;
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'email':      return <EmailModule user={user} onUnreadChange={setUnreadEmails} />;
      case 'chat':       return <JackIn moduleId="chat"><ChatModule user={user} onUnreadChange={setUnreadChat} isActive={activeModule === 'chat'} onToast={(msg) => triggerToast('chat', msg)} /></JackIn>;
      case 'netsearch':  return <JackIn moduleId="netsearch"><NetSearchModule user={user} /></JackIn>;
      case 'contacts':   return <ContactsModule user={user} />;
      case 'files':      return <JackIn moduleId="files"><FilesModule user={user} onNewFilesChange={setNewFiles} onToast={(msg) => triggerToast('file', msg)} /></JackIn>;
      case 'sheet':      return <CharacterSheetModule user={user} />;
      case 'dice':       return <DiceModule user={user} />;
      case 'hacking':    return <HackingModule user={user} />;
      case 'runner':     return <RunnerModule />;
      case 'fixerboard': return <JackIn moduleId="fixerboard"><FixerBoardModule user={user} /></JackIn>;
      case 'dashboard':  return <GMDashboardModule user={user} />;
      case 'users':      return <UserManagementModule user={user} />;
      case 'journal':    return <JournalModule user={user} />;
      case 'elo':        return <EloModule user={user} />;
      case 'combat':      return <CombatModule user={user} onCombatActiveChange={handleCombatActiveChange} />;
      case 'signalboard': return <SignalBoard user={user} />;
      case 'kirihOU':     return <KiriHouCanvas user={user} />;
      case 'settings':   return (
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

  const visibleModules = MODULES.filter(m => !m.gmOnly || user.is_gm);
  const WOUND_LABELS = ['UNINJURED', 'LIGHTLY WOUNDED', 'SERIOUSLY WOUNDED', 'CRITICALLY WOUNDED', 'MORTALLY WOUNDED', 'DEAD'];

  return (
    <div ref={terminalRef} className={`terminal${isNarrow ? ' terminal-narrow' : ''}${isIdle ? ' is-idle' : ''}${mobileNavOpen ? ' mobile-nav-open' : ''}${activeModule === 'elo' ? ' elo-net-mode' : ''}`}>
      {/* Floating panels — shown during active combat */}
      <GMControlsPanel user={user} />

      {combatActive && showSheetPanel && (
        <FloatingPanel
          id="combat-sheet"
          title="MY SHEET"
          icon="◈"
          defaultRight={16}
          defaultBottom={200}
          collapsedByDefault={false}
          onClose={() => setShowSheetPanel(false)}
        >
          {mySheet ? (
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ color: 'var(--primary-bright)', fontSize: '14px' }}>{mySheet.handle}</div>
              <div style={{ color: 'var(--primary-dim)' }}>HP: <span style={{ color: 'var(--primary)' }}>{mySheet.hp_current}/{mySheet.hp_max}</span></div>
              <div style={{ color: 'var(--primary-dim)' }}>WOUND: <span style={{ color: 'var(--primary)' }}>{WOUND_LABELS[mySheet.wound_state ?? 0]}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '4px' }}>
                {(['INT','REF','DEX','TECH','COOL','WILL','LUCK','MOVE','BODY','EMP'] as const).map((stat) => {
                  const key = `stat_${stat.toLowerCase()}` as keyof PcSheet;
                  return (
                    <div key={stat} style={{ textAlign: 'center', fontSize: '10px' }}>
                      <div style={{ color: 'var(--primary-dim)' }}>{stat}</div>
                      <div style={{ color: 'var(--primary-bright)' }}>{mySheet[key] as number}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--primary-dim)', fontSize: '12px' }}>No sheet found</div>
          )}
        </FloatingPanel>
      )}
      {combatActive && showDicePanel && (
        <FloatingPanel
          id="combat-dice"
          title="DICE ROLLER"
          icon="⚄"
          defaultRight={16}
          defaultBottom={60}
          collapsedByDefault={false}
          onClose={() => setShowDicePanel(false)}
        >
          <MiniDiceRoller />
        </FloatingPanel>
      )}

      <div className="terminal-sidebar">
        <div className="sidebar-user">
          {/* Wide mode: handle + role icon + role + GM badge */}
          <div className="sidebar-handle glow">{user.handle}</div>
          <RoleIcon role={user.role} size={20} className="sidebar-role-icon" />
          <div className="sidebar-role">{user.role}</div>
          {user.is_gm && <div className="sidebar-gm-badge">[GM]</div>}
          {/* Narrow mode: single status dot */}
          <span className="sidebar-user-dot status-dot online" />
        </div>
        <div className="sidebar-divider" />
        <nav className="sidebar-nav">
          {NAV_LIST.map((entry, i) => {
            if (isSep(entry)) {
              if (entry.gmOnly && !user.is_gm) return null;
              return <div key={`sep-${i}`} className="sidebar-sep" />;
            }
            if (entry.gmOnly && !user.is_gm) return null;
            const badge = getBadge(entry.id);
            return (
              <button
                key={entry.id}
                className={`sidebar-btn ${activeModule === entry.id ? 'active' : ''}`}
                onClick={() => { setActiveModule(entry.id); setMobileNavOpen(false); }}
                title={isNarrow ? entry.label : undefined}
              >
                <span className="sidebar-icon">{entry.icon}</span>
                <span className="sidebar-label">{entry.label}</span>
                {badge > 0 && <span className="sidebar-badge">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-divider" />
        <button className="sidebar-btn sprawl-btn" onClick={handleOpenSprawl} title={isNarrow ? 'SPRAWL' : undefined}>
          <span className="sidebar-icon">▦</span>
          <span className="sidebar-label">SPRAWL</span>
          <span className="sidebar-ext">↗</span>
        </button>
        <div className="sidebar-footer">
          <InWorldClock user={user} />
          <div className="sidebar-status-row">
            <div className="sidebar-status">
              <span className="status-dot online" />
              <span className="sidebar-status-label">ONLINE</span>
            </div>
            <div className="sidebar-signal">
              <SignalBars strength={signalStrength} />
            </div>
          </div>
        </div>
      </div>

      <div className="terminal-content">
        <div className="module-header">
          <button
            className="mobile-nav-btn"
            onClick={() => setMobileNavOpen(v => !v)}
            aria-label="Open navigation"
          >☰</button>
          <span className="module-title">
            {visibleModules.find(m => m.id === activeModule)?.icon}{' '}
            {visibleModules.find(m => m.id === activeModule)?.label}
          </span>
          <span className="module-divider">{'─'.repeat(60)}</span>
        </div>
        <div className="module-body">
          {ghostModule && (
            <div className="module-ghost-overlay">
              <ErrorBoundary key={`ghost-${ghostModule}`}>
                {(() => {
                  switch (ghostModule) {
                    case 'email':      return <EmailModule user={user} onUnreadChange={() => {}} />;
                    case 'netsearch':  return <NetSearchModule user={user} />;
                    case 'contacts':   return <ContactsModule user={user} />;
                    case 'fixerboard': return <FixerBoardModule user={user} />;
                    case 'files':      return <FilesModule user={user} onNewFilesChange={() => {}} onToast={() => {}} />;
                    default:           return null;
                  }
                })()}
              </ErrorBoundary>
            </div>
          )}
          <ErrorBoundary key={activeModule}>
            {renderModule()}
          </ErrorBoundary>
        </div>
        <GhostSignal />
      </div>
    </div>
  );
}
