import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, MeshFile } from '../../types';
import './Files.css';

interface FilesModuleProps {
  user: MeshUser;
  onNewFilesChange: (count: number) => void;
}

type FileView = 'list' | 'view' | 'create';

export function FilesModule({ user, onNewFilesChange }: FilesModuleProps) {
  const [files, setFiles] = useState<MeshFile[]>([]);
  const [view, setView] = useState<FileView>('list');
  const [selectedFile, setSelectedFile] = useState<MeshFile | null>(null);
  const [loading, setLoading] = useState(true);

  // Create state
  const [newFilename, setNewFilename] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // GM push state
  const [showPush, setShowPush] = useState(false);
  const [pushFilename, setPushFilename] = useState('');
  const [pushContent, setPushContent] = useState('');
  const [pushSource, setPushSource] = useState('');
  const [pushUserId, setPushUserId] = useState('');
  const [pushToAll, setPushToAll] = useState(false);
  const [allUsers, setAllUsers] = useState<MeshUser[]>([]);

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from('mesh_files')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setFiles(data);
      onNewFilesChange(data.filter(f => f.is_new).length);
    }
    setLoading(false);
  }, [user.id, onNewFilesChange]);

  useEffect(() => {
    fetchFiles();
    if (user.is_gm) {
      supabase.from('mesh_users').select('*').eq('is_gm', false).then(({ data, error }) => {
        if (error) console.error('[Files] Failed to load users:', error.message);
        if (data) setAllUsers(data);
      });
    }
  }, [fetchFiles, user.is_gm]);

  useRealtime({
    table: 'mesh_files',
    filter: `owner_id=eq.${user.id}`,
    onInsert: () => fetchFiles(),
  });

  const openFile = async (file: MeshFile) => {
    setSelectedFile(file);
    setView('view');
    if (file.is_new) {
      await supabase.from('mesh_files').update({ is_new: false }).eq('id', file.id);
      fetchFiles();
    }
  };

  const handleCreate = async () => {
    if (!newFilename || !newContent) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from('mesh_files').insert({
      owner_id: user.id,
      filename: newFilename,
      content_type: 'text/plain',
      content_text: newContent,
      source: 'Personal',
      is_new: false,
    });
    if (error) {
      setSaveError(`[ERR] ${error.message}`);
      setSaving(false);
      return;
    }
    setNewFilename('');
    setNewContent('');
    setView('list');
    fetchFiles();
    setSaving(false);
  };

  const handleUploadFile = async () => {
    if (!uploadFile || !newFilename) return;
    setSaving(true);
    setSaveError('');
    const path = `${user.id}/${Date.now()}_${uploadFile.name}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('mesh-files')
      .upload(path, uploadFile, { upsert: false });

    if (storageError) {
      setSaveError(`[ERR] ${storageError.message}`);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('mesh-files').getPublicUrl(storageData.path);
    const { error } = await supabase.from('mesh_files').insert({
      owner_id: user.id,
      filename: newFilename,
      content_type: uploadFile.type || 'application/octet-stream',
      content_text: null,
      storage_path: urlData.publicUrl,
      source: 'Personal',
      is_new: false,
    });

    if (error) {
      setSaveError(`[ERR] ${error.message}`);
      setSaving(false);
      return;
    }

    setNewFilename('');
    setUploadFile(null);
    setView('list');
    fetchFiles();
    setSaving(false);
  };

  const handlePush = async () => {
    if (!pushFilename || !pushContent) return;
    setSaving(true);
    setSaveError('');

    let pushError: { message: string } | null = null;
    if (pushToAll) {
      const inserts = allUsers.map(u => ({
        owner_id: u.id,
        filename: pushFilename,
        content_type: 'text/plain',
        content_text: pushContent,
        source: pushSource || 'Unknown',
        is_new: true,
      }));
      const { error } = await supabase.from('mesh_files').insert(inserts);
      pushError = error;
    } else if (pushUserId) {
      const { error } = await supabase.from('mesh_files').insert({
        owner_id: pushUserId,
        filename: pushFilename,
        content_type: 'text/plain',
        content_text: pushContent,
        source: pushSource || 'Unknown',
        is_new: true,
      });
      pushError = error;
    }

    if (pushError) {
      setSaveError(`[ERR] ${pushError.message}`);
      setSaving(false);
      return;
    }

    setPushFilename('');
    setPushContent('');
    setPushSource('');
    setPushUserId('');
    setPushToAll(false);
    setShowPush(false);
    setSaving(false);
  };

  const handleDelete = async (fileId: string) => {
    await supabase.from('mesh_files').delete().eq('id', fileId);
    setSelectedFile(null);
    setView('list');
    fetchFiles();
  };

  const getFileIcon = (contentType: string): string => {
    if (contentType.startsWith('image/')) return '◫';
    if (contentType === 'text/markdown') return '▤';
    return '▧';
  };

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  if (loading) {
    return <div className="files-loading">Loading file system...</div>;
  }

  return (
    <div className="files-module">
      <div className="files-toolbar">
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>FILES</button>
        <button className={view === 'create' ? 'active' : ''} onClick={() => setView('create')}>+ NEW NOTE</button>
        {user.is_gm && (
          <button className={showPush ? 'active' : ''} onClick={() => setShowPush(!showPush)}>
            PUSH FILE
          </button>
        )}
      </div>

      {user.is_gm && showPush && (
        <div className="files-push-form">
          <div className="push-header">[GM] PUSH FILE TO PLAYER</div>
          <div className="push-field">
            <label>FILENAME:</label>
            <input value={pushFilename} onChange={e => setPushFilename(e.target.value)} />
          </div>
          <div className="push-field">
            <label>SOURCE:</label>
            <input value={pushSource} onChange={e => setPushSource(e.target.value)} placeholder="e.g. Uncle Rob, Data Chip" />
          </div>
          <div className="push-field">
            <label>TO:</label>
            <select value={pushUserId} onChange={e => setPushUserId(e.target.value)} disabled={pushToAll}>
              <option value="">Select player...</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.handle}</option>)}
            </select>
            <label className="push-all-label">
              <input type="checkbox" checked={pushToAll} onChange={e => setPushToAll(e.target.checked)} /> ALL
            </label>
          </div>
          <div className="push-field push-body">
            <label>CONTENT:</label>
            <textarea value={pushContent} onChange={e => setPushContent(e.target.value)} rows={6} />
          </div>
          {saveError && <div className="files-error">{saveError}</div>}
          <button onClick={handlePush} disabled={saving || !pushFilename || !pushContent || (!pushUserId && !pushToAll)}>
            {saving ? 'PUSHING...' : '[ PUSH ]'}
          </button>
        </div>
      )}

      {view === 'list' && (
        <div className="files-list">
          {files.length === 0 ? (
            <div className="files-empty">[File system empty]</div>
          ) : (
            files.map(file => (
              <div
                key={file.id}
                className={`file-row ${file.is_new ? 'new-file' : ''}`}
                onClick={() => openFile(file)}
              >
                <span className="file-icon">{getFileIcon(file.content_type)}</span>
                <span className="file-name">{file.filename}</span>
                {file.is_new && <span className="file-new-badge">NEW</span>}
                <span className="file-source">{file.source}</span>
                <span className="file-date">{formatDate(file.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'view' && selectedFile && (
        <div className="file-viewer">
          <div className="file-viewer-header">
            <div><span className="label">FILE:</span> {selectedFile.filename}</div>
            <div><span className="label">TYPE:</span> {selectedFile.content_type}</div>
            <div><span className="label">FROM:</span> {selectedFile.source}</div>
            <div><span className="label">DATE:</span> {formatDate(selectedFile.created_at)}</div>
          </div>
          <div className="file-viewer-content">
            {selectedFile.storage_path ? (
              selectedFile.content_type.startsWith('image/') ? (
                <img
                  src={selectedFile.storage_path}
                  alt={selectedFile.filename}
                  className="file-viewer-image"
                />
              ) : (
                <a
                  href={selectedFile.storage_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-download-link"
                >
                  [ DOWNLOAD {selectedFile.filename} ]
                </a>
              )
            ) : (
              selectedFile.content_text || '[Binary file — cannot display]'
            )}
          </div>
          <div className="file-viewer-actions">
            <button onClick={() => setView('list')}>BACK</button>
            <button onClick={() => handleDelete(selectedFile.id)} className="delete-btn">DELETE</button>
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="file-create">
          <div className="create-mode-toggle">
            <button
              className={uploadMode === 'text' ? 'active' : ''}
              onClick={() => setUploadMode('text')}
            >TEXT NOTE</button>
            <button
              className={uploadMode === 'file' ? 'active' : ''}
              onClick={() => setUploadMode('file')}
            >UPLOAD FILE</button>
          </div>

          <div className="create-field">
            <label>&gt; FILENAME:</label>
            <input
              value={newFilename}
              onChange={e => setNewFilename(e.target.value)}
              placeholder={uploadMode === 'text' ? 'note.txt' : 'Display name...'}
            />
          </div>

          {uploadMode === 'text' ? (
            <div className="create-field create-body">
              <label>&gt; CONTENT:</label>
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={12} placeholder="Type your notes here..." />
            </div>
          ) : (
            <div className="create-field">
              <label>&gt; FILE:</label>
              <input
                type="file"
                className="file-upload-input"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  if (f && !newFilename) setNewFilename(f.name);
                }}
              />
              {uploadFile && (
                <div className="file-upload-info">
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}

          {saveError && <div className="files-error">{saveError}</div>}
          <div className="create-actions">
            {uploadMode === 'text' ? (
              <button onClick={handleCreate} disabled={saving || !newFilename || !newContent}>
                {saving ? 'SAVING...' : '[ SAVE ]'}
              </button>
            ) : (
              <button onClick={handleUploadFile} disabled={saving || !newFilename || !uploadFile}>
                {saving ? 'UPLOADING...' : '[ UPLOAD ]'}
              </button>
            )}
            <button onClick={() => { setView('list'); setSaveError(''); setUploadFile(null); }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}
