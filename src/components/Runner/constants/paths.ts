import type { CareerPath } from '../../../types';

export interface PathDef {
  id: CareerPath;
  name: string;
  secondaryResource: string;
  resourceDesc: string;
  makoFlavour: string;
  mechanicalSummary: string;
  contactId: string;
  contactName: string;
  contactDesc: string;
  act2BossGateUpgrade: string;
  act3BossGateUpgrade: string;
}

export const CAREER_PATHS: PathDef[] = [
  {
    id: 'solo',
    name: 'SOLO',
    secondaryResource: 'Heat',
    resourceDesc: 'Risk multiplier. High Heat increases income but attracts attention.',
    makoFlavour: 'you hit things. corpos pay well for precision violence.',
    mechanicalSummary: 'Heat raised by contracts. Each Heat unit boosts income but triggers hostile events. Burn Heat on big payouts.',
    contactId: 'ghost',
    contactName: 'GHOST',
    contactDesc: 'A retired Arasaka black-ops operative who got out with her life and not much else.',
    act2BossGateUpgrade: 'solo_black_ops_clearance',
    act3BossGateUpgrade: 'solo_militech_contract',
  },
  {
    id: 'netrunner',
    name: 'NETRUNNER',
    secondaryResource: 'Bandwidth',
    resourceDesc: 'Pipeline capacity. Gates how many passive data taps run simultaneously.',
    makoFlavour: 'you hit systems. riskier but the data market is open.',
    mechanicalSummary: 'Bandwidth unlocks passive data tap slots. Each slot generates income. Expand capacity, protect against detection.',
    contactId: 'prism',
    contactName: 'PRISM',
    contactDesc: 'An AI fragment that survived the Blackwall event by fragmenting itself across seventeen subnets.',
    act2BossGateUpgrade: 'nr_deep_access_protocol',
    act3BossGateUpgrade: 'nr_dead_drop_network',
  },
  {
    id: 'fixer',
    name: 'FIXER',
    secondaryResource: 'Connections',
    resourceDesc: 'Network depth. Enables contract brokering tiers.',
    makoFlavour: 'you connect people. you make the world work.',
    mechanicalSummary: 'Connections open contract slots. More Connections = more simultaneous contracts = more income streams.',
    contactId: 'broker',
    contactName: 'THE BROKER',
    contactDesc: 'No name. No face. Communicates only through intermediaries and encrypted drops.',
    act2BossGateUpgrade: 'fx_senior_fixer_status',
    act3BossGateUpgrade: 'fx_volume_contracts',
  },
  {
    id: 'tech',
    name: 'TECH',
    secondaryResource: 'Parts',
    resourceDesc: 'Salvage components. Must be spent to unlock upgrades.',
    makoFlavour: 'you build and break hardware. always in demand.',
    mechanicalSummary: 'Parts fuel the crafting queue. Spend Parts to unlock upgrades. Production lines convert Parts into Eddies.',
    contactId: 'hex',
    contactName: 'HEX',
    contactDesc: 'Raven Microcybernetics black market engineer who jumped ship when Militech nationalised their parent company.',
    act2BossGateUpgrade: 'tech_black_market_distribution',
    act3BossGateUpgrade: 'tech_weapons_grade',
  },
  {
    id: 'medtech',
    name: 'MEDTECH',
    secondaryResource: 'Patients',
    resourceDesc: 'Active cases. Each patient generates recurring eddie ticks.',
    makoFlavour: 'you keep people alive. they owe you forever.',
    mechanicalSummary: 'Each Patient generates passive income. Expand clinic capacity to raise the cap. Supply events threaten your network.',
    contactId: 'dr_yuen',
    contactName: 'DR. YUEN',
    contactDesc: 'Runs a shadow clinic in a location that changes every three months.',
    act2BossGateUpgrade: 'med_trauma_specialisation',
    act3BossGateUpgrade: 'med_high_volume',
  },
  {
    id: 'rockerboy',
    name: 'ROCKERBOY',
    secondaryResource: 'Followers',
    resourceDesc: 'Cultural reach. Multiplies income but attracts corpo censorship events.',
    makoFlavour: 'you move culture. influence is its own currency.',
    mechanicalSummary: 'Followers multiply income. Corps will try to silence you. Convert Followers to different crew types in Act 4.',
    contactId: 'static',
    contactName: 'STATIC',
    contactDesc: 'Pirate radio operator. Has been broadcasting on illegal frequencies for eleven years without getting caught.',
    act2BossGateUpgrade: 'rb_banned_in_three_cities',
    act3BossGateUpgrade: 'rb_followers_currency',
  },
  {
    id: 'nomad',
    name: 'NOMAD',
    secondaryResource: 'Road Cred',
    resourceDesc: 'Pack loyalty. Converts to supply route efficiency and territory bonuses.',
    makoFlavour: 'you move everything else. the roads are yours.',
    mechanicalSummary: 'Road Cred builds territory income. Claim routes, expand the pack, defend against rival incursions.',
    contactId: 'dust',
    contactName: 'DUST',
    contactDesc: 'Pack elder. Has been in the badlands since before most current runners were born.',
    act2BossGateUpgrade: 'nm_pack_elder_status',
    act3BossGateUpgrade: 'nm_territory_control_1',
  },
  {
    id: 'media',
    name: 'MEDIA',
    secondaryResource: 'Sources',
    resourceDesc: 'Protected contacts feeding stories. Each source generates intel bursts.',
    makoFlavour: 'you control the story. information is the real weapon.',
    mechanicalSummary: 'Sources generate passive intel income. Publish stories for Influence spikes. Protect sources from corporate sweeps.',
    contactId: 'anon',
    contactName: 'ANON',
    contactDesc: 'A source who contacts through dead drops and never repeats a method.',
    act2BossGateUpgrade: 'media_embedded_journalist',
    act3BossGateUpgrade: 'media_explosive_story',
  },
];

export const PATH_SECONDARY_RESOURCE: Record<CareerPath, string> = {
  solo: 'Heat',
  netrunner: 'Bandwidth',
  fixer: 'Connections',
  tech: 'Parts',
  medtech: 'Patients',
  rockerboy: 'Followers',
  nomad: 'Road Cred',
  media: 'Sources',
};

export const PATH_ACT3_BRANCHES: Record<CareerPath, { a: string; b: string }> = {
  solo: { a: 'Corporate Cleaner', b: 'Vigilante' },
  netrunner: { a: 'Ghost Archive', b: 'Black Market Broker' },
  fixer: { a: 'Crime Syndicate', b: 'Elite Broker' },
  tech: { a: 'Weapons Manufacture', b: 'Cyberware Lab' },
  medtech: { a: 'Shadow Hospital', b: 'Pharma Network' },
  rockerboy: { a: 'Underground Movement', b: 'Corporate Sellout' },
  nomad: { a: 'Badlands Empire', b: 'City Smuggler' },
  media: { a: 'Whistleblower Network', b: 'Corporate Embedded' },
};

export function getPathDef(id: CareerPath): PathDef {
  const def = CAREER_PATHS.find(p => p.id === id);
  if (!def) throw new Error(`Unknown career path: ${id}`);
  return def;
}
