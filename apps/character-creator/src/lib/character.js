export const skillTiers = [
  { id: "normal", label: "Normal", rankGain: 1 },
  { id: "trained", label: "Trained", rankGain: 2 },
  { id: "expert", label: "Expert", rankGain: 4 }
];

export const STATS = [
  { id: "AG", name: "Agility" },
  { id: "CO", name: "Constitution" },
  { id: "ME", name: "Memory" },
  { id: "RE", name: "Reasoning" },
  { id: "SD", name: "Self Discipline" },
  { id: "EM", name: "Empathy" },
  { id: "IN", name: "Intuition" },
  { id: "PR", name: "Presence" },
  { id: "QU", name: "Quickness" },
  { id: "ST", name: "Strength" }
];

export const DEFAULT_TALENT_POINTS = 40;
export const DEFAULT_CREATION_XP = 45;
export const DEFAULT_TRAINING_POINTS = 50;

export function blankCharacter() {
  return {
    name: "",
    raceId: "",
    cultureId: "",
    professionId: "",
    spellListIds: [],
    spellPool: DEFAULT_CREATION_XP,
    spellRanks: {},
    talentIds: [],
    talentPool: DEFAULT_TALENT_POINTS,
    trainingPackageIds: [],
    trainingPool: DEFAULT_TRAINING_POINTS,
    xp: DEFAULT_CREATION_XP,
    spentXp: 0,
    currentHp: null,
    skillTiers: {},
    skillRanks: {},
    directedSpells: {},
    statPool: 550,
    statPoints: {},
    customRules: "",
    customRuleIds: [],
    languages: [],
    inventory: [],
    ppRanks: { arcane: 0, channeling: 0, essence: 0, mentalism: 0, psionic: 0 }
  };
}

export function rankGainFor(tierId) {
  return skillTiers.find((tier) => tier.id === tierId)?.rankGain ?? 1;
}
