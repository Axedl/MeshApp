export interface MeshUser {
  id: string;
  handle: string;
  display_name: string;
  role: string;
  colour_scheme: string;
  is_gm: boolean;
  is_online: boolean;
  campaign_id: string | null;
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
  published_at: string;
  created_at: string;
  updated_at: string;
  is_forum?: boolean;
}

export interface NetReply {
  id: string;
  content_id: string;
  from_user_id: string;
  body: string;
  created_at: string;
  from_user?: MeshUser;
}

export interface EloProfile {
  id: string;
  user_id: string;
  elfname: string;
  class: string;
  rank: number;
  title: string | null;
  elfline: string | null;
  corruption_stacks: number;
  revive_sickness: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  author: string;
  category: string;
  body: string;
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
    primaryDim: '#22b822',
    primaryBright: '#66ff66',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
  amber: {
    name: 'Amber',
    primary: '#ffb000',
    primaryDim: '#b87d00',
    primaryBright: '#ffc733',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
  cyan: {
    name: 'Cyan/Blue',
    primary: '#00d4ff',
    primaryDim: '#009cc0',
    primaryBright: '#33ddff',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
  white: {
    name: 'High Contrast',
    primary: '#e0e0e0',
    primaryDim: '#999999',
    primaryBright: '#ffffff',
    background: '#0a0a0a',
    backgroundLight: '#141414',
  },
};

export interface IpLogEntry {
  amount: number;
  source: string;
  awarded_at: string;
}

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
  ip_total: number;
  ip_spent: number;
  ip_log: IpLogEntry[];
  created_at: string;
  updated_at: string;
}

export type AppModule = 'email' | 'chat' | 'netsearch' | 'elo' | 'contacts' | 'files' | 'settings' | 'users' | 'sheet' | 'dice' | 'hacking' | 'runner' | 'fixerboard' | 'journal' | 'combat' | 'dashboard';

// =========================
// GM Journal
// =========================
export type JournalCategory = 'session' | 'npc' | 'location' | 'faction' | 'plot';

export interface JournalEntry {
  id: string;
  created_by: string;
  title: string;
  category: JournalCategory;
  body: string;
  tags: string[];
  updated_at: string;
  created_at: string;
}

// =========================
// Combat Tracker
// =========================
export type CombatStatus = 'pending' | 'active' | 'complete';

export interface CombatParticipant {
  id: string;
  session_id: string;
  display_name: string;
  initiative: number;
  hp_current: number;
  hp_max: number;
  wound_state: number;
  is_npc: boolean;
  pc_sheet_id: string | null;
  notes: string;
  sort_order: number;
}

export interface CombatSession {
  id: string;
  name: string;
  is_active: boolean;
  created_by: string;
  round: number;
  current_participant_index: number;
  status: CombatStatus;
  created_at: string;
  updated_at: string;
}

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

export type CareerPath =
  | 'solo'
  | 'netrunner'
  | 'fixer'
  | 'tech'
  | 'medtech'
  | 'rockerboy'
  | 'nomad'
  | 'media';

export type RunnerAct = 1 | 2 | 3 | 4;

export interface CareerResources {
  secondary: number;
  influence?: number;
}

export interface BossState {
  act2_complete: boolean;
  act3_complete: boolean;
  current_boss_active: boolean;
  current_boss_id: string | null;
  current_boss_progress: number;
  current_boss_target: number;
}

export interface CrewMember {
  id: string;
  name: string;
  specialty: string;
  income_bonus: number;
  hired_at: string;
}

export interface GhostMemoryTree {
  universal: Record<string, number>;
  paths: Record<string, Record<string, number>>;
  branches: Record<string, number>;
}

export interface RunHistoryEntry {
  run_number: number;
  path: CareerPath;
  branch: string | null;
  act_reached: RunnerAct;
  lifetime_eddies: number;
  completed_at: string;
}

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
  story_beats_seen: string[];
  // Redesign additions
  act: RunnerAct;
  career_path: CareerPath | null;
  career_resources: CareerResources;
  boss_state: BossState;
  crew: Record<string, CrewMember[]>;
  ghost_memory_tree: GhostMemoryTree;
  run_history: RunHistoryEntry[];
  contacts: Record<string, number>;
  career_branch: string | null;
  job_sequence_step: number;
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
