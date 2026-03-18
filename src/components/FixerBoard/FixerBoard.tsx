import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, Listing } from '../../types';
import './FixerBoard.css';

interface FixerBoardModuleProps {
  user: MeshUser;
}

type FilterType = 'all' | 'job' | 'rumor' | 'item' | 'wanted' | 'intel';
type BoardView = 'list' | 'detail' | 'create';

const TYPE_ICONS: Record<string, string> = {
  job: '◈',
  rumor: '◎',
  item: '▤',
  wanted: '⊕',
  intel: '◆',
};

const FILTER_LABELS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'job', label: 'JOB' },
  { id: 'rumor', label: 'RUMOR' },
  { id: 'item', label: 'ITEM' },
  { id: 'wanted', label: 'WANTED' },
  { id: 'intel', label: 'INTEL' },
];

export function FixerBoardModule({ user }: FixerBoardModuleProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [view, setView] = useState<BoardView>('list');
  const [selected, setSelected] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  // GM create form state
  const [newType, setNewType] = useState<Listing['type']>('job');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newCredit, setNewCredit] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // GM detail edit state
  const [editStatus, setEditStatus] = useState<Listing['status']>('open');
  const [editActive, setEditActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchListings = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FixerBoard] Failed to load listings:', error.message);
    }
    if (data) setListings(data as Listing[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useRealtime({
    table: 'listings',
    onInsert: () => fetchListings(),
    onUpdate: () => fetchListings(),
    onDelete: () => fetchListings(),
  });

  const openDetail = (listing: Listing) => {
    setSelected(listing);
    setEditStatus(listing.status);
    setEditActive(listing.is_active);
    setView('detail');
  };

  const handleCreate = async () => {
    if (!newTitle || !newBody) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from('listings').insert({
      type: newType,
      title: newTitle,
      body: newBody,
      contact: newContact || null,
      credit: newCredit || null,
      price: newPrice || null,
      status: 'open',
      is_active: true,
    });
    if (error) {
      setSaveError(`[ERR] ${error.message}`);
      setSaving(false);
      return;
    }
    setNewTitle('');
    setNewBody('');
    setNewContact('');
    setNewCredit('');
    setNewPrice('');
    setNewType('job');
    setView('list');
    setSaving(false);
  };

  const handleUpdateListing = async () => {
    if (!selected) return;
    setUpdating(true);
    const { error } = await supabase
      .from('listings')
      .update({ status: editStatus, is_active: editActive })
      .eq('id', selected.id);
    if (error) {
      console.error('[FixerBoard] Update failed:', error.message);
    } else {
      await fetchListings();
      setView('list');
      setSelected(null);
    }
    setUpdating(false);
  };

  const filtered = filter === 'all' ? listings : listings.filter(l => l.type === filter);

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' });

  if (loading) {
    return <div className="fixerboard-loading">Accessing fixer network...</div>;
  }

  return (
    <div className="fixerboard-module">
      <div className="fixerboard-toolbar">
        {FILTER_LABELS.map(f => (
          <button
            key={f.id}
            className={filter === f.id ? 'active' : ''}
            onClick={() => { setFilter(f.id); setView('list'); }}
          >
            {f.label}
          </button>
        ))}
        {user.is_gm && (
          <button
            className={`gm-btn ${view === 'create' ? 'active' : ''}`}
            onClick={() => setView(view === 'create' ? 'list' : 'create')}
          >
            + POST
          </button>
        )}
      </div>

      {view === 'create' && user.is_gm && (
        <div className="listing-create">
          <div className="create-header">[GM] NEW FIXER BOARD POST</div>

          <div className="create-row">
            <label>TYPE:</label>
            <select value={newType} onChange={e => setNewType(e.target.value as Listing['type'])}>
              <option value="job">JOB</option>
              <option value="rumor">RUMOR</option>
              <option value="item">ITEM</option>
              <option value="wanted">WANTED</option>
              <option value="intel">INTEL</option>
            </select>
          </div>

          <div className="create-row">
            <label>TITLE:</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Listing title..." />
          </div>

          <div className="create-row create-body-row">
            <label>BODY:</label>
            <textarea value={newBody} onChange={e => setNewBody(e.target.value)} rows={5} placeholder="Full listing details..." />
          </div>

          <div className="create-row">
            <label>CONTACT:</label>
            <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Contact handle or method..." />
          </div>

          <div className="create-row">
            <label>SOURCE:</label>
            <input value={newCredit} onChange={e => setNewCredit(e.target.value)} placeholder="Credit / origin..." />
          </div>

          <div className="create-row">
            <label>PRICE:</label>
            <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="e.g. 500eb, negotiable..." />
          </div>

          {saveError && <div className="create-error">{saveError}</div>}

          <div className="create-actions">
            <button onClick={handleCreate} disabled={saving || !newTitle || !newBody}>
              {saving ? 'POSTING...' : '[ POST LISTING ]'}
            </button>
            <button onClick={() => { setView('list'); setSaveError(''); }}>CANCEL</button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="listings-list">
          {filtered.length === 0 ? (
            <div className="listings-empty">[No active listings]</div>
          ) : (
            filtered.map(listing => (
              <div key={listing.id} className="listing-row" onClick={() => openDetail(listing)}>
                <span className="listing-type-icon" data-type={listing.type}>
                  {TYPE_ICONS[listing.type]}
                </span>
                <span className="listing-type-tag" data-type={listing.type}>{listing.type.toUpperCase()}</span>
                <span className="listing-title">{listing.title}</span>
                {listing.price && <span className="listing-price">{listing.price}</span>}
                <span className={`listing-status status-${listing.status}`}>{listing.status.toUpperCase()}</span>
                <span className="listing-date">{formatDate(listing.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'detail' && selected && (
        <div className="listing-detail">
          <div className="detail-header">
            <span className="detail-type-tag" data-type={selected.type}>
              {TYPE_ICONS[selected.type]} {selected.type.toUpperCase()}
            </span>
            <span className={`listing-status status-${selected.status}`}>{selected.status.toUpperCase()}</span>
          </div>

          <div className="detail-title">{selected.title}</div>

          <div className="detail-body">{selected.body}</div>

          <div className="detail-meta">
            {selected.contact && (
              <div className="detail-meta-row">
                <span className="meta-label">CONTACT:</span>
                <span>{selected.contact}</span>
              </div>
            )}
            {selected.credit && (
              <div className="detail-meta-row">
                <span className="meta-label">SOURCE:</span>
                <span>{selected.credit}</span>
              </div>
            )}
            {selected.price && (
              <div className="detail-meta-row">
                <span className="meta-label">PRICE:</span>
                <span>{selected.price}</span>
              </div>
            )}
            <div className="detail-meta-row">
              <span className="meta-label">POSTED:</span>
              <span>{formatDate(selected.created_at)}</span>
            </div>
          </div>

          {user.is_gm && (
            <div className="detail-gm-controls">
              <div className="gm-controls-header">[GM] MANAGE LISTING</div>
              <div className="gm-control-row">
                <label>STATUS:</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as Listing['status'])}>
                  <option value="open">OPEN</option>
                  <option value="filled">FILLED</option>
                  <option value="burned">BURNED</option>
                  <option value="expired">EXPIRED</option>
                </select>
              </div>
              <div className="gm-control-row">
                <label>ACTIVE:</label>
                <label className="toggle-label">
                  <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} />
                  {editActive ? 'YES' : 'NO'}
                </label>
              </div>
              <button onClick={handleUpdateListing} disabled={updating}>
                {updating ? 'UPDATING...' : '[ UPDATE ]'}
              </button>
            </div>
          )}

          <div className="detail-actions">
            <button onClick={() => { setView('list'); setSelected(null); }}>BACK</button>
          </div>
        </div>
      )}
    </div>
  );
}
