import type { CareerPath } from '../../../types';

export interface CrewDef {
  id: string;
  path: CareerPath;
  name: string;
  specialty: string;
  cost: { eddies: number; secondary?: number };
  incomeBonus: number;          // eddies/sec added when hired
  canSendOnContract: boolean;   // whether this crew member can be dispatched
  contractDurationSec: number;  // how long a contract takes (0 if n/a)
  contractReward: number;       // flat eddies reward on contract completion
  flavour: string;
}

// ─── SOLO — ELITE FIRETEAM ───────────────────────────────────────────────────

export const SOLO_CREW: CrewDef[] = [
  {
    id: 'solo_crew_ghost',
    path: 'solo',
    name: 'GHOST',
    specialty: 'Infiltration',
    cost: { eddies: 500000, secondary: 20 },
    incomeBonus: 200,
    canSendOnContract: true,
    contractDurationSec: 120,
    contractReward: 1500000,
    flavour: 'She moves through secured spaces like they were built for her.',
  },
  {
    id: 'solo_crew_reyes',
    path: 'solo',
    name: 'REYES',
    specialty: 'Heavy Weapons',
    cost: { eddies: 750000, secondary: 30 },
    incomeBonus: 300,
    canSendOnContract: true,
    contractDurationSec: 90,
    contractReward: 2000000,
    flavour: 'Point him at the problem. The problem stops being a problem.',
  },
  {
    id: 'solo_crew_nika',
    path: 'solo',
    name: 'NIKA',
    specialty: 'Counter-Intelligence',
    cost: { eddies: 600000, secondary: 25 },
    incomeBonus: 250,
    canSendOnContract: false,
    contractDurationSec: 0,
    contractReward: 0,
    flavour: 'She knows when someone\'s watching. She knows before they know.',
  },
  {
    id: 'solo_crew_ko',
    path: 'solo',
    name: 'KO',
    specialty: 'Close Protection',
    cost: { eddies: 400000, secondary: 15 },
    incomeBonus: 150,
    canSendOnContract: true,
    contractDurationSec: 60,
    contractReward: 1000000,
    flavour: 'Has never lost a principal. Has lost a lot of other things.',
  },
  {
    id: 'solo_crew_mercer',
    path: 'solo',
    name: 'MERCER',
    specialty: 'Demolitions',
    cost: { eddies: 900000, secondary: 40 },
    incomeBonus: 400,
    canSendOnContract: true,
    contractDurationSec: 150,
    contractReward: 3000000,
    flavour: 'He always says this is the last job. Has been saying it for six years.',
  },
  {
    id: 'solo_crew_atlas',
    path: 'solo',
    name: 'ATLAS',
    specialty: 'Tactical Command',
    cost: { eddies: 2000000, secondary: 80 },
    incomeBonus: 800,
    canSendOnContract: true,
    contractDurationSec: 300,
    contractReward: 8000000,
    flavour: 'Not cheap. Not available to everyone. Absolutely worth it.',
  },
];

// ─── NETRUNNER — GHOST NETWORK ───────────────────────────────────────────────

export type NodeType = 'sniffer' | 'archive' | 'broker' | 'ghost' | 'honeypot';

export interface GhostNodeDef {
  id: string;
  type: NodeType;
  name: string;
  cost: { eddies: number; bandwidth: number };
  incomeBonus: number;
  detectionRisk: number; // 0-1, chance of detection per tick
  flavour: string;
}

export const NETRUNNER_NODES: GhostNodeDef[] = [
  {
    id: 'node_sniffer',
    type: 'sniffer',
    name: 'Sniffer Node',
    cost: { eddies: 200000, bandwidth: 50 },
    incomeBonus: 100,
    detectionRisk: 0.001,
    flavour: 'Passive listener. Hears everything. Says nothing.',
  },
  {
    id: 'node_archive',
    type: 'archive',
    name: 'Archive Node',
    cost: { eddies: 500000, bandwidth: 100 },
    incomeBonus: 0,
    detectionRisk: 0,
    flavour: 'Dead storage. Invisible. Earns offline.',
  },
  {
    id: 'node_broker',
    type: 'broker',
    name: 'Broker Node',
    cost: { eddies: 800000, bandwidth: 150 },
    incomeBonus: 300,
    detectionRisk: 0.002,
    flavour: 'Buys and sells in real time. Loud about it.',
  },
  {
    id: 'node_ghost',
    type: 'ghost',
    name: 'Ghost Node',
    cost: { eddies: 2000000, bandwidth: 300 },
    incomeBonus: 600,
    detectionRisk: 0,
    flavour: 'High yield. Completely undetectable. Expensive.',
  },
  {
    id: 'node_honeypot',
    type: 'honeypot',
    name: 'Honeypot Node',
    cost: { eddies: 1500000, bandwidth: 200 },
    incomeBonus: 800,
    detectionRisk: 0.005,
    flavour: 'Bait for Netwatch. If they hit it, you get paid. If they miss, you still get paid.',
  },
];

// ─── FIXER — THE OPERATION ───────────────────────────────────────────────────

export interface RetainerDef {
  id: string;
  path: CareerPath;
  name: string;
  role: string;
  cost: { eddies: number; connections: number };
  incomeBonus: number;
  flavour: string;
}

export const FIXER_RETAINERS: RetainerDef[] = [
  {
    id: 'ret_muscle',
    path: 'fixer',
    name: 'Street Muscle',
    role: 'Muscle',
    cost: { eddies: 300000, connections: 50 },
    incomeBonus: 120,
    flavour: 'Necessary. Not glamorous. Always busy.',
  },
  {
    id: 'ret_netrunner',
    path: 'fixer',
    name: 'Ghost Operator',
    role: 'Netrunner',
    cost: { eddies: 500000, connections: 80 },
    incomeBonus: 200,
    flavour: 'Handles the digital side. You don\'t ask how.',
  },
  {
    id: 'ret_medtech',
    path: 'fixer',
    name: 'Trauma Specialist',
    role: 'Medtech',
    cost: { eddies: 400000, connections: 60 },
    incomeBonus: 0,
    flavour: 'Keeps everyone working. Indispensable.',
  },
  {
    id: 'ret_tech',
    path: 'fixer',
    name: 'Workshop Op',
    role: 'Tech',
    cost: { eddies: 450000, connections: 70 },
    incomeBonus: 180,
    flavour: 'Builds what\'s needed. Asks no questions.',
  },
];

// ─── TECH — THE WORKSHOP ─────────────────────────────────────────────────────

export type ProductionLineType = 'weapons' | 'cyberware' | 'comms' | 'vehicles';

export interface ProductionLineDef {
  id: string;
  type: ProductionLineType;
  name: string;
  cost: { eddies: number; parts: number };
  partsPerSec: number;     // parts consumed
  eddiesPerSec: number;    // eddies produced
  flavour: string;
}

export const TECH_PRODUCTION_LINES: ProductionLineDef[] = [
  {
    id: 'line_weapons',
    type: 'weapons',
    name: 'Weapons Line',
    cost: { eddies: 1000000, parts: 500 },
    partsPerSec: 5,
    eddiesPerSec: 800,
    flavour: 'Demand is always there. Supply is your problem.',
  },
  {
    id: 'line_cyberware',
    type: 'cyberware',
    name: 'Cyberware Line',
    cost: { eddies: 2000000, parts: 1000 },
    partsPerSec: 8,
    eddiesPerSec: 1500,
    flavour: 'Premium product. Premium margins.',
  },
  {
    id: 'line_comms',
    type: 'comms',
    name: 'Comms Hardware Line',
    cost: { eddies: 500000, parts: 200 },
    partsPerSec: 2,
    eddiesPerSec: 400,
    flavour: 'Boring. Reliable. Always in demand.',
  },
  {
    id: 'line_vehicles',
    type: 'vehicles',
    name: 'Vehicle Mod Line',
    cost: { eddies: 3000000, parts: 2000 },
    partsPerSec: 12,
    eddiesPerSec: 2500,
    flavour: 'Nomads pay well for good work.',
  },
];

// ─── MEDTECH — SHADOW NETWORK ────────────────────────────────────────────────

export type ClinicSpecialisation = 'trauma' | 'pharma' | 'cyberware' | 'general';

export interface ClinicDef {
  id: string;
  specialisation: ClinicSpecialisation;
  name: string;
  cost: { eddies: number; patients: number };
  patientCap: number;     // adds to patient capacity
  incomeBonus: number;
  flavour: string;
}

export const MEDTECH_CLINICS: ClinicDef[] = [
  {
    id: 'clinic_general',
    specialisation: 'general',
    name: 'General Clinic',
    cost: { eddies: 500000, patients: 20 },
    patientCap: 30,
    incomeBonus: 200,
    flavour: 'Basic care. Steady income.',
  },
  {
    id: 'clinic_trauma',
    specialisation: 'trauma',
    name: 'Trauma Bay',
    cost: { eddies: 1500000, patients: 50 },
    patientCap: 20,
    incomeBonus: 600,
    flavour: 'High turnover. Higher stakes.',
  },
  {
    id: 'clinic_pharma',
    specialisation: 'pharma',
    name: 'Pharma Dispensary',
    cost: { eddies: 2000000, patients: 100 },
    patientCap: 0,
    incomeBonus: 800,
    flavour: 'Supply drives demand. Compound interest.',
  },
  {
    id: 'clinic_cyberware',
    specialisation: 'cyberware',
    name: 'Chrome Recovery',
    cost: { eddies: 3000000, patients: 200 },
    patientCap: 15,
    incomeBonus: 1200,
    flavour: 'The chrome breaks. You fix it. Premium rates.',
  },
];

// ─── ROCKERBOY — THE MOVEMENT ────────────────────────────────────────────────

export type MovementCrewType = 'activist' | 'safe_house' | 'street_distributor' | 'media_amplifier';

export interface MovementCrewDef {
  id: string;
  type: MovementCrewType;
  name: string;
  cost: { eddies: number; followers: number };
  incomeBonus: number;
  influenceBonus: number;
  flavour: string;
}

export const ROCKERBOY_CREW: MovementCrewDef[] = [
  {
    id: 'mov_activist',
    type: 'activist',
    name: 'Activist Cell',
    cost: { eddies: 200000, followers: 500 },
    incomeBonus: 0,
    influenceBonus: 50,
    flavour: 'They believe. That\'s worth more than eddies.',
  },
  {
    id: 'mov_safe_house',
    type: 'safe_house',
    name: 'Safe House Operator',
    cost: { eddies: 300000, followers: 300 },
    incomeBonus: 100,
    influenceBonus: 10,
    flavour: 'Keeps people alive. Keeps the network running.',
  },
  {
    id: 'mov_street_dist',
    type: 'street_distributor',
    name: 'Street Distributor',
    cost: { eddies: 250000, followers: 400 },
    incomeBonus: 300,
    influenceBonus: 5,
    flavour: 'Gets the signal to the corners they don\'t monitor.',
  },
  {
    id: 'mov_amplifier',
    type: 'media_amplifier',
    name: 'Media Amplifier',
    cost: { eddies: 500000, followers: 1000 },
    incomeBonus: 200,
    influenceBonus: 100,
    flavour: 'Turns a rumour into a movement.',
  },
];

// ─── NOMAD — THE PACK ────────────────────────────────────────────────────────

export type TerritoryType = 'highway' | 'settlement' | 'cache_point' | 'trade_route';

export interface TerritoryDef {
  id: string;
  type: TerritoryType;
  name: string;
  cost: { eddies: number; roadCred: number; influence: number };
  incomeBonus: number;
  secondaryBonus: number;  // Road Cred/sec bonus
  flavour: string;
}

export const NOMAD_TERRITORIES: TerritoryDef[] = [
  {
    id: 'terr_highway',
    type: 'highway',
    name: 'Highway Corridor',
    cost: { eddies: 1000000, roadCred: 200, influence: 500 },
    incomeBonus: 400,
    secondaryBonus: 2,
    flavour: 'The road pays tolls whether you ask or not.',
  },
  {
    id: 'terr_settlement',
    type: 'settlement',
    name: 'Badlands Settlement',
    cost: { eddies: 2000000, roadCred: 400, influence: 1000 },
    incomeBonus: 600,
    secondaryBonus: 3,
    flavour: 'People. Resources. Protection offered and taken.',
  },
  {
    id: 'terr_cache',
    type: 'cache_point',
    name: 'Supply Cache Point',
    cost: { eddies: 800000, roadCred: 150, influence: 300 },
    incomeBonus: 250,
    secondaryBonus: 1,
    flavour: 'Hidden. Stocked. Ours.',
  },
  {
    id: 'terr_trade',
    type: 'trade_route',
    name: 'Trade Route Claim',
    cost: { eddies: 3000000, roadCred: 600, influence: 2000 },
    incomeBonus: 1000,
    secondaryBonus: 5,
    flavour: 'Everything that moves through pays something.',
  },
];

// ─── MEDIA — THE NETWORK ─────────────────────────────────────────────────────

export type SourceTierType = 'street' | 'corporate' | 'deep' | 'anonymous';

export interface SourceNetworkDef {
  id: string;
  tier: SourceTierType;
  name: string;
  cost: { eddies: number; sources: number };
  sourceCap: number;
  incomeBonus: number;
  influenceBonus: number;
  flavour: string;
}

export const MEDIA_SOURCE_NETWORK: SourceNetworkDef[] = [
  {
    id: 'src_street',
    tier: 'street',
    name: 'Street Sources',
    cost: { eddies: 200000, sources: 20 },
    sourceCap: 30,
    incomeBonus: 100,
    influenceBonus: 20,
    flavour: 'They know what happens at ground level. That\'s where truth lives.',
  },
  {
    id: 'src_corporate',
    tier: 'corporate',
    name: 'Corporate Leaks',
    cost: { eddies: 1000000, sources: 50 },
    sourceCap: 20,
    incomeBonus: 400,
    influenceBonus: 80,
    flavour: 'Risky. Essential.',
  },
  {
    id: 'src_deep',
    tier: 'deep',
    name: 'Deep Cover Sources',
    cost: { eddies: 3000000, sources: 100 },
    sourceCap: 10,
    incomeBonus: 800,
    influenceBonus: 200,
    flavour: 'Years in position. Irreplaceable.',
  },
  {
    id: 'src_anonymous',
    tier: 'anonymous',
    name: 'Anonymous Network',
    cost: { eddies: 5000000, sources: 200 },
    sourceCap: 50,
    incomeBonus: 1500,
    influenceBonus: 500,
    flavour: 'No names. No faces. No vulnerability.',
  },
];
