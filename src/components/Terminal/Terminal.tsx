import { useState, useEffect, useRef, useCallback } from 'react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { InWorldClock } from '../InWorldClock/InWorldClock';
import { GMControlsPanel } from '../GMControlsPanel/GMControlsPanel';
import { MiniDiceRoller } from '../Dice/MiniDice';
import { SignalBars } from '../SignalBars/SignalBars';
import { useSignalStrength } from '../../hooks/useSignalStrength';
import { GhostSignal } from '../GhostSignal/GhostSignal';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { RoleIcon } from '../RoleIcon/RoleIcon';
import { NotificationCenter } from '../NotificationCenter/NotificationCenter';
import type { MeshEvent, MeshEventType } from '../NotificationCenter/NotificationCenter';
import { useRoleSkin } from '../../hooks/useRoleSkin';
import { useSkin } from '../../hooks/useSkin';
import { useDrift } from '../../hooks/useDrift';
import type { MeshUser, AppModule, PcSheet, KiriHouCanvas as KiriHouCanvasType, KiriHouEntry } from '../../types';
import type { ToastMessage } from '../Toast/Toast';
import { supabase } from '../../lib/supabase';
import { notify } from '../../hooks/useNotifications';
import {
  GHOST_SAFE_MODULES,
  NAV_LIST,
  getModuleEntry,
  isSeparator,
  renderAppModule,
  renderGhostModule,
} from '../../modules/registry';
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

const EVENT_META: Record<ToastMessage['type'], { title: string; module: AppModule; type: MeshEventType }> = {
  email: { title: 'Mail packet received', module: 'email', type: 'email' },
  chat: { title: 'Chat traffic detected', module: 'chat', type: 'chat' },
  file: { title: 'File system changed', module: 'files', type: 'file' },
};

const SIGNAL_SOURCE_NPC_ID = '00000000-0000-0000-0000-000000000001';

function summarizeKiriEntries(entries: KiriHouEntry[]): string {
  return entries
    .map(entry => [
      entry.id,
      entry.cyberware_name,
      entry.body_region,
      entry.install_date,
      entry.clinic_name,
      entry.humanity_cost,
      entry.gm_note_sealed,
      entry.gm_note_drift_unlock,
    ].join('|'))
    .join('::');
}

function normalizeTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((tag): tag is string => typeof tag === 'string');
  if (typeof tags === 'string') return tags.replace(/[{}]/g, '').split(',').map(tag => tag.trim()).filter(Boolean);
  return [];
}

export function Terminal({ user, onLogout, onSchemeChange, currentScheme, customColour, onCustomColourChange, triggerToast }: TerminalProps) {
  const [activeModule, setActiveModule] = useState<AppModule>('email');
  const activeModuleRef = useRef<AppModule>('email');
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  useRoleSkin(user.role);
  useSkin(user.role);

  // module_ghost: drift glitch that briefly renders another module at low opacity
  const glitches = useDrift(user.id);
  const previousGlitchesRef = useRef<string>('');
  const kiriSignatureRef = useRef<string | null>(null);
  const netDropSeenRef = useRef<Set<string>>(new Set());
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

  const [feedOpen, setFeedOpen] = useState(false);
  const [events, setEvents] = useState<MeshEvent[]>(() => {
    try {
      const raw = localStorage.getItem(`mesh_events_${user.id}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MeshEvent[];
      return Array.isArray(parsed) ? parsed.slice(0, 80) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`mesh_events_${user.id}`, JSON.stringify(events.slice(0, 80)));
    } catch {
      // Feed persistence is immersive polish; storage failure should never block play.
    }
  }, [events, user.id]);

  const addEvent = useCallback((event: Omit<MeshEvent, 'id' | 'createdAt' | 'read'>) => {
    setEvents(prev => [
      {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ].slice(0, 80));
  }, []);

  const markAllEventsRead = useCallback(() => {
    setEvents(prev => prev.map(event => ({ ...event, read: true })));
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const openEvent = useCallback((event: MeshEvent) => {
    setEvents(prev => prev.map(item => item.id === event.id ? { ...item, read: true } : item));
    if (event.module) {
      setActiveModule(event.module);
      setMobileNavOpen(false);
      setFeedOpen(false);
    }
  }, []);

  const triggerToastAndEvent = useCallback((type: ToastMessage['type'], message: string) => {
    triggerToast(type, message);
    const meta = EVENT_META[type];
    const isSignalIntercept = message.toLowerCase().includes('signal intercept');
    addEvent({
      type: isSignalIntercept ? 'deaddrop' : meta.type,
      title: isSignalIntercept ? 'Dead drop recovered' : meta.title,
      body: message,
      module: meta.module,
    });
  }, [addEvent, triggerToast]);

  useEffect(() => {
    if (user.is_gm) return;
    const previous = new Set(previousGlitchesRef.current ? previousGlitchesRef.current.split(',') : []);
    const current = [...glitches].sort();
    previousGlitchesRef.current = current.join(',');

    for (const glitch of current) {
      if (previous.has(glitch)) continue;
      addEvent({
        type: 'drift',
        title: 'Signal anomaly',
        body: `Unstable carrier detected: ${glitch.replace(/_/g, ' ')}`,
      });
    }
  }, [addEvent, glitches, user.is_gm]);

  // Persistent email subscription — lives here so it fires regardless of active module
  useEffect(() => {
    const channel = supabase
      .channel(`email_notify_${user.id}`)
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'mesh_emails', filter: `to_user_id=eq.${user.id}` },
        (payload: { new: Record<string, unknown> }) => {
          const subject = payload.new['subject'] as string | undefined;
          const fromNpcId = payload.new['from_npc_id'] as string | undefined;
          const isDeadDrop = fromNpcId === SIGNAL_SOURCE_NPC_ID;
          notify('MESH — New Email', subject ? `Subject: ${subject}` : 'You have a new message');
          addEvent({
            type: isDeadDrop ? 'deaddrop' : 'email',
            title: isDeadDrop ? 'Dead drop received' : 'Mail packet received',
            body: subject ? `Subject: ${subject}` : isDeadDrop ? 'Unknown source packet delivered' : 'You have a new message',
            module: 'email',
          });
          if (activeModuleRef.current !== 'email') {
            triggerToast('email', subject ? `New message: ${subject}` : 'New message received');
          }
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [addEvent, user.id, triggerToast]);

  useEffect(() => {
    const loadKiriSignature = async () => {
      const { data } = await supabase
        .from('mesh_kiri_hou_canvas')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      const canvas = data as KiriHouCanvasType | null;
      kiriSignatureRef.current = canvas ? summarizeKiriEntries(canvas.entries ?? []) : null;
    };

    loadKiriSignature();

    const channel = supabase
      .channel(`kiri_feed_${user.id}`)
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: 'mesh_kiri_hou_canvas', filter: `owner_id=eq.${user.id}` },
        (payload: { eventType?: string; new?: Record<string, unknown> }) => {
          const entries = (payload.new?.['entries'] ?? []) as KiriHouEntry[];
          const nextSignature = summarizeKiriEntries(entries);
          const previousSignature = kiriSignatureRef.current;
          kiriSignatureRef.current = nextSignature;

          if (previousSignature === null) {
            addEvent({
              type: 'kirihou',
              title: 'Kiri Hou record initialized',
              body: entries.length ? `${entries.length} cyberware entries on record` : 'Cyberware canvas opened',
              module: 'kirihOU',
            });
            return;
          }

          if (previousSignature !== nextSignature) {
            addEvent({
              type: 'kirihou',
              title: 'Kiri Hou record changed',
              body: 'Cyberware ledger metadata shifted',
              module: 'kirihOU',
            });
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [addEvent, user.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`net_drop_feed_${user.id}`)
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'mesh_net_content' },
        (payload: { new: Record<string, unknown> }) => {
          const id = payload.new['id'] as string | undefined;
          const tags = normalizeTags(payload.new['tags']);
          if (!id || !tags.includes('__dead_drop__') || netDropSeenRef.current.has(id)) return;

          netDropSeenRef.current.add(id);
          const title = payload.new['title'] as string | undefined;
          addEvent({
            type: 'deaddrop',
            title: 'Dead drop indexed',
            body: title ? `Search node exposed: ${title}` : 'Search node exposed',
            module: 'netsearch',
          });
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [addEvent, user.id]);

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

  const renderModule = () => renderAppModule(activeModule, {
    user,
    onLogout,
    onSchemeChange,
    currentScheme,
    customColour,
    onCustomColourChange,
    triggerToast: triggerToastAndEvent,
    setUnreadEmails,
    setUnreadChat,
    setNewFiles,
    handleCombatActiveChange,
  });

  const activeModuleEntry = getModuleEntry(activeModule);
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
            if (isSeparator(entry)) {
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
            {activeModuleEntry?.icon}{' '}
            {activeModuleEntry?.label}
          </span>
          <span className="module-divider">{'─'.repeat(60)}</span>
          <NotificationCenter
            events={events}
            open={feedOpen}
            onToggle={() => {
              setFeedOpen(open => !open);
              if (!feedOpen) markAllEventsRead();
            }}
            onClose={() => setFeedOpen(false)}
            onMarkAllRead={markAllEventsRead}
            onClear={clearEvents}
            onOpenEvent={openEvent}
          />
        </div>
        <div className="module-body">
          {ghostModule && (
            <div className="module-ghost-overlay">
              <ErrorBoundary key={`ghost-${ghostModule}`}>
                {renderGhostModule(ghostModule, user)}
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
