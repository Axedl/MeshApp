import React, { useState } from 'react';
import { getBeat } from './constants/storyBeats';

interface RunnerCommsProps {
  receivedBeats: string[];
  seenBeats: string[];
  contactRelationships: Record<string, number>;
  onMarkSeen: (id: string) => void;
}

type CommsSubTab = 'messages' | 'contacts';

interface ContactEntry {
  name: string;
  desc: string;
  loreByLevel: string[];
}

const KNOWN_CONTACTS: ContactEntry[] = [
  {
    name: 'ECHO',
    desc: 'Ghost in the NET. Anonymous subnet presence.',
    loreByLevel: [
      'Watches new nodes on the lower subnet. First contact.',
      "Has access to Netwatch blind spots. Won't say how.",
      'Run history spans 8+ years. Identity unknown, even to RAVEN.',
      'ECHO is not singular. ECHO is an emergent pattern across ghost nodes.',
    ],
  },
  {
    name: 'RAVEN',
    desc: 'Mid-tier fixer. Talent scout. Takes a cut.',
    loreByLevel: [
      'Brokers work for off-books operators. Selective but fair.',
      'Connected to three major Night City fixer networks.',
      'Was a corpo before the incident. Never discusses it.',
      'RAVEN has been building toward something for years. You might be part of it.',
    ],
  },
  {
    name: 'MAKO',
    desc: 'Street-level fixer. Knows everyone, sells nothing for free.',
    loreByLevel: [
      'Lowest-tier introduction. Reliable for small jobs.',
      'Has eyes in the Heywood markets and Watson docks.',
      'Owes favours to people she pretends not to know.',
      'MAKO and CIPHER have history. Neither will confirm.',
    ],
  },
  {
    name: 'CIPHER',
    desc: 'Corp intelligence broker. Dangerous to know.',
    loreByLevel: [
      'Makes contact once your operation draws real attention.',
      'Feeds intelligence on corp movements — for a price.',
      'Has assets inside Arasaka, Militech, and two smaller corps.',
      'CIPHER does not work for money. CIPHER works for leverage.',
    ],
  },
  {
    name: 'GHOST-9',
    desc: 'Rogue AI fragment. Communicates through dead drops.',
    loreByLevel: [
      'Appears in Act 3. Nature unclear.',
      'Claims to be an archived personality — a runner who never flatlined.',
      'The ghost protocol was designed to preserve high-rep operators.',
      'GHOST-9 IS the ghost protocol. You are becoming GHOST-10.',
    ],
  },
];

export default function RunnerComms({
  receivedBeats,
  seenBeats,
  contactRelationships,
  onMarkSeen,
}: RunnerCommsProps) {
  const [subTab, setSubTab] = useState<CommsSubTab>('messages');

  const renderMessages = () => {
    const beats = receivedBeats
      .map(id => getBeat(id))
      .filter(Boolean)
      .reverse();

    if (beats.length === 0) {
      return (
        <div style={{ fontSize: '0.7rem', color: 'var(--primary-dim)', marginTop: '1rem' }}>
          // no transmissions received
        </div>
      );
    }

    return (
      <div className="runner-beat-list">
        {beats.map(beat => {
          if (!beat) return null;
          return (
            <div
              key={beat.id}
              className={`runner-beat-card${!seenBeats.includes(beat.id) ? ' runner-beat-card--unread' : ''}`}
              onClick={() => onMarkSeen(beat.id)}
            >
              <div className="runner-beat-from">{beat.from}</div>
              <div className="runner-beat-subject">{beat.subject}</div>
              <div className="runner-beat-body">{beat.body}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContacts = () => (
    <div className="runner-contacts-list">
      {KNOWN_CONTACTS.map(contact => {
        const level = contactRelationships[contact.name.toLowerCase()] ?? 0;
        const visibleLore = contact.loreByLevel.slice(0, Math.max(1, level));
        return (
          <div key={contact.name} className="runner-contact-row">
            <div style={{ flex: 1 }}>
              <div className="runner-contact-name">{contact.name}</div>
              <div className="runner-contact-desc">{contact.desc}</div>
              {visibleLore.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.62rem',
                    color: i === visibleLore.length - 1 ? 'var(--primary)' : 'var(--primary-dim)',
                    marginTop: '0.15rem',
                    fontStyle: 'italic',
                  }}
                >
                  ◈ {line}
                </div>
              ))}
            </div>
            <div>
              <span className="runner-contact-level">
                LVL {level}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="runner-subtabs">
        <button
          className={`runner-subtab${subTab === 'messages' ? ' runner-subtab--active' : ''}`}
          onClick={() => setSubTab('messages')}
        >
          MESSAGES
        </button>
        <button
          className={`runner-subtab${subTab === 'contacts' ? ' runner-subtab--active' : ''}`}
          onClick={() => setSubTab('contacts')}
        >
          CONTACTS
        </button>
      </div>

      {subTab === 'messages' && (
        <div>
          <div className="runner-centre-header">// TRANSMISSIONS</div>
          {renderMessages()}
        </div>
      )}

      {subTab === 'contacts' && (
        <div>
          <div className="runner-centre-header">// KNOWN CONTACTS</div>
          {renderContacts()}
        </div>
      )}
    </div>
  );
}
