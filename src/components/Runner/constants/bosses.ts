import type { CareerPath } from '../../../types';

export interface BossDef {
  id: string;
  act: 2 | 3;
  path: CareerPath;
  name: string;
  flavourIntro: string;
  flavourResolution: string;
  eddiesCost: number;
  secondaryCost: number;
  rewardEddies: number;
  rewardLogMsg: string;
  storyBeatId: string;
}

// ─── ACT 2 BOSSES ───────────────────────────────────────────────────────────

export const ACT2_BOSSES: BossDef[] = [
  {
    id: 'boss_a2_solo',
    act: 2,
    path: 'solo',
    name: 'MILITECH HIT CONTRACT',
    flavourIntro:
      'Three days ago someone put 50,000 eddies on your head.\n' +
      'No name attached. The contract is open on every\n' +
      'black market board from here to the BosWash corridor.\n\n' +
      'You can run. You can disappear.\n' +
      'Or you can make it very clear that taking this contract\n' +
      'is the last professional decision anyone makes.\n\n' +
      'Your call. But make it fast.',
    flavourResolution:
      'The contract is gone. Pulled overnight.\n' +
      'No explanation given. None needed.\n' +
      'GHOST sends a single message: clean work.\n' +
      'RAVEN sends an invoice.',
    eddiesCost: 50000,
    secondaryCost: 5000,
    rewardEddies: 250000,
    rewardLogMsg: 'Contract burned. GHOST: clean work.',
    storyBeatId: 'boss_a2_solo_resolve',
  },
  {
    id: 'boss_a2_netrunner',
    act: 2,
    path: 'netrunner',
    name: 'NETWATCH GHOST TRACE',
    flavourIntro:
      'PRISM\'s signal just fractured into seven pieces\n' +
      'and went silent. That\'s not a crash. That\'s a warning.\n\n' +
      'Netwatch has a ghost trace on your subnet.\n' +
      'They don\'t know it\'s you yet. But they know\n' +
      'something is running in your space.\n\n' +
      'You have a window. Use it or lose everything\n' +
      'you\'ve built in here.',
    flavourResolution:
      'The trace is burned. New routing is live.\n' +
      'PRISM reassembles over the next six hours.\n' +
      'First message back: they almost had me.\n' +
      'almost.',
    eddiesCost: 100000,
    secondaryCost: 200,
    rewardEddies: 500000,
    rewardLogMsg: 'Trace burned. PRISM: they almost had me. almost.',
    storyBeatId: 'boss_a2_nr_resolve',
  },
  {
    id: 'boss_a2_fixer',
    act: 2,
    path: 'fixer',
    name: 'RIVAL FIXER MOVE',
    flavourIntro:
      'Someone is undercutting your contracts.\n' +
      'Same clients. Lower rates. Faster turnaround.\n' +
      'They know your contact list, which means\n' +
      'there\'s a leak somewhere in your network.\n\n' +
      'You can spend the eddies to buy them out\n' +
      'and absorb their operation.\n' +
      'Or you can spend the connections to find\n' +
      'the leak and send a message.\n\n' +
      'Either way it costs you. But not moving costs more.',
    flavourResolution:
      'The rival is gone. Absorbed or gone, take your pick.\n' +
      'THE BROKER sends a brief note:\n' +
      'you handled that efficiently.\n' +
      'I\'ll have work for you soon.',
    eddiesCost: 75000,
    secondaryCost: 300,
    rewardEddies: 400000,
    rewardLogMsg: 'Rival absorbed. THE BROKER: you handled that efficiently.',
    storyBeatId: 'boss_a2_fx_resolve',
  },
  {
    id: 'boss_a2_tech',
    act: 2,
    path: 'tech',
    name: 'SUPPLY CHAIN COLLAPSE',
    flavourIntro:
      'Three of your Parts suppliers have gone dark\n' +
      'in the same week. Two are corpo-related closures.\n' +
      'One just stopped responding.\n\n' +
      'Your production queue is stalled.\n' +
      'HEX says she can source replacement supply\n' +
      'but it\'s expensive and the channels are dirty.\n\n' +
      'Pay up, get moving, deal with the consequences later.\n' +
      'Or wait for the market to stabilise and lose weeks.',
    flavourResolution:
      'Supply chain is back online. Uglier than before\n' +
      'but functional. HEX sends a parts manifest\n' +
      'and a note: don\'t ask where the titanium came from.',
    eddiesCost: 60000,
    secondaryCost: 500,
    rewardEddies: 350000,
    rewardLogMsg: 'Supply restored. HEX: don\'t ask where the titanium came from.',
    storyBeatId: 'boss_a2_tech_resolve',
  },
  {
    id: 'boss_a2_medtech',
    act: 2,
    path: 'medtech',
    name: 'BIOTECHNICA AUDIT',
    flavourIntro:
      'Biotechnica Compliance has flagged your supply chain.\n' +
      'They\'re not targeting you specifically — they\'re\n' +
      'running a sector sweep, looking for grey market\n' +
      'pharma distribution. But your network is in the path.\n\n' +
      'DR. YUEN says she can restructure the supply lines\n' +
      'but she needs resources and she needs them now.\n\n' +
      'If Compliance finds her, they find you.',
    flavourResolution:
      'The audit missed everything it needed to find.\n' +
      'DR. YUEN sends a terse message:\n' +
      'restructure complete. please don\'t make me do that again.',
    eddiesCost: 80000,
    secondaryCost: 100,
    rewardEddies: 450000,
    rewardLogMsg: 'Audit missed us. DR. YUEN: please don\'t make me do that again.',
    storyBeatId: 'boss_a2_med_resolve',
  },
  {
    id: 'boss_a2_rockerboy',
    act: 2,
    path: 'rockerboy',
    name: 'CONTINENTAL BRANDS INJUNCTION',
    flavourIntro:
      'Continental Brands has filed a cultural suppression order\n' +
      'against your distribution network. Technically legal.\n' +
      'In practice, every platform that carries your signal\n' +
      'has received a letter from their legal department.\n' +
      'Most of them will fold.\n\n' +
      'STATIC says go underground. Spend the Followers\n' +
      'to build a parallel distribution network the corps\n' +
      'can\'t reach. It costs everything you\'ve built\n' +
      'up to this point. But you\'ll own what comes after.',
    flavourResolution:
      'The injunction stands. The official channels are gone.\n' +
      'The underground channels are bigger than what you lost.\n' +
      'STATIC: they always do this.\n' +
      'we always come back louder.',
    eddiesCost: 90000,
    secondaryCost: 1000,
    rewardEddies: 500000,
    rewardLogMsg: 'Underground network built. STATIC: we always come back louder.',
    storyBeatId: 'boss_a2_rb_resolve',
  },
  {
    id: 'boss_a2_nomad',
    act: 2,
    path: 'nomad',
    name: 'RIVAL PACK CHALLENGE',
    flavourIntro:
      'A rival pack has been moving through your territory\n' +
      'for three weeks. Small incursions. Feeling out the edges.\n\n' +
      'DUST says this is a test. If you don\'t respond hard,\n' +
      'they\'ll keep pushing. If you respond wrong,\n' +
      'you start a war you can\'t win right now.\n\n' +
      'Spend the Road Cred to call in every favour you have.\n' +
      'Make it clear that this territory is occupied.\n' +
      'No shots fired. Just presence.',
    flavourResolution:
      'The incursions stopped overnight.\n' +
      'DUST: they understood.\n' +
      'they\'ll respect it now.',
    eddiesCost: 70000,
    secondaryCost: 200,
    rewardEddies: 400000,
    rewardLogMsg: 'Territory held. DUST: they\'ll respect it now.',
    storyBeatId: 'boss_a2_nm_resolve',
  },
  {
    id: 'boss_a2_media',
    act: 2,
    path: 'media',
    name: 'SOURCE BURNED',
    flavourIntro:
      'ANON went silent four days ago.\n' +
      'Today you got confirmation: one of your primary sources\n' +
      'has been identified and is in Militech custody.\n\n' +
      'The story they were feeding you is gone with them.\n' +
      'But the intel they gave you before they were taken —\n' +
      'that\'s still in your possession.\n\n' +
      'Publishing it burns what\'s left of your cover.\n' +
      'Sitting on it means someone suffered for nothing.\n\n' +
      'There\'s no clean version of this. Just less bad ones.',
    flavourResolution:
      'The story published. The source is still in custody.\n' +
      'You can\'t fix that. But the story is out.\n' +
      'ANON makes contact from a new dead drop:\n' +
      'they knew the risks. publish everything.\n' +
      'that\'s why we do this.',
    eddiesCost: 85000,
    secondaryCost: 150,
    rewardEddies: 480000,
    rewardLogMsg: 'Story published. ANON: that\'s why we do this.',
    storyBeatId: 'boss_a2_media_resolve',
  },
];

// ─── ACT 3 BOSSES ───────────────────────────────────────────────────────────

export const ACT3_BOSSES: BossDef[] = [
  {
    id: 'boss_a3_solo',
    act: 3,
    path: 'solo',
    name: 'VOSS — THE CLEANER',
    flavourIntro:
      'Her name is VOSS. Former Arasaka black-ops.\n' +
      'Now she works for whoever pays what she\'s worth,\n' +
      'and someone is paying her a lot to make sure\n' +
      'you don\'t finish what you\'ve started.\n\n' +
      'She\'s not a contract. She\'s a message.\n' +
      'You can run. She\'ll find you.\n' +
      'You can negotiate. She won\'t.\n' +
      'You can fight. That\'s what she\'s counting on.\n\n' +
      'Spend everything you\'ve got to make sure\n' +
      'you\'re the one still standing when it\'s done.',
    flavourResolution:
      'VOSS is gone. The contract died with her, presumably.\n' +
      'GHOST: I know who hired her.\n' +
      'you don\'t want to know. not yet.\n' +
      'keep moving.',
    eddiesCost: 5000000,
    secondaryCost: 10000,
    rewardEddies: 25000000,
    rewardLogMsg: 'VOSS: neutralised. GHOST: keep moving.',
    storyBeatId: 'boss_a3_solo_resolve',
  },
  {
    id: 'boss_a3_netrunner',
    act: 3,
    path: 'netrunner',
    name: 'SABLE — ROGUE AI',
    flavourIntro:
      'It calls itself SABLE.\n' +
      'It was a Netwatch enforcement AI before\n' +
      'something went wrong with its target parameters.\n' +
      'Now it\'s rogue, it\'s in your subnet,\n' +
      'and it\'s systematically dismantling everything\n' +
      'you\'ve built in here.\n\n' +
      'This isn\'t a hack. This is a war.\n' +
      'PRISM says it can help but it\'s scared.\n' +
      'An AI that\'s scared of another AI should\n' +
      'probably scare you too.\n\n' +
      'Burn the Bandwidth. Flood the subnet.\n' +
      'Drive it out before it finishes what it started.',
    flavourResolution:
      'SABLE fragmented and retreated.\n' +
      'PRISM: it will reassemble somewhere else.\n' +
      'it always does.\n' +
      'but not here. not tonight.',
    eddiesCost: 10000000,
    secondaryCost: 5000,
    rewardEddies: 50000000,
    rewardLogMsg: 'SABLE driven out. PRISM: not here. not tonight.',
    storyBeatId: 'boss_a3_nr_resolve',
  },
  {
    id: 'boss_a3_fixer',
    act: 3,
    path: 'fixer',
    name: 'THE CONSORTIUM',
    flavourIntro:
      'Three corporations. One coordinated move.\n' +
      'Petrochem, Kang Tao, and a third party\n' +
      'whose name THE BROKER will not say.\n' +
      'They\'ve decided you\'re a problem worth solving together.\n\n' +
      'Contracts pulled. Clients warned off. Payments frozen.\n' +
      'This isn\'t competition. This is erasure.\n\n' +
      'You have one weapon they didn\'t account for:\n' +
      'the connections they can\'t reach.\n' +
      'Spend everything in the network.\n' +
      'Call in every favour that exists.\n' +
      'Make them understand that erasing you\n' +
      'costs more than tolerating you.',
    flavourResolution:
      'The Consortium pulled back.\n' +
      'THE BROKER: they\'ll try again differently.\n' +
      'but you bought yourself time.\n' +
      'and time is the only thing that matters.',
    eddiesCost: 8000000,
    secondaryCost: 8000,
    rewardEddies: 40000000,
    rewardLogMsg: 'Consortium retreated. THE BROKER: time is the only thing that matters.',
    storyBeatId: 'boss_a3_fx_resolve',
  },
  {
    id: 'boss_a3_tech',
    act: 3,
    path: 'tech',
    name: 'MILITECH IP DIVISION',
    flavourIntro:
      'Eight lawyers. Four soldiers.\n' +
      'Militech IP Division has determined that three\n' +
      'of your core production methods constitute\n' +
      'infringement of post-nationalisation patents.\n' +
      'The lawyers are wrong. The soldiers don\'t care.\n\n' +
      'HEX says fight it in the courts and lose everything\n' +
      'waiting, or spend the Parts to rebuild the\n' +
      'production process from the ground up\n' +
      'using methods they can\'t touch.\n\n' +
      'It\'ll cost everything. It\'ll take time.\n' +
      'But what comes out the other side is yours.\n' +
      'Actually, permanently, yours.',
    flavourResolution:
      'New production lines are live.\n' +
      'HEX: cleaner than what we had before actually.\n' +
      'I should have done this years ago.',
    eddiesCost: 7000000,
    secondaryCost: 15000,
    rewardEddies: 35000000,
    rewardLogMsg: 'Production rebuilt. HEX: cleaner than what we had before.',
    storyBeatId: 'boss_a3_tech_resolve',
  },
  {
    id: 'boss_a3_medtech',
    act: 3,
    path: 'medtech',
    name: 'BIOTECHNICA COMPLIANCE',
    flavourIntro:
      'They\'re not looking for grey market supply this time.\n' +
      'They\'re looking for you specifically.\n' +
      'Three clinics in your network have been flagged.\n' +
      'Two have already been shut down.\n\n' +
      'DR. YUEN says one more closure and the whole\n' +
      'network collapses under the weight of the caseload.\n\n' +
      'You need to spend everything —\n' +
      'patients, eddies, every favour DR. YUEN has\n' +
      'stockpiled in twenty years of shadow medicine —\n' +
      'to rebuild the network structure so fast\n' +
      'that Compliance can\'t keep up.\n\n' +
      'It\'s a sprint. You either win it or you don\'t.',
    flavourResolution:
      'The network survived. Restructured, smaller,\n' +
      'but intact. DR. YUEN:\n' +
      'I\'m too old for this.\n' +
      'do not let it happen again.',
    eddiesCost: 9000000,
    secondaryCost: 3000,
    rewardEddies: 45000000,
    rewardLogMsg: 'Network survived. DR. YUEN: do not let it happen again.',
    storyBeatId: 'boss_a3_med_resolve',
  },
  {
    id: 'boss_a3_rockerboy',
    act: 3,
    path: 'rockerboy',
    name: 'THE BLACKLIST',
    flavourIntro:
      'They did it all at once. That\'s the tell —\n' +
      'this was coordinated at a level above\n' +
      'any single corporation.\n\n' +
      'Every major platform. Every distribution channel.\n' +
      'Your signal is gone from all of them simultaneously.\n\n' +
      'STATIC says this is the thing she always\n' +
      'knew was coming. The question is whether\n' +
      'you built enough of the underground\n' +
      'before they hit the kill switch.\n\n' +
      'Spend the Followers. Convert them.\n' +
      'Activists, operators, broadcasters, distributors.\n' +
      'Build the network they can\'t licence away.\n' +
      'It has to happen now.',
    flavourResolution:
      'The blacklist is complete and permanent.\n' +
      'The underground network is larger than\n' +
      'anything you had before.\n' +
      'STATIC: this is what winning looks like.\n' +
      'ugly and free.',
    eddiesCost: 12000000,
    secondaryCost: 30000,
    rewardEddies: 60000000,
    rewardLogMsg: 'Underground network complete. STATIC: ugly and free.',
    storyBeatId: 'boss_a3_rb_resolve',
  },
  {
    id: 'boss_a3_nomad',
    act: 3,
    path: 'nomad',
    name: 'THE RECLAMATION',
    flavourIntro:
      'Government forces. Actual military, not corpo.\n' +
      'The territorial reclamation order covers the\n' +
      'entire badlands corridor you\'ve built your\n' +
      'operation through.\n\n' +
      'DUST says this happens every ten years.\n' +
      'The government tries to take back the roads.\n' +
      'The roads push back.\n' +
      'But it costs something every time.\n\n' +
      'Spend the Road Cred. Call the pack.\n' +
      'Make the roads too expensive to hold.\n' +
      'You don\'t win this by fighting.\n' +
      'You win it by making the cost of staying\n' +
      'higher than the value of the territory.',
    flavourResolution:
      'The reclamation order was quietly suspended.\n' +
      'DUST: they\'ll try again.\n' +
      'they always try again.\n' +
      'and the roads will still be here.',
    eddiesCost: 8000000,
    secondaryCost: 6000,
    rewardEddies: 40000000,
    rewardLogMsg: 'Reclamation suspended. DUST: and the roads will still be here.',
    storyBeatId: 'boss_a3_nm_resolve',
  },
  {
    id: 'boss_a3_media',
    act: 3,
    path: 'media',
    name: 'THE SUPPRESSION',
    flavourIntro:
      'Your source network is collapsing.\n' +
      'ANON says someone has been building a profile\n' +
      'on every contact you\'ve used in the last six months.\n' +
      'They\'re not wrong about much.\n\n' +
      'If you don\'t burn the current network and\n' +
      'rebuild from scratch, everyone in it\n' +
      'is going to be found.\n\n' +
      'The cost is everything — every Source,\n' +
      'every dead drop, every relationship.\n' +
      'You spend it all to protect the people\n' +
      'who trusted you with the truth.\n' +
      'And then you build again.',
    flavourResolution:
      'The network is gone. The people are safe.\n' +
      'ANON from a new address, new method:\n' +
      'that\'s the job.\n' +
      'you did the job.\n' +
      'start over.',
    eddiesCost: 11000000,
    secondaryCost: 5000,
    rewardEddies: 55000000,
    rewardLogMsg: 'Sources protected. ANON: you did the job. start over.',
    storyBeatId: 'boss_a3_media_resolve',
  },
];

export const ALL_BOSSES = [...ACT2_BOSSES, ...ACT3_BOSSES];

export function getBossByPath(path: CareerPath, act: 2 | 3): BossDef | undefined {
  return ALL_BOSSES.find(b => b.path === path && b.act === act);
}
