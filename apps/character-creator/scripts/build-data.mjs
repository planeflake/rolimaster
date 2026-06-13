import fs from "node:fs";
import path from "node:path";

const appRoot = process.cwd();
const workspaceRoot = path.resolve(appRoot, "../..");
const rolemasterRoot = path.join(workspaceRoot, "Aethergate", "Rolemaster");
const outFile = path.join(appRoot, "src", "lib", "generated-data.json");
const referenceTrainingPages = new Set(["Training Package Rules", "Training Packages"]);
const hiddenProfessionPages = new Set(["Evil Cleric", "Evil Magician", "Evil Mentalist"]);
const trainingPackageGroups = {
  "Adventurer": { group: "Travel / Sea / Adventuring", tags: ["Exploration", "Generalist"] },
  "Amateur Mage": { group: "Arcane / Magical Study", tags: ["Magical", "Student"] },
  "Amateur Mage Revised": { group: "Arcane / Magical Study", tags: ["Magical", "Student"] },
  "Animal Friend": { group: "Wilderness / Animals", tags: ["Animals", "Outdoors"] },
  "Animal Handler": { group: "Wilderness / Animals", tags: ["Animals", "Vocational"] },
  "Arachnamancer": { group: "Specialized Magical Traditions", tags: ["Essence", "Spiders"] },
  "Beastmaster": { group: "Wilderness / Animals", tags: ["Animals", "Companion"] },
  "Burglar": { group: "Stealth / Deception / Underworld", tags: ["Stealth", "Urban"] },
  "Catalyst Collector": { group: "Urban / Trade / Professional", tags: ["Magical", "Wilderness", "Craft"] },
  "Chancellor": { group: "Religious / Spiritual", tags: ["Administration", "Leadership"] },
  "Charlatan": { group: "Stealth / Deception / Underworld", tags: ["Social", "Deception"] },
  "City Guard": { group: "Martial / Guard / Military", tags: ["Urban", "Law"] },
  "Corpist Caster": { group: "Specialized Magical Traditions", tags: ["Catalysts", "Body Parts"] },
  "Crystallist Caster": { group: "Specialized Magical Traditions", tags: ["Crystals", "Craft"] },
  "Cultist": { group: "Religious / Spiritual", tags: ["Forbidden Lore", "Secretive"] },
  "Demonologist": { group: "Specialized Magical Traditions", tags: ["Demons", "Forbidden Lore"] },
  "Doctor": { group: "Healing / Medicine / Herbs", tags: ["Medicine", "Vocational"] },
  "Dream Traveller": { group: "Specialized Magical Traditions", tags: ["Dreams", "Mentalism"] },
  "Dreamweaver": { group: "Specialized Magical Traditions", tags: ["Dreams", "Mentalism"] },
  "Fortune Teller": { group: "Stealth / Deception / Underworld", tags: ["Social", "Divination"] },
  "Guild Apprentice": { group: "Arcane / Magical Study", tags: ["Magical", "Guild"] },
  "Hedge Wizard": { group: "Arcane / Magical Study", tags: ["Essence", "Folk Magic"] },
  "Herbalist": { group: "Healing / Medicine / Herbs", tags: ["Herbs", "Vocational"] },
  "Herbalist Caster": { group: "Specialized Magical Traditions", tags: ["Herbs", "Magical"] },
  "Hermit": { group: "Wilderness / Animals", tags: ["Solitary", "Survival"] },
  "Houri": { group: "Stealth / Deception / Underworld", tags: ["Social", "Influence"] },
  "Hunter": { group: "Wilderness / Animals", tags: ["Tracking", "Survival"] },
  "Inquisitor": { group: "Religious / Spiritual", tags: ["Investigation", "Faith"] },
  "Journeying Apprentice": { group: "Arcane / Magical Study", tags: ["Magical", "Travel"] },
  "Knight": { group: "Martial / Guard / Military", tags: ["Armor", "Noble"] },
  "Librarian": { group: "Scholarly / Lore / Academic", tags: ["Books", "Research"] },
  "Loremaster": { group: "Scholarly / Lore / Academic", tags: ["Lore", "Research"] },
  "Mariner": { group: "Travel / Sea / Adventuring", tags: ["Sea", "Navigation"] },
  "Medic": { group: "Healing / Medicine / Herbs", tags: ["Medicine", "Religious"] },
  "Medium": { group: "Religious / Spiritual", tags: ["Spirit", "Channeling"] },
  "Merchant": { group: "Urban / Trade / Professional", tags: ["Trade", "Social"] },
  "Minister": { group: "Religious / Spiritual", tags: ["Community", "Leadership"] },
  "Missionary": { group: "Religious / Spiritual", tags: ["Travel", "Teaching"] },
  "Nomenist Caster": { group: "Specialized Magical Traditions", tags: ["Language", "Primal Tongue"] },
  "Oracle": { group: "Religious / Spiritual", tags: ["Divination", "Mystery"] },
  "Performer": { group: "Urban / Trade / Professional", tags: ["Entertainment", "Social"] },
  "Physician": { group: "Healing / Medicine / Herbs", tags: ["Medicine", "Professional"] },
  "Pilgrim": { group: "Religious / Spiritual", tags: ["Travel", "Faith"] },
  "Potioner": { group: "Specialized Magical Traditions", tags: ["Healing", "Craft", "Alchemy"] },
  "Protector": { group: "Wilderness / Animals", tags: ["Martial", "Monster Hunter"] },
  "Protege": { group: "Arcane / Magical Study", tags: ["Magical", "Mentor"] },
  "Sage": { group: "Scholarly / Lore / Academic", tags: ["Lore", "Research"] },
  "Scout": { group: "Wilderness / Animals", tags: ["Travel", "Reconnaissance"] },
  "Soldier": { group: "Martial / Guard / Military", tags: ["Military", "Weapons"] },
  "Spell Researcher": { group: "Arcane / Magical Study", tags: ["Scholarly", "Lore"] },
  "Spell Student": { group: "Arcane / Magical Study", tags: ["School", "Magical"] },
  "Templar": { group: "Religious / Spiritual", tags: ["Martial", "Armor", "Defender"] },
  "Theurgist": { group: "Religious / Spiritual", tags: ["Healing", "Channeling"] },
  "Traveller": { group: "Travel / Sea / Adventuring", tags: ["Travel", "Regional"] },
  "Witch": { group: "Specialized Magical Traditions", tags: ["Ritual", "Forbidden Lore"] }
};

const talentGroupRules = [
  {
    group: "Magical / Spellcasting",
    tags: ["Magic", "Spells"],
    names: [
      "Arcane Discovery",
      "Archetype",
      "Archmage Abilities",
      "Aura",
      "Eloquence",
      "Exceptional Magical Ability",
      "Innate Magician",
      "Magical Affinity",
      "Magical Resistance",
      "Mana Reading",
      "Mana Sensing",
      "Power",
      "Runic Lore",
      "Scope Skills (radius)",
      "Scope Skills (target)",
      "Spatial Bonding",
      "Spatial Skills: Self to Touch",
      "Spatial Skills: Touch to 5'",
      "Spatial Skills: +50'",
      "Sub-conscious Discipline",
      "Temporal Skills",
      "Transcendence",
      "Undetectable",
      "Unnatural Aging",
      "Visions"
    ]
  },
  {
    group: "Martial / Combat",
    tags: ["Combat", "Weapons"],
    names: [
      "Aggression",
      "Assassin Training",
      "Battle Cry",
      "Battle Reflexes",
      "Combat Reflexes",
      "Dead Eye",
      "Deadly Training",
      "Directed Weapons Master",
      "Disarm Skill",
      "Exceptional Skill at Arms",
      "General Weapons Master",
      "Hammerhand",
      "Martial Arts Training",
      "Natural Archer",
      "Natural Facility With Armor",
      "Natural Weapons Master",
      "Peripheral Vision",
      "Precision",
      "Shield Attack",
      "Shield Mastery",
      "Tensile",
      "Trained Regular Footman",
      "Warrior Extraordinare",
      "Weapon Control"
    ]
  },
  {
    group: "Physical / Body",
    tags: ["Body", "Durability"],
    names: [
      "Accelerated Mending",
      "Ambidexterity",
      "Blazing Speed",
      "Cold Resistance (lesser)",
      "Cold Resistance (minor)",
      "Cold Resistance (major)",
      "Cold Resistance (greater)",
      "Dense (double)",
      "Dense (quadruple)",
      "Dwarfism (half)",
      "Dwarfism (quarter)",
      "Extra Limbs (+1)",
      "Extra Limbs (+2)",
      "Extra Limbs (+3)",
      "Extra Limbs (+4)",
      "Giantism (double)",
      "Giantism (quadruple)",
      "Heat Resistance (lesser)",
      "Heat Resistance (minor)",
      "Heat Resistance (major)",
      "Heat Resistance (greater)",
      "Hypercharged Adrenaline",
      "Inner Reserve",
      "Natural Physique",
      "Pain Resistance",
      "Regeneration (lesser)",
      "Regeneration (minor)",
      "Regeneration (major)",
      "Regeneration (greater)",
      "Resilient",
      "Reverbative Strength",
      "Steel Grip",
      "Strong Lungs",
      "Sturdy Build",
      "Subconscious Preparation",
      "Tolerance",
      "Tough Skin (wolf)",
      "Tough Skin (tiger)",
      "Tough Skin (insect)",
      "Unnatural Stamina"
    ]
  },
  {
    group: "Movement / Mobility",
    tags: ["Movement", "Travel"],
    names: [
      "Acrobat",
      "Flight",
      "Fluid Wrists",
      "Gliding",
      "Great Arm",
      "Gymnastic Training",
      "High Jumper",
      "Lightning Strike",
      "Nimble Skeleton",
      "Portage Skills",
      "Swift Dresser"
    ]
  },
  {
    group: "Senses / Perception",
    tags: ["Awareness", "Senses"],
    names: [
      "Acute Hearing",
      "Acute Smell",
      "Danger Sense",
      "Destiny Sense",
      "Ethereal Sight",
      "Eye of the Hawk",
      "Eye of the Tiger",
      "High Range Voice",
      "Infravision",
      "Internal Clock",
      "Intense Eyes",
      "Judge of Angles",
      "Judge of Weaponry",
      "Light Sleeper",
      "Microscopic Vision",
      "Navigation Gift",
      "Nightvision",
      "Sense",
      "Sonar Sense",
      "Stability Sense",
      "Ultrasonic Hearing",
      "X-ray Vision"
    ]
  },
  {
    group: "Stealth / Deception",
    tags: ["Stealth", "Underworld"],
    names: [
      "Neutral Odor",
      "Quiet Stride",
      "Sleight-of-Hand",
      "Subtle",
      "Underground Upraising"
    ]
  },
  {
    group: "Social / Leadership",
    tags: ["Social", "Influence"],
    names: [
      "Commanding Demeanor",
      "Fluent",
      "Golden Throat",
      "Good Battlefield Awareness",
      "Look of Eagles",
      "Master Tactician"
    ]
  },
  {
    group: "Mental / Will",
    tags: ["Mental", "Discipline"],
    names: [
      "Animal Empathy",
      "Calmness",
      "Dominance",
      "Empathy",
      "Immovable Will",
      "Instinctive Defense",
      "Internal Sense",
      "Manual Deftness",
      "Mental Control",
      "Mental Link",
      "Mental Scan",
      "Mind Over Matter",
      "Photographic Memory",
      "Quick Calculator",
      "Speed Reading",
      "Survival Instinct",
      "Telekinesis",
      "Telepathy",
      "Unbeliever",
      "Violent Prejudice"
    ]
  },
  {
    group: "Wilderness / Animals",
    tags: ["Wilderness", "Animals"],
    names: [
      "Elvish Training",
      "Geographic Awareness",
      "Herbalist",
      "Natural Horseman",
      "Natural Weapon",
      "Outdoorsman",
      "Poison Sack",
      "Racial Training (familiar)",
      "Racial Training (expert)"
    ]
  },
  {
    group: "Supernatural Powers",
    tags: ["Powers", "Unusual"],
    names: [
      "Adherent",
      "Affect Environment (lesser)",
      "Affect Environment (greater)",
      "Amazing Leaping",
      "Attribute Drain",
      "Bane",
      "Blessed by War God",
      "Darkness",
      "Duplication (lesser)",
      "Duplication (greater)",
      "Elasticity",
      "Ensnare (lesser)",
      "Ensnare (greater)",
      "Ensorcellment Cure",
      "Ethereal Tie",
      "Flare",
      "Force Shield (minor)",
      "Force Shield (major)",
      "Force Shield (greater)",
      "Invisibility",
      "Life Support (minor)",
      "Life Support (major)",
      "Life Support (greater)",
      "Lifetime Goal",
      "Lucky",
      "Master Warrior Friend",
      "Mentor",
      "Natural Ranged Attack (lesser)",
      "Natural Ranged Attack (greater)",
      "Non-corporeal",
      "Planar Travel (minor)",
      "Planar Travel (major)",
      "Planar Travel (greater)",
      "Power Absorption (lesser)",
      "Power Absorption (greater)",
      "Shapechanger",
      "Special Familiar",
      "Stat Improvement",
      "Succor (lesser)",
      "Succor (minor)",
      "Succor (major)",
      "Succor (greater)",
      "Summon",
      "Teleportation",
      "Tunneling"
    ]
  }
];

const skillSummaryOverrides = {
  "Body Development": "Improves physical toughness and the character's ability to withstand injury.",
  "Power Point Development": "Increases the power points available for spell casting.",
  "Directed Spells": "Aims bolt, ray, and other directed spell attacks.",
  "Ambush": "Improves attacks made from surprise, concealment, or a vulnerable angle.",
  "Alertness": "Notices danger, movement, and small details before they become obvious.",
  "Detect Traps": "Finds traps, concealed triggers, and suspicious mechanisms.",
  "Locate Hidden": "Finds hidden objects, compartments, doors, and concealed details.",
  "Picking Locks": "Opens locks through tools, touch, and mechanical understanding.",
  "Disarming Traps": "Safely disables traps, alarms, and dangerous mechanisms.",
  "Hiding": "Keeps the character unseen while stationary or using cover.",
  "Picking Pockets": "Takes or plants small objects without being noticed.",
  "Stalk/Hide": "Moves quietly and remains hidden while approaching or avoiding notice."
};

const skillCategorySummaries = [
  [/^artistic-active$/i, "active performance, practiced expression, and audience-facing art"],
  [/^artistic-passive$/i, "artistic knowledge, appreciation, composition, and interpretation"],
  [/^athletic-brawn$/i, "strength-driven movement, throwing, jumping, and forceful physical action"],
  [/^athletic-endurance$/i, "sustained effort, distance, fatigue, and long physical activity"],
  [/^athletic-gymnastics$/i, "balance, climbing, tumbling, acrobatics, and precise movement"],
  [/^awareness-perceptions$/i, "passive noticing, quick observation, and reading the immediate environment"],
  [/^awareness-searching$/i, "active searching, investigation, hidden objects, and careful inspection"],
  [/^awareness-senses$/i, "direction, unusual senses, tracking sensory clues, and orientation"],
  [/^body-development$/i, "physical resilience, endurance under harm, and surviving injury"],
  [/^combat-maneuvers$/i, "tactical combat movement, positioning, and weapon-adjacent maneuvers"],
  [/^communications$/i, "language, speech, signals, reading, and information exchange"],
  [/^crafts$/i, "making, repairing, preparing, and working physical materials"],
  [/^influence$/i, "persuasion, leadership, deception, pressure, and social leverage"],
  [/^lore-general$/i, "common academic knowledge, history, culture, and broad learning"],
  [/^lore-magical$/i, "magical knowledge, arcane traditions, artifacts, rituals, and supernatural theory"],
  [/^lore-obscure$/i, "rare, hidden, monstrous, planar, or forbidden knowledge"],
  [/^lore-technical$/i, "specialized practical knowledge such as herbs, locks, metals, and poisons"],
  [/^martial-arts/i, "unarmed fighting techniques, strikes, sweeps, defense, and trained body control"],
  [/^outdoor-animal$/i, "riding, handling, driving, and working with animals"],
  [/^outdoor-environmental$/i, "wilderness survival, travel, foraging, hunting, and fieldcraft"],
  [/^power-awareness$/i, "sensing, understanding, aiming, and recognizing magical power"],
  [/^power-manipulation$/i, "controlling, channeling, and shaping magical power"],
  [/^science\/analytic-basic$/i, "basic analysis, mathematics, reasoning, and practical calculation"],
  [/^science\/analytic-specialized$/i, "advanced analysis, science, technical reasoning, and complex study"],
  [/^self-control$/i, "adrenal discipline, trance states, internal focus, and bodily control"],
  [/^special-attacks$/i, "unusual attacks, brawling, jousting, and specialized offensive techniques"],
  [/^special-defenses$/i, "unusual defenses, adrenal toughness, and specialized protection"],
  [/^subterfuge-attack$/i, "surprise attacks, concealed strikes, and exploiting openings"],
  [/^subterfuge-mechanics$/i, "locks, traps, disguise, forgery, camouflage, and hidden mechanisms"],
  [/^subterfuge-stealth$/i, "hiding, sneaking, theft, concealment, and unseen movement"],
  [/^technical\/trade-general$/i, "general practical trades, services, tools, and everyday professional tasks"],
  [/^technical\/trade-professional$/i, "trained professions, engineering, diagnostics, and expert technical work"],
  [/^technical\/trade-vocational$/i, "vocational practice, appraisal, administration, preparation, and applied work"],
  [/^urban$/i, "city contacts, crowds, streets, local systems, and urban survival"],
  [/^weapon/i, "weapon training, attacks, parries, and martial proficiency"],
  [/^armor/i, "wearing armor effectively and reducing its movement penalties"],
  [/^spells/i, "spell mastery and specialized spell-use techniques"]
];

function readMarkdownFiles(relativeDir) {
  const dir = path.join(rolemasterRoot, relativeDir);
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      return [filePath, fs.readFileSync(filePath, "utf8")];
    });
}

function readMarkdownFilesRecursive(relativeDir) {
  const dir = path.join(rolemasterRoot, relativeDir);
  const files = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const filePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push([filePath, fs.readFileSync(filePath, "utf8")]);
      }
    }
  }

  walk(dir);
  return files;
}

function fileName(filePath) {
  return path.basename(filePath, ".md");
}

function vaultPath(filePath) {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---[\s\S]*?---\s*/, "");
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\s*([\s\S]*?)---/);
  if (!match) return {};

  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^"|"$/g, "")])
  );
}

function title(markdown, fallback) {
  return stripFrontmatter(markdown).match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function section(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}` || line.trim() === `### ${heading}`);
  if (start === -1) return "";
  const level = lines[start].match(/^#+/)?.[0].length ?? 2;
  const end = lines.findIndex((line, index) => index > start && /^#{1,6}\s+/.test(line) && (line.match(/^#+/)?.[0].length ?? 99) <= level);
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

function firstParagraph(markdown, heading = "Summary") {
  return (
    section(markdown, heading)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => !line.startsWith("|") && !line.startsWith("- ")) ?? ""
  );
}

function tables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) continue;
    const block = [];
    while (index < lines.length && lines[index].trim().startsWith("|")) {
      block.push(lines[index]);
      index += 1;
    }
    if (block.length >= 2) found.push(parseTable(block));
  }
  return found.filter((table) => table.headers.length);
}

function parseTable(block) {
  const rows = block
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
    )
    .filter((cells) => cells.some(Boolean));

  const headers = rows[0] ?? [];
  const body = rows.slice(2);
  return {
    headers,
    rows: body.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])))
  };
}

function tableInSection(markdown, heading, requiredHeader) {
  return tables(section(markdown, heading)).find((table) => table.headers.includes(requiredHeader))?.rows ?? [];
}

function parseListLine(markdown, label) {
  const match = markdown.match(new RegExp(`- \\*\\*${label}:\\*\\*\\s*(.+)`, "i"));
  return match ? match[1].replace(/\[\[|\]\]/g, "").split(/,\s*/).map((item) => item.replace(/\..*$/, "").trim()).filter(Boolean) : [];
}

function cleanWiki(value) {
  return value.replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, target, alias) => alias || target).replace(/`/g, "").trim();
}

function wikiLinks(markdown) {
  return [...markdown.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map(([, target, alias]) => ({
    target: target.trim(),
    label: (alias || target).trim()
  }));
}

function numeric(value) {
  const match = String(value).match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function classifyTalent(name, category) {
  const rule = talentGroupRules.find((candidate) => candidate.names.includes(name));
  if (rule) return { group: rule.group, tags: rule.tags };

  const categoryFallbacks = {
    "Special Training": { group: "Training / Skills", tags: ["Training"] },
    "Physical Ability": { group: "Physical / Body", tags: ["Body"] },
    "Mystical Ability": { group: "Magical / Spellcasting", tags: ["Magic"] },
    "Mental Ability": { group: "Mental / Will", tags: ["Mental"] },
    "Special Ability": { group: "Supernatural Powers", tags: ["Powers"] }
  };

  return categoryFallbacks[category] ?? { group: "Unclassified", tags: [] };
}

function parseRace(filePath, markdown) {
  const fm = frontmatter(markdown);
  const name = title(markdown, fileName(filePath));
  const statRows = tableInSection(markdown, "Stat Modifiers", "AG");
  const valueRows = tableInSection(markdown, "Character Values", "Soul Departure");
  const gmRows = tableInSection(markdown, "GM Information", "Base Rate");
  const bdRows = tableInSection(markdown, "Body Development", "Ranks");
  const ppRows = tableInSection(markdown, "Progression Rates", "Body Development");

  return {
    id: name,
    name,
    source: fm.source ?? "",
    sourcePage: fm.source_page ?? "",
    path: vaultPath(filePath),
    summary: firstParagraph(markdown),
    stats: statRows[0] ?? {},
    languages: section(markdown, "Languages").trim(),
    backgroundOptions: numeric(valueRows[0]?.["Background Options"] ?? 0),
    baseRate: gmRows[0]?.["Base Rate"] ?? "",
    notes: section(markdown, "Mechanical Notes").trim(),
    bodyDevelopment: bdRows.map((row) => ({ range: row.Ranks, xpCost: numeric(row["XP Cost"]) })),
    ppProgression: {
      arcane: ppRows[0]?.["Arcane PP"] ?? "",
      channeling: ppRows[0]?.["Channeling PP"] ?? "",
      essence: ppRows[0]?.["Essence PP"] ?? "",
      mentalism: ppRows[0]?.["Mentalism PP"] ?? "",
      psionic: ppRows[0]?.["Psionic PP"] ?? ""
    }
  };
}

function parseProfession(filePath, markdown) {
  const fm = frontmatter(markdown);
  const name = title(markdown, fileName(filePath));
  const skillRows = tableInSection(markdown, "Skills and Skill Categories", "Skill Category");
  const skillTrainingRows = tableInSection(markdown, "Simplified Skill Training", "Skill Category");
  const professionBonusRows = tableInSection(markdown, "Profession Bonuses", "Area");
  const chooseSpellGroups = parseChooseSpellGroups(markdown);

  return {
    id: name,
    name,
    realm: fm.realm ?? "",
    secondaryRealm: fm.secondary_realm ?? "",
    spellUser: fm.spell_user ?? "",
    source: fm.source ?? "",
    sourcePage: fm.source_page ?? "",
    path: vaultPath(filePath),
    summary: firstParagraph(markdown),
    primeStats: markdown.match(/\*\*Prime stats:\*\*\s*(.+)$/m)?.[1] ?? "",
    everymanSkills: parseListLine(markdown, "Everyman skills"),
    occupationalSkills: parseListLine(markdown, "Occupational skills"),
    restrictedSkills: parseListLine(markdown, "Restricted skills"),
    professionBonuses: professionBonusRows.map((row) => ({
      area: cleanWiki(row.Area),
      bonus: row.Bonus
    })),
    chooseSpellGroups,
    chooseSpellListIds: chooseSpellGroups.flatMap((group) => group.lists.map((list) => list.id)),
    skillCosts: skillRows.map((row) => ({
      category: cleanWiki(row["Skill Category"]),
      cost: row.Cost
    })),
    skillTraining: skillTrainingRows.map((row) => ({
      category: cleanWiki(row["Skill Category"]),
      tier: normalizeSkillTier(row.Tier)
    }))
  };
}

function normalizeSkillTier(value) {
  const tier = String(value ?? "")
    .trim()
    .toLowerCase();
  if (tier === "pro" || tier === "professional") return "expert";
  if (tier === "trained") return "trained";
  if (tier === "expert") return "expert";
  return "normal";
}

function parseChooseSpellGroups(markdown) {
  const content = section(markdown, "Choose Spells");
  if (!content) return [];

  const groups = [];
  let current = null;
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      current = { name: heading[1].trim(), lists: [] };
      groups.push(current);
      continue;
    }
    if (!current || !line.trim().startsWith("- ")) continue;
    for (const link of wikiLinks(line)) {
      current.lists.push({ id: link.target, name: link.label });
    }
  }

  return groups.filter((group) => group.lists.length);
}

function parseTrainingPackage(filePath, markdown) {
  const fm = frontmatter(markdown);
  const name = title(markdown, fileName(filePath));
  const ranks = tableInSection(markdown, "Skill Ranks", "Category or skill");
  const costRows = tableInSection(markdown, "Cost by Profession", "Fighter");
  const classification = trainingPackageGroups[name] ?? { group: "Unclassified", tags: [] };

  return {
    id: name,
    name,
    type: fm.package_type ?? "",
    group: classification.group,
    tags: classification.tags,
    source: fm.source ?? "",
    sourcePage: fm.source_page ?? "",
    path: vaultPath(filePath),
    summary: firstParagraph(markdown),
    ranks: ranks.map((row) => ({
      name: cleanWiki(row["Category or skill"]),
      ranks: numeric(row.Ranks)
    })),
    costs: Object.fromEntries(Object.entries(costRows[0] ?? {}).map(([profession, cost]) => [profession, numeric(cost)]))
  };
}

function parseCulture(filePath, markdown) {
  const fm = frontmatter(markdown);
  const name = title(markdown, fileName(filePath));
  const ranks = tableInSection(markdown, "Adolescent Skill Ranks", "Skill or Category");

  return {
    id: name,
    name,
    source: fm.source ?? "",
    sourcePage: fm.source_page ?? "",
    path: vaultPath(filePath),
    summary: firstParagraph(markdown),
    ranks: ranks.map((row) => adolescentRankRow(cleanWiki(row["Skill or Category"]), numeric(row.Ranks)))
  };
}

function adolescentRankRow(name, ranks) {
  const cleanName = name.trim();
  if (/skill$/i.test(cleanName) && !/category/i.test(cleanName) && !/skills$/i.test(cleanName)) {
    const skillName = normalizeAdolescentSkillName(cleanName.replace(/\s+skill$/i, "").trim());
    return {
      name: cleanName,
      ranks,
      kind: "skill",
      skillName
    };
  }
  if (/skill category$/i.test(cleanName) || /category$/i.test(cleanName)) {
    return {
      name: cleanName,
      ranks,
      kind: "category",
      category: cleanName.replace(/\s+skill category$/i, "").replace(/\s+category$/i, "").trim()
    };
  }
  return {
    name: cleanName,
    ranks,
    kind: "choice"
  };
}

function normalizeAdolescentSkillName(name) {
  const aliases = {
    "Own Culture Lore": "Culture Lore",
    "Own Region Lore": "Region Lore"
  };
  return aliases[name] ?? name;
}

function parseTalents(markdown) {
  const parsed = [];
  const details = new Map(
    tableInSection(markdown, "Talent Details", "Talent").map((row) => [
      cleanWiki(row.Talent),
      {
        rulesSummary: cleanWiki(row["Rules Summary"] ?? ""),
        detailSource: row["Detail Source"] ?? ""
      }
    ])
  );
  let currentCategory = "";

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading && !["Available Fields", "Talent Details", "Mana World Notes"].includes(heading[1])) {
      currentCategory = heading[1];
      continue;
    }
    if (heading) currentCategory = "";

    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!row || row[1] === "Talent" || row[1].startsWith("---") || !currentCategory) continue;
    const name = row[1].trim();
    const detail = details.get(name) ?? {};
    const classification = classifyTalent(name, currentCategory);
    parsed.push({
      id: name,
      name,
      category: currentCategory,
      group: classification.group,
      tags: classification.tags,
      cost: row[2].trim(),
      source: row[3].trim(),
      rulesSummary: detail.rulesSummary ?? "",
      detailSource: detail.detailSource ?? ""
    });
  }

  return parsed;
}

function skillSummary(skillName, category) {
  if (skillSummaryOverrides[skillName]) return skillSummaryOverrides[skillName];

  const match = skillCategorySummaries.find(([pattern]) => pattern.test(category));
  const domain = match?.[1] ?? "the situations covered by its skill category";
  return `Used for ${domain}.`;
}

function parseSkills(markdown) {
  return tableInSection(markdown, "School Of Hard Knocks Skill Roster", "Skill").map((row) => ({
    id: row.Skill,
    name: row.Skill,
    category: row.Category,
    statPair: row["Stat Pair"] ?? "",
    statBonus: numeric(row["Stat Bonus"] ?? row.Stats ?? ""),
    stats: row["Stat Bonus"] ?? row.Stats ?? "",
    cost: row.Cost,
    summary: skillSummary(row.Skill, row.Category),
    source: row.Source
  }));
}

function parseSpellList(filePath, markdown) {
  const fm = frontmatter(markdown);
  const name = title(markdown, fileName(filePath));
  const gridRows = tableInSection(markdown, "Spell Grid", "Spell");
  const progressionRows = tableInSection(markdown, "Spell Progression", "Spell");
  const rows = gridRows.length ? gridRows : progressionRows;
  const relativeParts = path.relative(path.join(rolemasterRoot, "03 Spell Lists"), filePath).split(path.sep);
  const realm = fm.realm || relativeParts[0] || "";
  const category = relativeParts.length > 2 ? relativeParts[1] : "";
  const spells = rows.map((row) => ({
    level: row.Level ?? "",
    name: cleanWiki(row.Spell ?? ""),
    areaOfEffect: cleanWiki(row["Area of Effect"] ?? ""),
    duration: cleanWiki(row.Duration ?? ""),
    range: cleanWiki(row.Range ?? ""),
    type: cleanWiki(row.Type ?? ""),
    description: cleanWiki(row.Description ?? row.Notes ?? "")
  }));

  return {
    id: name,
    name,
    realm,
    category,
    profession: fm.profession ?? "",
    listType: fm.list_type ?? "",
    status: fm.status ?? "",
    source: fm.source ?? "",
    sourcePage: fm.source_page ?? "",
    path: vaultPath(filePath),
    summary: spellListSummary(markdown, name, realm, category, fm.list_type ?? "", spells),
    spells
  };
}

function spellListSummary(markdown, name, realm, category, listType, spells) {
  const existing = firstParagraph(markdown);
  if (existing && !/^TODO\b/i.test(existing)) return existing;

  const realSpells = spells
    .map((spell) => spell.name)
    .filter((spellName) => spellName && !/^TODO$/i.test(spellName) && spellName !== "-" && spellName !== "No spell listed");

  if (realSpells.length >= 3) {
    const sample = realSpells.slice(0, 6);
    const final = realSpells.length > sample.length ? ", and related spells" : "";
    return `${name} includes ${sample.join(", ")}${final}.`;
  }

  const typeText = listType ? listType.toLowerCase() : "spell list";
  const phrase = `${realm ? `${realm} ` : ""}${typeText}`;
  const article = /^[aeiou]/i.test(phrase) ? "an" : "a";
  return `${name} is ${article} ${phrase} ready for detailed spell import.`;
}

const talentMarkdown = fs.readFileSync(path.join(rolemasterRoot, "Talents.md"), "utf8");
const skillMarkdown = fs.readFileSync(path.join(rolemasterRoot, "Skills.md"), "utf8");

const data = {
  races: readMarkdownFiles("06 Races").map(([filePath, markdown]) => parseRace(filePath, markdown)).sort((a, b) => a.name.localeCompare(b.name)),
  professions: readMarkdownFiles("02 Professions")
    .filter(([filePath]) => !hiddenProfessionPages.has(fileName(filePath)))
    .map(([filePath, markdown]) => parseProfession(filePath, markdown))
    .sort((a, b) => a.name.localeCompare(b.name)),
  spellLists: readMarkdownFilesRecursive("03 Spell Lists")
    .filter(([filePath]) => !fileName(filePath).endsWith("Index"))
    .map(([filePath, markdown]) => parseSpellList(filePath, markdown))
    .sort((a, b) => a.realm.localeCompare(b.realm) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
  talents: parseTalents(talentMarkdown),
  cultures: readMarkdownFiles("07 Cultures")
    .map(([filePath, markdown]) => parseCulture(filePath, markdown))
    .sort((a, b) => a.name.localeCompare(b.name)),
  trainingPackages: readMarkdownFiles("04 Training Packages")
    .filter(([filePath]) => !referenceTrainingPages.has(fileName(filePath)))
    .map(([filePath, markdown]) => parseTrainingPackage(filePath, markdown))
    .sort((a, b) => a.name.localeCompare(b.name)),
  skills: parseSkills(skillMarkdown)
};

fs.writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Generated data: ${data.races.length} races, ${data.cultures.length} cultures, ${data.professions.length} professions, ${data.spellLists.length} spell lists, ${data.talents.length} talents, ${data.trainingPackages.length} training packages, ${data.skills.length} skills.`);
