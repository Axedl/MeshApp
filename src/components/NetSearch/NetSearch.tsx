import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { MeshUser, NetContent, Article, NetReply } from '../../types';
import { useRealtime } from '../../hooks/useRealtime';
import './NetSearch.css';
import '../../styles/skins/elo-net.css';

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
  tags?: string[];
  is_forum?: boolean;
}

function normalizeTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags as string[];
  if (typeof tags === 'string') return tags.replace(/[{}]/g, '').split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

export function NetSearchModule({ user }: NetSearchModuleProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [eloMode, setEloMode] = useState(false);

  // Forum reply state
  const [replies, setReplies] = useState<NetReply[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // GM content editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editVisibleTo, setEditVisibleTo] = useState('');
  const [editPublishedAt, setEditPublishedAt] = useState('');
  const [editIsForum, setEditIsForum] = useState(false);
  const [saving, setSaving] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelectedResult(null);
    setHasSearched(true);
    setEloMode(false);

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
          date: item.published_at,
          type: 'net',
          fullContent: item.body,
          tags: normalizeTags(item.tags),
          is_forum: item.is_forum ?? false,
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
          tags: normalizeTags(item.tags),
        });
      });
    }

    // Sort by relevance score
    const q = query.trim().toLowerCase();
    const scoreResult = (r: SearchResult) => {
      let score = 0;
      if (r.title.toLowerCase().includes(q)) score += 3;
      if (r.tags?.some(t => t.toLowerCase().includes(q))) score += 2;
      if (r.snippet.toLowerCase().includes(q)) score += 1;
      return score;
    };
    combined.sort((a, b) => scoreResult(b) - scoreResult(a));

    // ELO mode: trigger if ≥40% of results are ELO-tagged
    const isEloTag = (t: string) => {
      const lower = t.toLowerCase().trim();
      return lower === 'elo' || lower === 'elflines-online' || lower === 'elflines_online' || lower.startsWith('elflines') || lower.startsWith('elo');
    };
    const eloCount = combined.filter(r => r.tags?.some(isEloTag)).length;
    console.log('[ELO] tags:', combined.map(r => r.tags), 'eloCount:', eloCount, '/', combined.length);
    setEloMode(combined.length > 0 && eloCount / combined.length >= 0.4);

    setResults(combined);
    setSearching(false);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  const fetchReplies = useCallback(async (contentId: string) => {
    setReplyLoading(true);
    const { data } = await supabase
      .from('mesh_net_replies')
      .select('*, from_user:mesh_users(*)')
      .eq('content_id', contentId)
      .order('created_at', { ascending: true });
    setReplies((data as NetReply[]) ?? []);
    setReplyLoading(false);
  }, []);

  useEffect(() => {
    if (selectedResult?.type === 'net' && selectedResult.is_forum) {
      fetchReplies(selectedResult.id);
    } else {
      setReplies([]);
    }
  }, [selectedResult, fetchReplies]);

  useRealtime({
    table: 'mesh_net_replies',
    event: 'INSERT',
    filter: selectedResult?.type === 'net' && selectedResult.is_forum
      ? `content_id=eq.${selectedResult.id}`
      : undefined,
    onInsert: () => {
      if (selectedResult?.id) fetchReplies(selectedResult.id);
    },
  });

  const handleSubmitReply = async () => {
    if (!replyInput.trim() || !selectedResult) return;
    await supabase.from('mesh_net_replies').insert({
      content_id: selectedResult.id,
      from_user_id: user.id,
      body: replyInput.trim(),
    });
    setReplyInput('');
    fetchReplies(selectedResult.id);
  };

  const handleDeleteReply = async (id: string) => {
    await supabase.from('mesh_net_replies').delete().eq('id', id);
    if (selectedResult?.id) fetchReplies(selectedResult.id);
  };

  const openEditor = (result?: SearchResult) => {
    if (result) {
      setEditingId(result.id);
      setEditTitle(result.title);
      setEditBody(result.fullContent);
      setEditSource(result.source);
      setEditTags((result.tags ?? []).join(', '));
      setEditVisibleTo('');
      // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:mm)
      const d = new Date(result.date);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditPublishedAt(local);
      setEditIsForum(result.is_forum ?? false);
    } else {
      setEditingId(null);
      setEditTitle('');
      setEditBody('');
      setEditSource('');
      setEditTags('');
      setEditVisibleTo('');
      setEditPublishedAt('');
      setEditIsForum(false);
    }
    setShowEditor(true);
    setSelectedResult(null);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingId(null);
  };

  const handleSaveContent = async () => {
    setSaving(true);
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const visibleTo = editVisibleTo.trim() ? editVisibleTo.split(',').map(t => t.trim()) : null;
    const publishedAt = editPublishedAt ? new Date(editPublishedAt).toISOString() : new Date().toISOString();

    if (editingId) {
      const { error } = await supabase
        .from('mesh_net_content')
        .update({
          title: editTitle,
          body: editBody,
          source_name: editSource || 'Unknown Source',
          tags,
          visible_to: visibleTo,
          published_at: publishedAt,
          is_forum: editIsForum,
        })
        .eq('id', editingId);

      if (!error) {
        setResults(prev => prev.map(r =>
          r.id === editingId
            ? {
                ...r,
                title: editTitle,
                snippet: editBody.substring(0, 200) + (editBody.length > 200 ? '...' : ''),
                source: editSource || 'Unknown Source',
                date: publishedAt,
                fullContent: editBody,
              }
            : r
        ));
      }
    } else {
      await supabase.from('mesh_net_content').insert({
        title: editTitle,
        body: editBody,
        source_name: editSource || 'Unknown Source',
        tags,
        visible_to: visibleTo,
        published_at: publishedAt,
        created_by: user.id,
        is_forum: editIsForum,
      });
    }

    closeEditor();
    setSaving(false);
  };

  const handleDeleteResult = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('mesh_net_content').delete().eq('id', id);
    setResults(prev => prev.filter(r => r.id !== id));
    if (selectedResult?.id === id) setSelectedResult(null);
  };


  if (selectedResult) {
    return (
      <div className={`net-module${eloMode ? ' elo-net-mode' : ''}`}>
      <div className="net-viewer">
        <div className="net-viewer-header">
          <button onClick={() => setSelectedResult(null)}>← BACK TO RESULTS</button>
        </div>
        <div className="net-viewer-meta">
          <div className="net-viewer-title glow">{selectedResult.title}</div>
          <div className="net-viewer-source">
            SOURCE: {selectedResult.source}
            {selectedResult.type === 'sprawl' && <span className="sprawl-badge">SPRAWL</span>}
          </div>
        </div>
        <div className="net-viewer-body">
          <div className="net-viewer-body-content">{selectedResult.fullContent}</div>
          {selectedResult.type === 'net' && selectedResult.is_forum && (
          <div className="net-forum-section">
            <div className="net-forum-label">// REPLIES</div>
            {replyLoading && <div className="net-forum-label">LOADING...</div>}
            {replies.map(reply => (
              <div key={reply.id} className="net-reply">
                <span className="net-reply-handle">@{reply.from_user?.handle ?? 'anon'}</span>
                <span className="net-reply-body">{reply.body}</span>
                {user.is_gm && (
                  <button className="net-reply-delete" onClick={() => handleDeleteReply(reply.id)}>✕</button>
                )}
              </div>
            ))}
            <div className="net-reply-input-area">
              <span className="net-reply-prompt">@{user.handle} &gt;</span>
              <input
                value={replyInput}
                onChange={e => setReplyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(); } }}
                placeholder="Add a reply..."
                className="net-reply-input"
                maxLength={500}
              />
              <button onClick={handleSubmitReply} disabled={!replyInput.trim()}>REPLY</button>
            </div>
          </div>
          )}
        </div>
        <div className="net-viewer-actions">
          {selectedResult.type === 'sprawl' && selectedResult.slug && (
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
          )}
          {user.is_gm && selectedResult.type === 'net' && (
            <>
              <button onClick={() => openEditor(selectedResult)}>[ EDIT ]</button>
              <button
                className="net-delete-btn"
                onClick={async (e) => {
                  await handleDeleteResult(selectedResult.id, e);
                }}
              >
                [ DELETE ]
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className={`net-module${eloMode ? ' elo-net-mode' : ''}`}>
      <div className="net-search-bar">
        <div className="elo-search-frame">
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
        </div>
        {user.is_gm && (
          <button
            onClick={() => showEditor ? closeEditor() : openEditor()}
            className="net-editor-btn"
          >
            {showEditor ? 'CLOSE EDITOR' : '+ CONTENT'}
          </button>
        )}
      </div>

      {user.is_gm && showEditor && (
        <div className="net-editor">
          <div className="net-editor-header">
            {editingId ? '[GM] EDIT NET CONTENT' : '[GM] CREATE NET CONTENT'}
          </div>
          <div className="editor-field">
            <label>TITLE:</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div className="editor-field">
            <label>SOURCE:</label>
            <input value={editSource} onChange={e => setEditSource(e.target.value)} placeholder="e.g. Biotechnica PR" />
          </div>
          <div className="editor-field">
            <label>PUBLISHED:</label>
            <input
              type="datetime-local"
              value={editPublishedAt}
              onChange={e => setEditPublishedAt(e.target.value)}
            />
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
          <div className="editor-field">
            <label>FORUM MODE:</label>
            <input
              type="checkbox"
              checked={editIsForum}
              onChange={e => setEditIsForum(e.target.checked)}
            />
            <span style={{ fontSize: '11px', color: 'var(--primary-dim)' }}>Allow player replies</span>
          </div>
          <button onClick={handleSaveContent} disabled={saving || !editTitle || !editBody}>
            {saving ? 'SAVING...' : editingId ? '[ UPDATE ]' : '[ PUBLISH ]'}
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
              {result.source}
            </div>
            {user.is_gm && result.type === 'net' && (
              <div className="net-result-actions" onClick={e => e.stopPropagation()}>
                <button onClick={(e) => { e.stopPropagation(); openEditor(result); }}>EDIT</button>
                <button
                  className="net-delete-btn"
                  onClick={(e) => handleDeleteResult(result.id, e)}
                >
                  DELETE
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
