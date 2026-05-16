import type { AppModule } from '../../types';
import './NotificationCenter.css';

export type MeshEventType =
  | 'email'
  | 'chat'
  | 'file'
  | 'deaddrop'
  | 'kirihou'
  | 'drift'
  | 'combat'
  | 'system';

export interface MeshEvent {
  id: string;
  type: MeshEventType;
  title: string;
  body: string;
  module?: AppModule;
  createdAt: string;
  read: boolean;
}

interface NotificationCenterProps {
  events: MeshEvent[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClear: () => void;
  onOpenEvent: (event: MeshEvent) => void;
}

const ICONS: Record<MeshEventType, string> = {
  email: '[MAIL]',
  chat: '[CHAT]',
  file: '[FILE]',
  deaddrop: '[DROP]',
  kirihou: '[KIRI]',
  drift: '[SIG]',
  combat: '[COM]',
  system: '[SYS]',
};

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function NotificationCenter({
  events,
  open,
  onToggle,
  onClose,
  onMarkAllRead,
  onClear,
  onOpenEvent,
}: NotificationCenterProps) {
  const unread = events.filter(event => !event.read).length;

  return (
    <div className="notification-center">
      <button
        className={`notification-trigger${open ? ' active' : ''}`}
        onClick={onToggle}
        aria-label="Open signal feed"
        title="Signal feed"
      >
        <span className="notification-trigger-label">FEED</span>
        {unread > 0 && <span className="notification-trigger-count">{unread}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <div className="notification-title">SIGNAL FEED</div>
              <div className="notification-subtitle">{events.length} retained / {unread} unread</div>
            </div>
            <button className="notification-close" onClick={onClose} aria-label="Close signal feed">X</button>
          </div>

          <div className="notification-actions">
            <button onClick={onMarkAllRead} disabled={unread === 0}>MARK READ</button>
            <button onClick={onClear} disabled={events.length === 0}>CLEAR</button>
          </div>

          <div className="notification-list">
            {events.length === 0 ? (
              <div className="notification-empty">No signal traffic retained.</div>
            ) : (
              events.map(event => (
                <button
                  key={event.id}
                  className={`notification-row${event.read ? '' : ' unread'}`}
                  onClick={() => onOpenEvent(event)}
                >
                  <span className="notification-row-icon">{ICONS[event.type]}</span>
                  <span className="notification-row-main">
                    <span className="notification-row-title">{event.title}</span>
                    <span className="notification-row-body">{event.body}</span>
                  </span>
                  <span className="notification-row-time">{formatEventTime(event.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
