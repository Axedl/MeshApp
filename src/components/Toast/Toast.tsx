import { useEffect, useState } from 'react';
import './Toast.css';

export interface ToastMessage {
  id: string;
  type: 'email' | 'chat' | 'file';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastMessage['type'], string> = {
  email: '✉',
  chat:  '⬡',
  file:  '▤',
};

const LABELS: Record<ToastMessage['type'], string> = {
  email: 'EMAIL',
  chat:  'CHAT',
  file:  'FILES',
};

const SHOW_MS  = 3500; // begin exit animation
const TOTAL_MS = 4000; // call onDismiss

export function Toast({ toasts, onDismiss }: ToastProps) {
  const current = toasts[0] ?? null;
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!current) return;
    setExiting(false);
    const exitTimer    = window.setTimeout(() => setExiting(true),         SHOW_MS);
    const dismissTimer = window.setTimeout(() => onDismiss(current.id),   TOTAL_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  return (
    <div className={`toast-wrapper ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <span className="toast-icon">{ICONS[current.type]}</span>
      <div className="toast-body">
        <span className="toast-label">{LABELS[current.type]}</span>
        <span className="toast-message">{current.message}</span>
      </div>
    </div>
  );
}
