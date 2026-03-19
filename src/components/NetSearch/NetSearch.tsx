import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, NetContent, Article } from '../../types';
import './NetSearch.css';

interface NetSearchModuleProps {
  user: MeshUser;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source: string;
  date: string;
  type: 'net' | 'sprawl';
  fullContent: string;
  slug?: string;
}

export function NetSearchModule({ user }: NetSearchModuleProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // GM content editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editVisibleTo, setEditVisibleTo] = useState('');
  const [saving, setSaving] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelectedResult(null);
    setHasSearched(true);

    const searchTerm = `%${query.trim()}%`;
    const combined: SearchResult[] = [];

    // Search mesh_net_content
    const { data: netData } = await supabase
      .from('mesh_net_content')
      .select('*')
      .or(`title.ilike.${searchTerm},body.ilike.${searchTerm},tags.cs.{${query.trim()}}`)
      .limit(20);

    if (netData) {
      (netData as NetContent[]).forEach(item => {
        combined.push({
          id: item.id,
          title: item.title,
          snippet: item.body.substring(0, 200) + (item.body.length > 200 ? '...' : ''),
          source: item.source_name,
          date: item.created_at,
          type: 'net',
          fullContent: item.body,
        });
      });
    }

    // Search The Sprawl articles
    const { data: articleData } = await supabase
      .from('articles')
      .select('*')
      .or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`)
      .limit(20);

    if (articleData) {
      (articleData as Article[]).forEach(item => {
        combined.push({
          id: item.id,
          title: item.title,
          snippet: item.body.substring(0, 200) + (item.body.length > 200 ? '...' : ''),
          source: `The Sprawl — ${item.author}`,
          date: item.created_at,
          type: 'sprawl',
          fullContent: item.body,
          slug: item.slug,
        });
      });
    }

    // Sort by date descending
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setResults(combined);
    setSearching(false);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  const handleSaveContent = async () => {
    setSaving(true);
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const visibleTo = editVisibleTo.trim() ? editVisibleTo.split(',').map(t => t.trim()) : null;

    await supabase.from('mesh_net_content').insert({
      title: editTitle,
      body: editBody,
      source_name: editSource || 'Unknown Source',
      tags,
      visible_to: visibleTo,
      created_by: user.id,
    });

    setEditTitle('');
    setEditBody('');
    setEditSource('');
    setEditTags('');
    setEditVisibleTo('');
    setShowEditor(false);
    setSaving(false);
  };

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  if (selectedResult) {
    return (
      <div className="net-viewer">
        <div className="net-viewer-header">
          <button onClick={() => setSelectedResult(null)}>← BACK TO RESULTS</button>
        </div>
        <div className="net-viewer-meta">
          <div className="net-viewer-title glow">{selectedResult.title}</div>
          <div className="net-viewer-source">
            SOURCE: {selectedResult.source} | {formatDate(selectedResult.date)}
            {selectedResult.type === 'sprawl' && <span className="sprawl-badge">SPRAWL</span>}
          </div>
        </div>
        <div className="net-viewer-body">{selectedResult.fullContent}</div>
        {selectedResult.type === 'sprawl' && selectedResult.slug && (
          <div className="net-viewer-actions">
            <button
              className="net-sprawl-link"
              onClick={async () => {
                const url = `https://thesprawl.netlify.app/article/${selectedResult.slug}`;
                try {
                  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
                  const w = new WebviewWindow('sprawl-article', {
                    url,
                    title: 'THE SPRAWL',
                    width: 1200,
                    height: 800,
                    decorations: true,
                  });
                  w.once('tauri://error', (e) => console.error('Sprawl window error', e));
                } catch {
                  window.open(url, '_blank');
                }
              }}
            >
              [ VIEW IN SPRAWL ↗ ]
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="net-module">
      <div className="net-search-bar">
        <span className="net-prompt">NET://</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search the mesh..."
          className="net-input"
          autoFocus
        />
        <button onClick={search} disabled={searching} className="net-search-btn">
          {searching ? 'SCANNING...' : 'SEARCH'}
        </button>
        {user.is_gm && (
          <button onClick={() => setShowEditor(!showEditor)} className="net-editor-btn">
            {showEditor ? 'CLOSE EDITOR' : '+ CONTENT'}
          </button>
        )}
      </div>

      {user.is_gm && showEditor && (
        <div className="net-editor">
          <div className="net-editor-header">[GM] CREATE NET CONTENT</div>
          <div className="editor-field">
            <label>TITLE:</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div className="editor-field">
            <label>SOURCE:</label>
            <input value={editSource} onChange={e => setEditSource(e.target.value)} placeholder="e.g. Biotechnica PR" />
          </div>
          <div className="editor-field">
            <label>TAGS:</label>
            <input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="comma separated" />
          </div>
          <div className="editor-field">
            <label>VISIBLE TO (IDs):</label>
            <input value={editVisibleTo} onChange={e => setEditVisibleTo(e.target.value)} placeholder="blank = all, or comma-separated user IDs" />
          </div>
          <div className="editor-field editor-body">
            <label>BODY:</label>
            <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={8} />
          </div>
          <button onClick={handleSaveContent} disabled={saving || !editTitle || !editBody}>
            {saving ? 'SAVING...' : '[ PUBLISH ]'}
          </button>
        </div>
      )}

      <div className="net-results">
        {!hasSearched && (
          <div className="net-welcome">
            <pre className="net-ascii">{`
  ╔══════════════════════════════════╗
  ║    M E S H   N E T W O R K      ║
  ║    Search Engine v2.7.1          ║
  ╚══════════════════════════════════╝`}</pre>
            <div className="net-welcome-text">Enter a query to search the mesh network</div>
          </div>
        )}

        {hasSearched && results.length === 0 && !searching && (
          <div className="net-no-results">[0 RESULTS] No data found matching query: "{query}"</div>
        )}

        {results.map(result => (
          <div key={`${result.type}-${result.id}`} className="net-result" onClick={() => setSelectedResult(result)}>
            <div className="net-result-title">
              {result.title}
              {result.type === 'sprawl' && <span className="sprawl-badge">SPRAWL</span>}
            </div>
            <div className="net-result-snippet">{result.snippet}</div>
            <div className="net-result-meta">
              {result.source} | {formatDate(result.date)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
