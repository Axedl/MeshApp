import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import type { MeshUser, NpcIdentity } from '../../types';
import './Contacts.css';

interface ContactsModuleProps {
  user: MeshUser;
}

interface ContactEntry {
  id: string;
  handle: string;
  display_name: string;
  role: string;
  description?: string;
  is_online: boolean;
  is_player: boolean;
  is_gm: boolean;
}

export function ContactsModule({ user }: ContactsModuleProps) {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [selected, setSelected] = useState<ContactEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // GM state
  const [showNpcForm, setShowNpcForm] = useState(false);
  const [npcHandle, setNpcHandle] = useState('');
  const [npcName, setNpcName] = useState('');
  const [npcRole, setNpcRole] = useState('');
  const [npcDesc, setNpcDesc] = useState('');
  const [allUsers, setAllUsers] = useState<MeshUser[]>([]);
  const [assignNpc, setAssignNpc] = useState<string>('');
  const [assignUser, setAssignUser] = useState<string>('');
  const [allNpcs, setAllNpcs] = useState<NpcIdentity[]>([]);

  const fetchContacts = useCallback(async () => {
    const entries: ContactEntry[] = [];

    // Fetch all player characters
    const { data: players } = await supabase
      .from('mesh_users')
      .select('*')
      .neq('id', user.id);

    if (players) {
      players.forEach(p => {
        entries.push({
          id: p.id,
          handle: p.handle,
          display_name: p.display_name,
          role: p.role,
          is_online: p.is_online,
          is_player: true,
          is_gm: p.is_gm,
        });
      });
    }

    // Fetch NPC contacts assigned to this user
    const { data: npcContacts } = await supabase
      .from('mesh_contacts')
      .select('*, npc:mesh_npc_identities!mesh_contacts_npc_id_fkey(*)')
      .eq('user_id', user.id);

    if (npcContacts) {
      npcContacts.forEach(c => {
        if (c.npc) {
          entries.push({
            id: c.npc.id,
            handle: c.npc.handle,
            display_name: c.npc.display_name,
            role: c.npc.role,
            description: c.npc.description,
            is_online: false,
            is_player: false,
            is_gm: false,
          });
        }
      });
    }

    // If GM, also fetch all NPCs for management
    if (user.is_gm) {
      const { data: npcs } = await supabase.from('mesh_npc_identities').select('*');
      if (npcs) {
        setAllNpcs(npcs);
        // Add NPCs not already in contacts list
        npcs.forEach(npc => {
          if (!entries.find(e => e.id === npc.id)) {
            entries.push({
              id: npc.id,
              handle: npc.handle,
              display_name: npc.display_name,
              role: npc.role,
              description: npc.description || undefined,
              is_online: false,
              is_player: false,
              is_gm: false,
            });
          }
        });
      }

      const { data: users } = await supabase.from('mesh_users').select('*').eq('is_gm', false);
      if (users) setAllUsers(users);
    }

    setContacts(entries);
    setLoading(false);
  }, [user.id, user.is_gm]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useRealtime({
    table: 'mesh_contacts',
    filter: `user_id=eq.${user.id}`,
    onInsert: () => fetchContacts(),
  });

  const handleCreateNpc = async () => {
    if (!npcHandle || !npcName) return;
    await supabase.from('mesh_npc_identities').insert({
      handle: npcHandle,
      display_name: npcName,
      role: npcRole,
      description: npcDesc || null,
      created_by: user.id,
    });
    setNpcHandle('');
    setNpcName('');
    setNpcRole('');
    setNpcDesc('');
    setShowNpcForm(false);
    fetchContacts();
  };

  const handleAssignNpc = async () => {
    if (!assignNpc || !assignUser) return;
    await supabase.from('mesh_contacts').insert({
      user_id: assignUser,
      npc_id: assignNpc,
    });
    setAssignNpc('');
    setAssignUser('');
  };

  const handleAssignNpcAll = async () => {
    if (!assignNpc) return;
    const inserts = allUsers.map(u => ({ user_id: u.id, npc_id: assignNpc }));
    await supabase.from('mesh_contacts').upsert(inserts, { onConflict: 'user_id,npc_id' });
    setAssignNpc('');
  };

  if (loading) {
    return <div className="contacts-loading">Loading contacts...</div>;
  }

  return (
    <div className="contacts-module">
      <div className="contacts-list-panel">
        {user.is_gm && (
          <div className="contacts-gm-bar">
            <button onClick={() => setShowNpcForm(!showNpcForm)}>
              {showNpcForm ? 'CLOSE' : '+ NEW NPC'}
            </button>
            <div className="contacts-assign">
              <select value={assignNpc} onChange={e => setAssignNpc(e.target.value)}>
                <option value="">Select NPC...</option>
                {allNpcs.map(n => <option key={n.id} value={n.id}>{n.handle}</option>)}
              </select>
              <select value={assignUser} onChange={e => setAssignUser(e.target.value)}>
                <option value="">Assign to...</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.handle}</option>)}
              </select>
              <button onClick={handleAssignNpc} disabled={!assignNpc || !assignUser}>ASSIGN</button>
              <button onClick={handleAssignNpcAll} disabled={!assignNpc}>ALL</button>
            </div>
          </div>
        )}

        {user.is_gm && showNpcForm && (
          <div className="npc-form">
            <div className="npc-form-header">[GM] CREATE NPC IDENTITY</div>
            <div className="npc-field">
              <label>HANDLE:</label>
              <input value={npcHandle} onChange={e => setNpcHandle(e.target.value)} />
            </div>
            <div className="npc-field">
              <label>NAME:</label>
              <input value={npcName} onChange={e => setNpcName(e.target.value)} />
            </div>
            <div className="npc-field">
              <label>ROLE:</label>
              <input value={npcRole} onChange={e => setNpcRole(e.target.value)} placeholder="Fixer, Corp, etc." />
            </div>
            <div className="npc-field">
              <label>DESC:</label>
              <textarea value={npcDesc} onChange={e => setNpcDesc(e.target.value)} rows={3} />
            </div>
            <button onClick={handleCreateNpc} disabled={!npcHandle || !npcName}>[ CREATE ]</button>
          </div>
        )}

        <div className="contacts-section-header">PLAYERS</div>
        {contacts.filter(c => c.is_player).map(contact => (
          <div
            key={contact.id}
            className={`contact-row ${selected?.id === contact.id ? 'active' : ''}`}
            onClick={() => setSelected(contact)}
          >
            <span className={`status-dot ${contact.is_online ? 'online' : ''}`} />
            <span className="contact-handle">{contact.handle}</span>
            <span className="contact-role">{contact.role}</span>
            {contact.is_gm && <span className="contact-gm">GM</span>}
          </div>
        ))}

        <div className="contacts-section-header">NPCS</div>
        {contacts.filter(c => !c.is_player).length === 0 ? (
          <div className="contacts-empty">[No NPC contacts]</div>
        ) : (
          contacts.filter(c => !c.is_player).map(contact => (
            <div
              key={contact.id}
              className={`contact-row ${selected?.id === contact.id ? 'active' : ''}`}
              onClick={() => setSelected(contact)}
            >
              <span className="status-dot" />
              <span className="contact-handle">{contact.handle}</span>
              <span className="contact-role">{contact.role}</span>
            </div>
          ))
        )}
      </div>

      <div className="contact-detail-panel">
        {selected ? (
          <div className="contact-detail">
            <div className="contact-detail-handle glow">{selected.handle}</div>
            <div className="contact-detail-name">{selected.display_name}</div>
            <div className="contact-detail-divider">{'─'.repeat(30)}</div>
            <div className="contact-detail-field">
              <span className="label">ROLE:</span> {selected.role || 'Unknown'}
            </div>
            <div className="contact-detail-field">
              <span className="label">TYPE:</span> {selected.is_player ? 'Player Character' : 'NPC'}
            </div>
            <div className="contact-detail-field">
              <span className="label">STATUS:</span>{' '}
              {selected.is_player ? (
                <span className={selected.is_online ? 'online-text' : 'offline-text'}>
                  {selected.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              ) : (
                <span className="offline-text">N/A</span>
              )}
            </div>
            {selected.description && (
              <div className="contact-detail-notes">
                <span className="label">NOTES:</span>
                <div className="notes-text">{selected.description}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="contact-detail-empty">Select a contact to view details</div>
        )}
      </div>
    </div>
  );
}
