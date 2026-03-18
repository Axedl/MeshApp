import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, JournalEntry, JournalCategory } from '../../types';
import './Journal.css';

interface JournalModuleProps {
  user: MeshUser;
}

type JournalView = 'list' | 'view' | 'create' | 'edit';

const CATEGORIES: { id: JournalCategory; label: string; icon: string }[] = [
  { id: 'session',   label: 'SESSION',   icon: '◎' },
  { id: 'npc',       label: 'NPC',       icon: '◆' },
  { id: 'location',  label: 'LOCATION',  icon: '▤' },
  { id: 'faction',   label: 'FACTION',   icon: '⬡' },
  { id: 'plot',      label: 'PLOT',      icon: '⌬' },
];

export function JournalModule({ user }: JournalModuleProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<JournalView>('list');
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [filterCategory, setFilterCategory] = useState<JournalCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<JournalCategory>('session');
  const [formBody, setFormBody] = useState('');
  const [formTags, setFormTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_journal_entries')
      .select('*')
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false });
    if (data) setEntries(data as JournalEntry[]);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const openEntry = (entry: JournalEntry) => {
    setSelected(entry);
    setView('view');
  };

  const startCreate = () => {
    setFormTitle('');
    setFormCategory('session');
    setFormBody('');
    setFormTags('');
    setSaveError('');
    setSelected(null);
    setView('create');
  };

  const startEdit = (entry: JournalEntry) => {
    setFormTitle(entry.title);
    setFormCategory(entry.category);
    setFormBody(entry.body);
    setFormTags(entry.tags.join(', '));
    setSaveError('');
    setSelected(entry);
    setView('edit');
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formBody.trim()) return;
    setSaving(true);
    setSaveError('');
    const tags = formTags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      body: formBody.trim(),
      tags,
      created_by: user.id,
    };

    if (view === 'edit' && selected) {
      const { error } = await supabase
        .from('mesh_journal_entries')
        .update(payload)
        .eq('id', selected.id);
      if (error) { setSaveError(`[ERR] ${error.message}`); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('mesh_journal_entries').insert(payload);
      if (error) { setSaveError(`[ERR] ${error.message}`); setSaving(false); return; }
    }

    await fetchEntries();
    setView('list');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('mesh_journal_entries').delete().eq('id', id);
    setView('list');
    setSelected(null);
    fetchEntries();
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' });

  const getCatInfo = (id: JournalCategory) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];

  const filtered = entries.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  if (loading) return <div className="journal-loading">Loading journal...</div>;

  return (
    <div className="journal-module">
      {/* Toolbar */}
      <div className="journal-toolbar">
        <input
          className="journal-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search entries..."
        />
        <div className="journal-cat-filters">
          <button
            className={`journal-cat-btn ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >ALL</button>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`journal-cat-btn ${filterCategory === c.id ? 'active' : ''}`}
              onClick={() => setFilterCategory(c.id)}
            >{c.icon} {c.label}</button>
          ))}
        </div>
        <button className="journal-new-btn" onClick={startCreate}>+ NEW ENTRY</button>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="journal-list">
          {filtered.length === 0 ? (
            <div className="journal-empty">
              {search || filterCategory !== 'all' ? '[ No matching entries ]' : '[ No journal entries yet — click + NEW ENTRY ]'}
            </div>
          ) : (
            filtered.map(entry => {
              const cat = getCatInfo(entry.category);
              return (
                <div key={entry.id} className="journal-row" onClick={() => openEntry(entry)}>
                  <span className="journal-row-icon" data-cat={entry.category}>{cat.icon}</span>
                  <span className="journal-row-cat" data-cat={entry.category}>{cat.label}</span>
                  <span className="journal-row-title">{entry.title}</span>
                  {entry.tags.length > 0 && (
                    <span className="journal-row-tags">{entry.tags.map(t => `#${t}`).join(' ')}</span>
                  )}
                  <span className="journal-row-date">{formatDate(entry.updated_at)}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View/read */}
      {view === 'view' && selected && (
        <div className="journal-detail">
          <div className="journal-detail-header">
            <span className="journal-detail-cat" data-cat={selected.category}>
              {getCatInfo(selected.category).icon} {getCatInfo(selected.category).label}
            </span>
            <span className="journal-detail-date">Updated: {formatDate(selected.updated_at)}</span>
          </div>
          <div className="journal-detail-title">{selected.title}</div>
          {selected.tags.length > 0 && (
            <div className="journal-detail-tags">{selected.tags.map(t => `#${t}`).join('  ')}</div>
          )}
          <pre className="journal-detail-body">{selected.body}</pre>
          <div className="journal-detail-actions">
            <button onClick={() => setView('list')}>BACK</button>
            <button onClick={() => startEdit(selected)}>EDIT</button>
            <button className="delete-btn" onClick={() => handleDelete(selected.id)}>DELETE</button>
          </div>
        </div>
      )}

      {/* Create / edit form */}
      {(view === 'create' || view === 'edit') && (
        <div className="journal-form">
          <div className="journal-form-header">
            {view === 'edit' ? `[EDITING] ${selected?.title}` : 'NEW JOURNAL ENTRY'}
          </div>

          <div className="journal-form-row">
            <label>TITLE:</label>
            <input
              className="journal-form-input"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Entry title..."
            />
          </div>

          <div className="journal-form-row">
            <label>CATEGORY:</label>
            <select
              className="journal-form-select"
              value={formCategory}
              onChange={e => setFormCategory(e.target.value as JournalCategory)}
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          <div className="journal-form-row journal-form-body-row">
            <label>NOTES:</label>
            <textarea
              className="journal-form-textarea"
              value={formBody}
              onChange={e => setFormBody(e.target.value)}
              rows={12}
              placeholder="Write your notes here..."
            />
          </div>

          <div className="journal-form-row">
            <label>TAGS:</label>
            <input
              className="journal-form-input"
              value={formTags}
              onChange={e => setFormTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          {saveError && <div className="journal-form-error">{saveError}</div>}

          <div className="journal-form-actions">
            <button
              onClick={handleSave}
              disabled={saving || !formTitle.trim() || !formBody.trim()}
            >
              {saving ? 'SAVING...' : '[ SAVE ENTRY ]'}
            </button>
            <button onClick={() => setView(selected ? 'view' : 'list')}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}
