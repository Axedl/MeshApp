import { useState, useRef, useCallback, useEffect } from 'react';
import './FloatingPanel.css';

interface FloatingPanelProps {
  id: string;             // unique ID for localStorage position key
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultRight?: number;  // default right offset px
  defaultBottom?: number; // default bottom offset px
  collapsedByDefault?: boolean;
  onClose?: () => void;
}

export function FloatingPanel({
  id,
  title,
  icon,
  children,
  defaultRight = 16,
  defaultBottom = 60,
  collapsedByDefault = false,
  onClose,
}: FloatingPanelProps) {
  const storageKey = `mesh_panel_${id}`;
  const savedState = (() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch { return null; }
  })();

  const [collapsed, setCollapsed] = useState(savedState?.collapsed ?? collapsedByDefault);
  const [pos, setPos] = useState<{ right: number; bottom: number }>(
    savedState?.pos ?? { right: defaultRight, bottom: defaultBottom }
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const dragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, right: 0, bottom: 0 });
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Persist state
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ collapsed, pos }));
  }, [collapsed, pos, storageKey]);

  // Clean up any active drag listeners if panel unmounts mid-drag
  useEffect(() => {
    return () => { dragCleanupRef.current?.(); };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      right: posRef.current.right,
      bottom: posRef.current.bottom,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStart.current.mouseX;
      const dy = ev.clientY - dragStart.current.mouseY;
      setPos({
        right: Math.max(0, dragStart.current.right - dx),
        bottom: Math.max(0, dragStart.current.bottom - dy),
      });
    };

    const onMouseUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div
      className={`floating-panel ${collapsed ? 'collapsed' : ''}`}
      ref={panelRef}
      style={{ right: pos.right, bottom: pos.bottom }}
    >
      <div className="floating-panel-header" onMouseDown={onMouseDown}>
        <span className="floating-panel-title">
          {icon && <span className="floating-panel-icon">{icon}</span>}
          {title}
        </span>
        <div className="floating-panel-controls">
          <button
            className="floating-panel-btn"
            onClick={() => setCollapsed((c: boolean) => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▲' : '▼'}
          </button>
          {onClose && (
            <button className="floating-panel-btn close-btn" onClick={onClose} title="Close">✕</button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="floating-panel-body">
          {children}
        </div>
      )}
    </div>
  );
}
