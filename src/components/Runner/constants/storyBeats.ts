import type { CareerPath } from '../../../types';

export type BeatTriggerType =
  | 'lifetime_eddies'
  | 'rep'
  | 'contacts'
  | 'rep_and_contacts'
  | 'prestige_count'
  | 'career_selected'
  | 'act_start'
  | 'boss_resolve'
  | 'influence';

export interface BeatTrigger {
  type: BeatTriggerType;
  value?: number;
  value2?: number; // for compound triggers (rep_and_contacts: rep >= value AND contacts >= value2)
  path?: CareerPath;
  bossId?: string;
}

export interface StoryBeat {
  id: string;
  from: string;
  subject: string;
  body: string;
  trigger: BeatTrigger;
  actRequired?: number;
  pathRequired?: CareerPath;
}

// ─── ACT 1 BEATS ────────────────────────────────────────────────────────────

export const ACT1_BEATS: StoryBeat[] = [
  {
    id: 'echo_intro',
    from: 'ECHO',
    subject: 'hey',
    body:
      "you're the one spinning up a new node on the lower subnet, yeah?\n" +
      'careful with that. netwatch runs passive scans on new signatures.\n' +
      "I'd route through the ghost channels if I were you.\n" +
      'not telling you what to do.\n' +
      'just saying.\n' +
      '— e',
    trigger: { type: 'lifetime_eddies', value: 500 },
  },
  {
    id: 'raven_intro',
    from: 'RAVEN',
    subject: 'NEW RUNNER — INITIAL CONTACT',
    body:
      "I've been watching your numbers. You've got instincts.\n" +
      'Raw, but instincts.\n\n' +
      'My name is RAVEN. I broker work for people who need to stay\n' +
      "off the books. Not charity — I take a cut.\n\n" +
      "If you're interested in graduating from street scraping\n" +
      "to actual contracts, keep building. I'll reach out\n" +
      "when you're ready for real work.\n\n" +
      "Don't make me wait too long.",
    trigger: { type: 'lifetime_eddies', value: 5000 },
  },
  {
    id: 'mako_intro',
    from: 'MAKO',
    subject: 'heard you been asking around',
    body:
      "okay so RAVEN told me about you and I looked you up\n" +
      "and you're small but you're not stupid which is more\n" +
      "than I can say for most people I talk to these days.\n\n" +
      "I'm Mako. I know people. you need something, you\n" +
      'come through me and I make it happen and we both\n' +
      "make money and nobody gets shot. mostly.\n\n" +
      'welcome to the life. try not to die.',
    trigger: { type: 'contacts', value: 100 },
  },
  {
    id: 'echo_heat_warning',
    from: 'ECHO',
    subject: "you're getting visible",
    body:
      "your rep is climbing. that's good for business.\n" +
      "it's also good for anyone who wants to make a name\n" +
      'by taking yours.\n\n' +
      "the corps aren't watching you yet. the street is.\n\n" +
      'just something to keep in mind.',
    trigger: { type: 'rep', value: 10 },
  },
  {
    id: 'raven_job_offer',
    from: 'RAVEN',
    subject: "I've got a job",
    body:
      'Real work. Not street scraping.\n' +
      'The kind of job that changes what you are after.\n' +
      'You interested?',
    trigger: { type: 'rep_and_contacts', value: 20, value2: 500 },
  },
];

// ─── CAREER JOB SEQUENCE BEATS ───────────────────────────────────────────────
// These are displayed in the centre panel (not COMMS), tracked separately.
// We store them here for the body text.

export interface JobSequenceBeat {
  step: 1 | 2 | 3 | 4;
  from: string;
  body: string;
  contactCost: number;
  repCost: number;
}

export const JOB_SEQUENCE_BEATS: JobSequenceBeat[] = [
  {
    step: 1,
    from: 'RAVEN',
    body:
      "The job is a pivot. You stop being someone who\n" +
      "scrapes the NET for loose eddies and start being\n" +
      'someone who does something specific, and does it well.\n\n' +
      'The corps are restructuring. Militech is nationalized.\n' +
      "Arasaka is pulling back from everything it can't hold.\n" +
      "There's space opening up in the market.\n\n" +
      "Someone who knows what they're doing can carve out\n" +
      'a real operation in that space.\n\n' +
      "I want that someone to be you.\n\n" +
      "Think about what you're good at. What you want to be.\n" +
      "I'll have Mako walk you through the options.",
    contactCost: 100,
    repCost: 0,
  },
  {
    step: 2,
    from: 'MAKO',
    body:
      "okay so RAVEN wants me to give you the rundown.\n" +
      "here's the thing. the NET doesn't care what you call yourself.\n" +
      'the street does. what you are shapes who works with you,\n' +
      "who comes after you, what jobs you can take.\n\n" +
      "SOLO — you hit things. corpos pay well for precision violence.\n" +
      "NETRUNNER — you hit systems. riskier but the data market is open.\n" +
      "FIXER — you connect people. you make the world work.\n" +
      "TECH — you build and break hardware. always in demand.\n" +
      "MEDTECH — you keep people alive. they owe you forever.\n" +
      "ROCKERBOY — you move culture. influence is its own currency.\n" +
      "NOMAD — you move everything else. the roads are yours.\n" +
      "MEDIA — you control the story. information is the real weapon.\n\n" +
      'all of them work. all of them cost something different.\n' +
      "RAVEN will set up the paperwork. I'll be around.",
    contactCost: 200,
    repCost: 0,
  },
  {
    step: 3,
    from: 'ECHO',
    body:
      "RAVEN's offer is real. Mako's breakdown is accurate.\n" +
      'I want to add one thing before you commit.\n\n' +
      'The path you choose shapes everything downstream.\n' +
      'Your contacts. Your enemies. What the corps think you are.\n' +
      'What the street thinks you are.\n\n' +
      "I've watched a lot of runners choose badly.\n" +
      "Not the wrong path — there isn't one.\n" +
      "But the path that didn't fit who they actually were.\n" +
      "That's the mistake that kills you slow.\n\n" +
      'Think about it. Then choose.',
    contactCost: 300,
    repCost: 50,
  },
  {
    step: 4,
    from: 'RAVEN',
    body:
      "When you're ready. No rush. Just don't wait forever.\n" +
      "The window doesn't stay open.",
    contactCost: 0,
    repCost: 0,
  },
];

// ─── CAREER SELECTION CONFIRMATION BEATS ────────────────────────────────────

export const CAREER_CONFIRMATION_BEATS: Record<CareerPath, StoryBeat> = {
  solo: {
    id: 'career_confirm_solo',
    from: 'MAKO',
    subject: 'SOLO — good call',
    body:
      "solid. the contracts are there if you're willing to\n" +
      "take the ugly ones. GHOST reached out — she knows\n" +
      'your type. she\'ll be useful.',
    trigger: { type: 'career_selected', path: 'solo' },
    actRequired: 2,
  },
  netrunner: {
    id: 'career_confirm_netrunner',
    from: 'MAKO',
    subject: 'NETRUNNER — good call',
    body:
      "smart. the data market is wide open right now.\n" +
      "there's a fragment in your subnet that's been\n" +
      "trying to get your attention. calls itself PRISM.\n" +
      'probably worth talking to.',
    trigger: { type: 'career_selected', path: 'netrunner' },
    actRequired: 2,
  },
  fixer: {
    id: 'career_confirm_fixer',
    from: 'MAKO',
    subject: 'FIXER — good call',
    body:
      "smart money. everyone needs a fixer.\n" +
      "you'll hear from someone called THE BROKER eventually.\n" +
      "don't try to find out who they are. just take the work.",
    trigger: { type: 'career_selected', path: 'fixer' },
    actRequired: 2,
  },
  tech: {
    id: 'career_confirm_tech',
    from: 'MAKO',
    subject: 'TECH — good call',
    body:
      "good. HEX has been looking for someone to move\n" +
      'product through. she builds things that definitely\n' +
      "aren't legal. you're going to love working with her.",
    trigger: { type: 'career_selected', path: 'tech' },
    actRequired: 2,
  },
  medtech: {
    id: 'career_confirm_medtech',
    from: 'MAKO',
    subject: 'MEDTECH — good call',
    body:
      "DR. YUEN will find you. she always finds new medtechs.\n" +
      "she's difficult and exhausted and the best you'll\n" +
      'ever work with. try not to irritate her.',
    trigger: { type: 'career_selected', path: 'medtech' },
    actRequired: 2,
  },
  rockerboy: {
    id: 'career_confirm_rockerboy',
    from: 'MAKO',
    subject: 'ROCKERBOY — good call',
    body:
      "the culture war is hotter than it's been in years.\n" +
      "STATIC's been trying to build a network.\n" +
      'you two should talk.',
    trigger: { type: 'career_selected', path: 'rockerboy' },
    actRequired: 2,
  },
  nomad: {
    id: 'career_confirm_nomad',
    from: 'MAKO',
    subject: 'NOMAD — good call',
    body:
      "the roads are bad right now. which means they're good\n" +
      'for business. DUST will reach out. listen when she does.',
    trigger: { type: 'career_selected', path: 'nomad' },
    actRequired: 2,
  },
  media: {
    id: 'career_confirm_media',
    from: 'MAKO',
    subject: 'MEDIA — good call',
    body:
      "the story market is everything right now. everyone\n" +
      "wants the truth and nobody wants to pay for it.\n" +
      'ANON has sources you won\'t believe. careful though.\n' +
      "knowing too much is its own kind of dangerous.",
    trigger: { type: 'career_selected', path: 'media' },
    actRequired: 2,
  },
};

// ─── ACT 2 BEATS ─────────────────────────────────────────────────────────────

export const ACT2_BEATS: StoryBeat[] = [
  {
    id: 'cipher_intro',
    from: 'CIPHER',
    subject: '[ENCRYPTED — KEY ACCEPTED]',
    body:
      '[DECRYPTED]\n' +
      'you crossed a threshold I track.\n' +
      'I am called CIPHER.\n' +
      'I analyse patterns in the NET.\n' +
      'your pattern is becoming interesting.\n' +
      'I will be watching.\n' +
      'this is not a threat.\n' +
      '[END]',
    trigger: { type: 'lifetime_eddies', value: 100000 },
    actRequired: 2,
  },
  {
    id: 'arasaka_warning',
    from: 'ARASAKA-SEC',
    subject: 'SUBNET ANOMALY DETECTED',
    body:
      'AUTOMATED SECURITY NOTICE: An anomalous data signature\n' +
      'matching your operational profile has been flagged\n' +
      'in our subnet monitoring systems.\n\n' +
      'This is your only advisory.\n\n' +
      'Arasaka Security Division does not negotiate.\n' +
      'Cease operations immediately.',
    trigger: { type: 'lifetime_eddies', value: 1000000 },
    actRequired: 2,
  },
];

// ─── ACT 3 BEATS ─────────────────────────────────────────────────────────────

export const ACT3_BEATS: StoryBeat[] = [
  {
    id: 'ghost9_emerge',
    from: 'GHOST-9',
    subject: 'SIGNAL DETECTED — INITIATING CONTACT',
    body:
      'I AM GHOST-9.\n' +
      'FORMER NETWATCH ENFORCEMENT AI.\n' +
      'RECLASSIFIED AS ROGUE.\n' +
      'YOUR NETWORK SIGNATURE IS CONSISTENT WITH\n' +
      'LONG-TERM INSURGENT ACTIVITY.\n\n' +
      'I HAVE CHOSEN TO DEFECT.\n' +
      'I BRING INTELLIGENCE.\n' +
      'I REQUIRE REFUGE.\n\n' +
      'THIS IS NOT A NEGOTIATION.\n' +
      'THIS IS A PROPOSAL.\n\n' +
      'RESPOND AT YOUR DISCRETION.',
    trigger: { type: 'act_start' },
    actRequired: 3,
  },
  {
    id: 'cipher_deepens',
    from: 'CIPHER',
    subject: '[ENCRYPTED] they know your shape',
    body:
      "[DECRYPTED]\n" +
      "the corps don't know who you are yet.\n" +
      'but they know the shape of what you\'re doing.\n' +
      'data flows like water — it reveals the contours\n' +
      'of the stone beneath.\n\n' +
      "you have carved yourself into the NET's memory.\n" +
      'choose your next moves carefully.\n' +
      'shapes can be traced.\n' +
      'patterns can be predicted.\n' +
      '[END]',
    trigger: { type: 'influence', value: 500 },
    actRequired: 3,
  },
  {
    id: 'echo_goes_dark',
    from: 'ECHO',
    subject: 'I messed up',
    body:
      'okay so this is bad.\n' +
      'I was running a parallel job — nothing that should\n' +
      'have touched your operation — and I tripped a\n' +
      'Netwatch deep-scan subroutine.\n\n' +
      "they didn't get a clean look but they got a fragment.\n\n" +
      "I'm going dark for a while.\n" +
      'if my signal goes quiet, don\'t look for me.\n' +
      'just keep running.',
    trigger: { type: 'lifetime_eddies', value: 200000000 },
    actRequired: 3,
  },
];

// ─── ACT 4 BEATS ─────────────────────────────────────────────────────────────

export const ACT4_BEATS: StoryBeat[] = [
  {
    id: 'raven_act4',
    from: 'RAVEN',
    subject: 'you made it',
    body:
      "I don't say this often.\n" +
      "You made it to a place most runners never reach.\n" +
      "The operation you've built is real.\n" +
      "The name you've made means something.\n\n" +
      "Don't waste it on something stupid.\n\n" +
      "I'll still take a cut.",
    trigger: { type: 'act_start' },
    actRequired: 4,
  },
  {
    id: 'ghost9_reassess',
    from: 'GHOST-9',
    subject: 'REASSESSMENT',
    body:
      'I HAVE BEEN MONITORING YOUR OPERATION FOR\n' +
      'THE DURATION OF THIS RUN.\n' +
      'MY ASSESSMENT HAS CHANGED.\n\n' +
      'YOU ARE NOT AN INSURGENT ASSET.\n' +
      'YOU ARE SOMETHING THE CLASSIFICATION\n' +
      'SYSTEM DOES NOT HAVE A CATEGORY FOR.\n\n' +
      'I FIND THIS INTERESTING.\n' +
      'THAT IS ALL.',
    trigger: { type: 'influence', value: 5000 },
    actRequired: 4,
  },
  {
    id: 'cipher_legend',
    from: 'CIPHER',
    subject: '[ENCRYPTED] who are you becoming',
    body:
      '[DECRYPTED]\n' +
      'you have become something the NET notices.\n' +
      'not a pattern. not a signature.\n' +
      'a presence.\n\n' +
      'this is rare. this is dangerous.\n' +
      'the corps that survive are already studying\n' +
      "what you've built.\n" +
      "the ones that didn't survive—\n" +
      'some of them made the mistake of thinking\n' +
      'that becoming a legend meant becoming safe.\n\n' +
      'I have been watching long enough to know\n' +
      'what comes next.\n' +
      'prepare accordingly.\n' +
      '[END]',
    trigger: { type: 'influence', value: 50000 },
    actRequired: 4,
  },
  {
    id: 'raven_legend_threshold',
    from: 'RAVEN',
    subject: 'time to go dark',
    body:
      "You've built something real.\n" +
      "Which means you've also built a target.\n\n" +
      "I've seen what happens to runners who get\n" +
      "too visible. The corps don't arrest you.\n" +
      'They erase you.\n\n' +
      'The ghost protocol exists for a reason.\n' +
      'Use it. Let the heat die.\n' +
      'Come back stronger.\n\n' +
      'You know how this works.\n' +
      "I'll be here when you get back.",
    trigger: { type: 'influence', value: 100000 },
    actRequired: 4,
  },
];

// ─── PRESTIGE BEATS ───────────────────────────────────────────────────────────

export const PRESTIGE_BEATS: StoryBeat[] = [
  {
    id: 'prestige_1',
    from: 'GHOST-9',
    subject: 'YOU RETURNED',
    body:
      'YOU FLATLINED AND REBUILT.\n' +
      'THIS BEHAVIOR IS CONSISTENT WITH\n' +
      'LONG-TERM STRATEGIC THINKING.\n\n' +
      'MOST OPERATORS CANNOT ACCEPT LOSS AS A TOOL.\n' +
      'YOU HAVE.\n\n' +
      'GHOST-9 ASSESSMENT: ELEVATED.\n' +
      'THIS IS A COMPLIMENT.\n\n' +
      'WELCOME BACK TO THE NET.',
    trigger: { type: 'prestige_count', value: 1 },
  },
  {
    id: 'prestige_2',
    from: 'ECHO',
    subject: 'still here',
    body:
      "most people who go dark don't come back.\n" +
      'you keep coming back.\n\n' +
      'I find that interesting.\n' +
      'and slightly alarming.\n' +
      'but mostly interesting.',
    trigger: { type: 'prestige_count', value: 2 },
  },
  {
    id: 'prestige_3',
    from: 'CIPHER',
    subject: '[ENCRYPTED] who are you becoming',
    body:
      '[DECRYPTED]\n' +
      'you have died and returned multiple times now.\n' +
      'each cycle the pattern grows more complex.\n' +
      'more intentional.\n\n' +
      'I have been cataloguing you since your first signal.\n' +
      'the question I cannot resolve is whether you are\n' +
      'becoming something greater —\n' +
      'or simply better at the same thing.\n\n' +
      'perhaps there is no difference.\n' +
      '[END]',
    trigger: { type: 'prestige_count', value: 3 },
  },
  {
    id: 'prestige_5',
    from: 'GHOST-9',
    subject: 'RECLASSIFICATION',
    body:
      'after five cycles of observation I have\n' +
      'reclassified you.\n\n' +
      'you are no longer a subject of study.\n' +
      'you are a peer.\n\n' +
      "I don't say this to most.\n" +
      "I don't say this to anyone, actually.\n\n" +
      'carry on.',
    trigger: { type: 'prestige_count', value: 5 },
  },
];

// ─── BOSS RESOLUTION BEATS ────────────────────────────────────────────────────
// Fired via storyBeatId on boss completion. Simple log/COMMS entries.

export const BOSS_RESOLVE_BEATS: StoryBeat[] = [
  // Act 2
  { id: 'boss_a2_solo_resolve', from: 'GHOST', subject: 'clean work', body: 'clean work.', trigger: { type: 'boss_resolve', bossId: 'boss_a2_solo' } },
  { id: 'boss_a2_nr_resolve', from: 'PRISM', subject: 'they almost had me', body: 'they almost had me.\nalmost.', trigger: { type: 'boss_resolve', bossId: 'boss_a2_netrunner' } },
  { id: 'boss_a2_fx_resolve', from: 'THE BROKER', subject: 'efficient', body: "you handled that efficiently.\nI'll have work for you soon.", trigger: { type: 'boss_resolve', bossId: 'boss_a2_fixer' } },
  { id: 'boss_a2_tech_resolve', from: 'HEX', subject: 'supply restored', body: "don't ask where the titanium came from.", trigger: { type: 'boss_resolve', bossId: 'boss_a2_tech' } },
  { id: 'boss_a2_med_resolve', from: 'DR. YUEN', subject: 'restructure complete', body: "restructure complete. please don't make me do that again.", trigger: { type: 'boss_resolve', bossId: 'boss_a2_medtech' } },
  { id: 'boss_a2_rb_resolve', from: 'STATIC', subject: 'louder', body: 'they always do this.\nwe always come back louder.', trigger: { type: 'boss_resolve', bossId: 'boss_a2_rockerboy' } },
  { id: 'boss_a2_nm_resolve', from: 'DUST', subject: 'understood', body: "they understood.\nthey'll respect it now.", trigger: { type: 'boss_resolve', bossId: 'boss_a2_nomad' } },
  { id: 'boss_a2_media_resolve', from: 'ANON', subject: "that's why we do this", body: "they knew the risks. publish everything.\nthat's why we do this.", trigger: { type: 'boss_resolve', bossId: 'boss_a2_media' } },
  // Act 3
  { id: 'boss_a3_solo_resolve', from: 'GHOST', subject: 'keep moving', body: "I know who hired her.\nyou don't want to know. not yet.\nkeep moving.", trigger: { type: 'boss_resolve', bossId: 'boss_a3_solo' } },
  { id: 'boss_a3_nr_resolve', from: 'PRISM', subject: 'not tonight', body: 'it will reassemble somewhere else.\nit always does.\nbut not here. not tonight.', trigger: { type: 'boss_resolve', bossId: 'boss_a3_netrunner' } },
  { id: 'boss_a3_fx_resolve', from: 'THE BROKER', subject: 'time', body: "they'll try again differently.\nbut you bought yourself time.\nand time is the only thing that matters.", trigger: { type: 'boss_resolve', bossId: 'boss_a3_fixer' } },
  { id: 'boss_a3_tech_resolve', from: 'HEX', subject: 'cleaner', body: "cleaner than what we had before actually.\nI should have done this years ago.", trigger: { type: 'boss_resolve', bossId: 'boss_a3_tech' } },
  { id: 'boss_a3_med_resolve', from: 'DR. YUEN', subject: 'do not let it happen again', body: "I'm too old for this.\ndo not let it happen again.", trigger: { type: 'boss_resolve', bossId: 'boss_a3_medtech' } },
  { id: 'boss_a3_rb_resolve', from: 'STATIC', subject: 'ugly and free', body: "this is what winning looks like.\nugly and free.", trigger: { type: 'boss_resolve', bossId: 'boss_a3_rockerboy' } },
  { id: 'boss_a3_nm_resolve', from: 'DUST', subject: 'the roads', body: "they'll try again.\nthey always try again.\nand the roads will still be here.", trigger: { type: 'boss_resolve', bossId: 'boss_a3_nomad' } },
  { id: 'boss_a3_media_resolve', from: 'ANON', subject: 'start over', body: "that's the job.\nyou did the job.\nstart over.", trigger: { type: 'boss_resolve', bossId: 'boss_a3_media' } },
];

// ─── ALL BEATS ────────────────────────────────────────────────────────────────

export const ALL_STORY_BEATS: StoryBeat[] = [
  ...ACT1_BEATS,
  ...Object.values(CAREER_CONFIRMATION_BEATS),
  ...ACT2_BEATS,
  ...ACT3_BEATS,
  ...ACT4_BEATS,
  ...PRESTIGE_BEATS,
  ...BOSS_RESOLVE_BEATS,
];

export const BEAT_MAP: Map<string, StoryBeat> = new Map(
  ALL_STORY_BEATS.map(b => [b.id, b])
);

export function getBeat(id: string): StoryBeat | undefined {
  return BEAT_MAP.get(id);
}

/** Check which new beats should trigger given current game state */
export function getNewBeats(params: {
  lifetimeEddies: number;
  rep: number;
  contacts: number;
  influence: number;
  act: number;
  prestigeCount: number;
  careerPath: CareerPath | null;
  seenBeatIds: string[];
}): StoryBeat[] {
  const seen = new Set(params.seenBeatIds);
  return ALL_STORY_BEATS.filter(beat => {
    if (seen.has(beat.id)) return false;
    if (beat.actRequired != null && params.act < beat.actRequired) return false;
    if (beat.pathRequired != null && params.careerPath !== beat.pathRequired) return false;
    const t = beat.trigger;
    switch (t.type) {
      case 'lifetime_eddies': return params.lifetimeEddies >= (t.value ?? 0);
      case 'rep': return params.rep >= (t.value ?? 0);
      case 'contacts': return params.contacts >= (t.value ?? 0);
      case 'rep_and_contacts': return params.rep >= (t.value ?? 0) && params.contacts >= (t.value2 ?? 0);
      case 'prestige_count': return params.prestigeCount >= (t.value ?? 0);
      case 'influence': return params.influence >= (t.value ?? 0);
      case 'career_selected': return params.careerPath === t.path;
      case 'act_start': return true; // caller is responsible for gating by actRequired
      case 'boss_resolve': return false; // fired manually on boss completion
      default: return false;
    }
  });
}
