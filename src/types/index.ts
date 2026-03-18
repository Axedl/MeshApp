export interface MeshUser {
  id: string;
  handle: string;
  display_name: string;
  role: string;
  colour_scheme: string;
  is_gm: boolean;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface NpcIdentity {
  id: string;
  handle: string;
  display_name: string;
  role: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface Email {
  id: string;
  from_user_id: string | null;
  from_npc_id: string | null;
  to_user_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  reply_to_id: string | null;
  created_at: string;
  from_user?: MeshUser;
  from_npc?: NpcIdentity;
  to_user?: MeshUser;
}

export interface ChatMessage {
  id: string;
  from_user_id: string | null;
  from_npc_id: string | null;
  message: string;
  is_system: boolean;
  channel_id: string | null;
  created_at: string;
  from_user?: MeshUser;
  from_npc?: NpcIdentity;
}

export interface NetContent {
  id: string;
  title: string;
  body: string;
  source_name: string;
  tags: string[];
  visible_to: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  author: string;
  category: string;
  content: string;
  tags: string[];
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  npc_id: string;
  created_at: string;
  npc?: NpcIdentity;
}

export interface MeshFile {
  id: string;
  owner_id: string;
  filename: string;
  content_type: string;
  content_text: string | null;
  storage_path: string | null;
  source: string;
  is_new: boolean;
  created_at: string;
}

export type ColourScheme = 'green' | 'amber' | 'cyan' | 'white' | 'custom';

export interface ColourSchemeConfig {
  name: string;
  primary: string;
  primaryDim: string;
  primaryBright: string;
  background: string;
  backgroundLight: string;
}

export const COLOUR_SCHEMES: Record<string, ColourSchemeConfig> = {
  green: {
    name: 'Green Phosphor',
    primary: '#33ff33',
    primaryDim: '#1a9e1a',
    primaryBright: '#66ff66',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
  amber: {
    name: 'Amber',
    primary: '#ffb000',
    primaryDim: '#9e6d00',
    primaryBright: '#ffc733',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
  cyan: {
    name: 'Cyan/Blue',
    primary: '#00d4ff',
    primaryDim: '#0088a8',
    primaryBright: '#33ddff',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
  white: {
    name: 'High Contrast',
    primary: '#e0e0e0',
    primaryDim: '#808080',
    primaryBright: '#ffffff',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
};

export interface PcSheet {
  id: string;
  owner_id: string;
  handle: string;
  role: string;
  reputation: number;
  stat_int: number;
  stat_ref: number;
  stat_dex: number;
  stat_tech: number;
  stat_cool: number;
  stat_will: number;
  stat_luck: number;
  stat_move: number;
  stat_body: number;
  stat_emp: number;
  hp_current: number;
  hp_max: number;
  humanity_current: number;
  wound_state: number;
  skills: unknown;
  cyberware: unknown;
  weapons: unknown;
  gear: unknown;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type AppModule = 'email' | 'chat' | 'netsearch' | 'contacts' | 'files' | 'settings' | 'users' | 'sheet' | 'dice' | 'hacking' | 'runner' | 'fixerboard';

// =========================
// Fixer Board
// =========================
export interface Listing {
  id: string;
  type: 'job' | 'rumor' | 'item' | 'wanted' | 'intel';
  title: string;
  body: string;
  contact: string | null;
  credit: string | null;
  price: string | null;
  status: 'open' | 'filled' | 'burned' | 'expired';
  is_active: boolean;
  edition_id: string | null;
  created_at: string;
}

// =========================
// Chat Channels
// =========================
export interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  is_dm: boolean;
  dm_participants: string[] | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
}

// =========================
// Hacking Minigame
// =========================
export type IceNodeStatus = 'locked' | 'breached' | 'failed';

export interface IceNode {
  id: string;
  name: string;
  difficulty: number; // 1–5
  type: string;       // e.g. 'Killer', 'Skunk', 'Hellhound', 'Asp', 'Scorpion'
  status: IceNodeStatus;
}

export interface HackSession {
  id: string;
  created_by: string;
  assigned_to: string | null;
  name: string;
  architecture: IceNode[];
  status: 'pending' | 'active' | 'complete' | 'flatlined';
  current_node_index: number;
  created_at: string;
  updated_at: string;
}

// =========================
// Flatline Runner Idle Game
// =========================
export interface RunnerState {
  id: string;
  owner_id: string;
  eddies: number;
  rep: number;
  upgrades: Record<string, number>;
  prestige_tokens: number;
  prestige_count: number;
  prestige_upgrades: Record<string, number>;
  lifetime_eddies: number;
  milestones_claimed: string[];
  last_tick: string;
  created_at: string;
}

// =========================
// Dice Roller
// =========================
export interface DiceGroup {
  count: number;
  sides: number;
  rolls: number[];
}

export interface DiceRoll {
  id: string;
  expression: string;
  diceGroups: DiceGroup[];
  modifier: number;
  total: number;
  timestamp: Date;
}
