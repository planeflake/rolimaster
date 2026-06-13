<script>
  import { onMount, tick } from "svelte";
  import { data } from "./lib/markdownData.js";
  import { blankCharacter, DEFAULT_CREATION_XP, DEFAULT_TALENT_POINTS, DEFAULT_TRAINING_POINTS, rankGainFor, skillTiers, STATS } from "./lib/character.js";

  const legacyStorageKey = "aethergate-character-creator";
  const libraryStorageKey = "aethergate-character-library";
  const players = [
    { id: "chris", name: "Chris" },
    { id: "sigbjorn", name: "Sigbjørn" },
    { id: "tor-arne", name: "Tor-Arne" },
    { id: "kim", name: "Kim" }
  ];
  const tabs = ["Race", "Adolescence", "Profession", "Stats", "Spells", "Talents", "Training", "Skills", "Custom Rules", "Summary"];
  const tabSymbols = {
    Adolescence: "A",
    Race: "◎",
    Profession: "⚒",
    Stats: "✦",
    Spells: "✧",
    Talents: "◆",
    Training: "▲",
    Skills: "▦",
    "Custom Rules": "⚙",
    Summary: "☰"
  };
  const SPELL_TYPES = {
    E:  { label: "E",  desc: "Elemental — Uses physical elements (heat, cold, wind, light, water, earth, sound, smell, taste, touch) to affect the environment or senses of the target. No Resistance Rolls are normally allowed." },
    BE: { label: "BE", desc: "Ball Elemental — Attacks an area with one of the physical elements (\"ball\" spells). Resolved on Attack Table 5.2 or 5.3." },
    DE: { label: "DE", desc: "Directed Elemental — Directly attacks a target with a physical element (\"bolt\" spells). Resolved on bolt attack tables 5.4–5.8." },
    F:  { label: "F",  desc: "Force — Direct manipulation of matter, energy, elements, or living beings. Caster rolls on Basic Spell Attack Table 5.1 for RR modification; target then makes an RR using Table 5.10." },
    P:  { label: "P",  desc: "Passive — Indirectly or passively affects a target. If an RR is allowed (GM's discretion) it only determines if the target is aware of the spell. Many detection spells are this type." },
    U:  { label: "U",  desc: "Utility — Only affects the caster, a willing target, or a target incapable of resistance. RRs not usually necessary; a willing target's RR is modified by −50. Most healing spells are this type." },
    I:  { label: "I",  desc: "Informational — Gathers information through means that do not require RRs." }
  };

  const SPELL_TYPE_ALIASES = {
    Elemental: "E", "Ball Elemental": "BE", "Directed Elemental": "DE",
    Force: "F", Passive: "P", Utility: "U", Informational: "I"
  };
  const directedSpellCategories = ["Fire", "Cold", "Electricity", "Water", "Mana", "Void", "Custom"];
  const summaryPanels = ["Languages", "Skills", "Directed Spells", "Custom Rules", "Inventory"];
  const inventoryTestItems = [
    { name: "Travelling Cloak", qty: 1, location: "Worn", status: "Equipped", weight: 4, value: 8, notes: "Weather-stained wool cloak." },
    { name: "Iron Dagger", qty: 1, location: "Belt", status: "Equipped", weight: 1, value: 12, notes: "Simple backup blade." },
    { name: "Rations", qty: 5, location: "Pack", status: "Carried", weight: 1, value: 0.5, notes: "One day each." },
    { name: "Quartz Mana Shard", qty: 2, location: "Pouch", status: "Carried", weight: 0.1, value: 15, notes: "Low-grade mana storage crystal." }
  ];

  function resolveSpellType(raw) {
    if (!raw || raw === "-") return null;
    const key = SPELL_TYPE_ALIASES[raw] ?? raw.toUpperCase();
    return SPELL_TYPES[key] ?? null;
  }

  const raceImages = {
    Dwarves: "/race-images/dwarves.png",
    Gnomes: "/race-images/gnomes.png",
    Halflings: "/race-images/halflings.png"
  };
  const customRuleTemplates = [
    {
      id: "runeskin",
      name: "Runeskin",
      player: "Chris",
      summary: "Skin crystallizes in response to magical exposure, growing extractable gems that can store mana, spells, runes, or souls.",
      description:
        "Patches of your skin slowly turn into crystal when exposed to magical energy. The type of crystal depends on the realm, intensity, element, and emotional or spiritual quality of the energy touching the skin. Low, ambient exposure usually grows common stones over days or weeks. Concentrated spellcasting, Font resonance, rituals, wounds from magical attacks, or long contact with enchanted places can grow rarer crystals more quickly. Once fully formed, these crystals can be extracted. Extracted crystals may be sold, socketed into items, used as mana vessels, prepared as spell anchors, carved into runes, or, in rare cases, used to contain a soul-fragment or full soul.",
      crystals: [
        { name: "Quartz", type: "Common", exposure: "Low ambient mana, simple cantrips, minor Essence leakage, safe proximity to weak enchanted items.", capacity: "1 minor mana charge", use: "Basic mana storage, simple runes", value: "Low", notes: "Stable and easy to extract." },
        { name: "Bloodstone", type: "Common", exposure: "Body magic, healing attempts, blood loss during spell exposure, endurance magic, low-intensity life force surges.", capacity: "1 healing or vitality charge", use: "Body magic, endurance, blood rites", value: "Low-Mid", notes: "May leave bruising or fatigue after extraction." },
        { name: "Amethyst", type: "Common", exposure: "Mentalism, dreams, fear, calm, memory magic, psychic pressure, or long exposure to mind-affecting auras.", capacity: "1 mentalism charge", use: "Dreams, calm, memory, focus", value: "Mid", notes: "Good for Mentalism-aligned effects." },
        { name: "Garnet", type: "Uncommon", exposure: "Moderate heat, fire, battle magic, courage magic, anger, passion, or repeated exposure to hostile combat spells.", capacity: "2 mana charges", use: "Fire, courage, passion, battle runes", value: "Mid", notes: "Can crack if overloaded." },
        { name: "Moonstone", type: "Uncommon", exposure: "Illusion magic, moonlit rituals, perception effects, glamour, shadowed Essence, or magic cast under lunar influence.", capacity: "2 essence or illusion charges", use: "Illusions, perception, lunar rites", value: "Mid-High", notes: "Stronger under moonlight." },
        { name: "Jade", type: "Uncommon", exposure: "Channeling, healing rites, nature magic, protective blessings, spirit balance, or prolonged contact with sanctified life magic.", capacity: "2 channeling or life charges", use: "Healing, protection, spirit balance", value: "High", notes: "Often valued by temples." },
        { name: "Sapphire", type: "Rare", exposure: "High clarity Essence, cold magic, wards, spell-memory effects, disciplined study under strong magical fields.", capacity: "3 mana charges or 1 stored spell", use: "Cold, clarity, wards, spell memory", value: "High", notes: "Excellent spell vessel." },
        { name: "Ruby", type: "Rare", exposure: "High-intensity fire, force, rage, blood magic, violent spell impacts, or magical trauma in combat.", capacity: "3 mana charges or 1 combat spell", use: "Fire, blood, force, rage", value: "High", notes: "Volatile if used for hostile magic." },
        { name: "Emerald", type: "Rare", exposure: "Strong nature, growth, poison, beast, healing, or living-pattern magic, especially in verdant or corrupted places.", capacity: "3 life/nature charges", use: "Growth, healing, poison, beasts", value: "High", notes: "Can store living-pattern magic." },
        { name: "Opal", type: "Magical", exposure: "Mixed-realm exposure, unstable Font weather, overlapping Essence, Mentalism, and Channeling currents.", capacity: "4 mixed mana charges", use: "Multi-realm magic, unstable runes", value: "Very High", notes: "Can shift realm affinity after extraction." },
        { name: "Aetherglass", type: "Magical", exposure: "Dense Essence, portal magic, direct Font resonance, Aethergate infrastructure discharge, or mana-line contact.", capacity: "5 essence charges or 2 stored spells", use: "Essence, portals, Font resonance", value: "Very High", notes: "Transparent crystal with inner sparks." },
        { name: "Soul Onyx", type: "Magical", exposure: "Necromancy, soul-binding, oath magic, death curses, possession, or contact with trapped spirits.", capacity: "1 soul-fragment", use: "Necromancy, memory, binding, oaths", value: "Forbidden", notes: "Illegal or cursed in many places." },
        { name: "Star Diamond", type: "Legendary", exposure: "Extreme ritual saturation, direct Font contact, Arcane convergence, world-scale magic, or the death of a soul-bearing power nearby.", capacity: "10 mana charges, 3 stored spells, or 1 soul", use: "Great rituals, arch-runes, soul vessel", value: "Priceless", notes: "Extraction may permanently scar or mark the bearer." }
      ]
    },
    {
      id: "you-no-take-candle",
      name: "You no take candle",
      player: "Any",
      summary: "A candle, lantern, or small flame becomes personally significant and supernaturally hard to lose.",
      description:
        "You carry a candle, lantern, or similar small flame that is bound to your luck, courage, or sense of safety. Others may mock it, covet it, or try to take it, but while it remains yours it serves as a focus for stubborn survival and suspicious awareness.",
      effects: [
        "While carrying your candle or flame, gain a minor bonus to notice theft, ambushes, and hidden movement near you.",
        "If someone takes, extinguishes, or defiles it, you gain a short burst of determination toward recovering it.",
        "If you willingly give it away, choose whether the bond transfers, ends, or becomes a story hook."
      ]
    }
  ];

  let activeTab = "Race";
  let lastEditorTab = "Race";
  let raceSearch = "";
  let cultureSearch = "";
  let professionSearch = "";
  let spellSearch = "";
  let selectedSpellGroups = new Set();
  let activeSpellListId = "";
  let activeCustomRuleId = "";
  let activeSummaryPanel = "Skills";
  let summaryCarousel = null;
  let activeSummaryPanelIndex = 0;
  let previousSummaryPanel = "";
  let nextSummaryPanel = "";
  let sharedSaveEnabled = false;
  let sharedLibraryLoaded = false;
  let sharedSaveTimer = null;
  let lastSharedPayload = "";
  let saveStatus = "Local";
  let talentSearch = "";
  let selectedTalentGroups = new Set();
  let selectedTalentCategories = new Set();
  let packageSearch = "";
  let selectedPackageGroups = new Set();
  let skillSearch = "";
  let skillSortMode = "abc";
  let selectedSkillGroups = new Set();
  let sidebarCollapsed = false;
  let raceModal = null;
  let professionModal = null;
  let professionInspector = null;

  let library = loadLibrary();
  let activeUserId = library.selectedUserId;
  let activeCharacterId = charactersFor(activeUserId).some((item) => item.id === library.selectedCharacterId) ? library.selectedCharacterId : "";
  let currentView = activeUserId && activeCharacterId ? "editor" : activeUserId ? "characters" : "users";
  let character = activeCharacter() ?? blankCharacter();

  $: selectedUser = players.find((player) => player.id === activeUserId);
  $: activeCharacters = charactersFor(activeUserId);

  $: selectedRace = data.races.find((race) => race.id === character.raceId);
  $: selectedCulture = data.cultures?.find((culture) => culture.id === character.cultureId);
  $: selectedProfession = data.professions.find((profession) => profession.id === character.professionId);
  $: availableSpellLists = spellOptionsForProfession(selectedProfession);
  $: selectedSpellLists = data.spellLists.filter((spellList) => character.spellListIds.includes(spellList.id));
  $: selectedTalents = data.talents.filter((talent) => character.talentIds.includes(talent.id));
  $: selectedPackages = data.trainingPackages.filter((trainingPackage) => character.trainingPackageIds.includes(trainingPackage.id));
  $: totalTalentCost = selectedTalents.reduce((sum, talent) => sum + firstNumber(talent.cost), 0);
  $: totalPackageCost = selectedPackages.reduce((sum, trainingPackage) => sum + packageCost(trainingPackage, selectedProfession), 0);
  $: remainingTalentPoints = Number(character.talentPool || 0) - totalTalentCost;
  $: remainingTrainingPoints = Number(character.trainingPool || 0) - totalPackageCost;
  $: remainingXp = Math.max(0, Number(character.xp || 0) - Number(character.spentXp || 0));
  $: packageRanks = selectedPackages.flatMap((trainingPackage) => trainingPackage.ranks.filter((rank) => rank.ranks > 0));
  $: knownSkills = skillOptions();
  $: spellGroups = [...new Set(availableSpellLists.map((spellList) => spellList.group).filter(Boolean))];
  $: talentGroups = [...new Set(data.talents.map((talent) => talent.group).filter(Boolean))];
  $: talentCategories = [...new Set(data.talents.map((talent) => talent.category).filter(Boolean))];
  $: trainingPackageGroups = [...new Set(data.trainingPackages.map((trainingPackage) => trainingPackage.group).filter(Boolean))];
  $: skillGroups = [...new Set(knownSkills.map((skill) => skill.category).filter(Boolean))];
  $: filteredRaces = filterBy(data.races, raceSearch, ["name", "summary", "source"]);
  $: filteredCultures = filterBy(data.cultures ?? [], cultureSearch, ["name", "summary", "source"]);
  $: filteredProfessions = filterBy(data.professions, professionSearch, ["name", "realm", "secondaryRealm", "summary"]);
  $: filteredSpellLists = filterSpellLists(availableSpellLists, selectedSpellGroups, spellSearch);
  $: filteredTalents = filterTalents(data.talents, selectedTalentGroups, selectedTalentCategories, talentSearch);
  $: filteredPackages = filterTrainingPackages(data.trainingPackages, selectedPackageGroups, packageSearch);
  $: filteredSkills = filterSkills(knownSkills, selectedSkillGroups, skillSearch, skillSortMode);
  $: selectedCustomRules = customRuleTemplates.filter((template) => character.customRuleIds?.includes(template.id));
  $: totalStatPoints = STATS.reduce((sum, stat) => sum + Number(character.statPoints?.[stat.id] ?? 0), 0);
  $: remainingStatPoints = Number(character.statPool ?? 550) - totalStatPoints;
  $: totalSpellsSpent = (character.spellListIds ?? []).reduce((sum, listId) => sum + Number(character.spellRanks?.[listId] ?? 0), 0);
  $: remainingSpellPool = Number(character.spellPool ?? 0) - totalSpellsSpent;
  $: inventoryWeight = inventoryTotal("weight");
  $: inventoryValue = inventoryTotal("value");
  $: primeStatSet = new Set(STATS.filter(s => (selectedProfession?.primeStats ?? "").includes(s.name)).map(s => s.id));
  $: primeStats = STATS.filter((stat) => primeStatSet.has(stat.id));

  const REALM_STAT = { Essence: "IN", Channeling: "EM", Mentalism: "ME", Arcane: "IN", Psionic: "ME" };
  $: ppRealms = [selectedProfession?.realm, selectedProfession?.secondaryRealm]
    .filter(r => r && REALM_STAT[r])
    .filter((r, i, a) => a.indexOf(r) === i);
  $: xpTotal = Math.max(0, Number(character.xp || 0));
  $: xpLevel = Math.floor(xpTotal / 100);
  $: xpProgress = xpTotal % 100;
  $: xpProgressPercent = `${xpProgress}%`;
  $: activeSummaryPanelIndex = summaryPanelIndex(activeSummaryPanel);
  $: previousSummaryPanel = summaryPanels[activeSummaryPanelIndex - 1] ?? "";
  $: nextSummaryPanel = summaryPanels[activeSummaryPanelIndex + 1] ?? "";
  $: if (selectedSpellLists.length > 0 && !selectedSpellLists.find(s => s.id === activeSpellListId)) activeSpellListId = selectedSpellLists[0].id;
  $: if (activeTab !== "Summary") lastEditorTab = activeTab;
  $: skillsOverspent = Number(character.spentXp || 0) > Number(character.xp || 0);
  $: tabStates = {
    Race: character.raceId ? "done" : "todo",
    Adolescence: character.cultureId ? "done" : "todo",
    Profession: character.professionId ? "done" : "todo",
    Stats: remainingStatPoints < 0 ? "warn" : totalStatPoints > 0 && remainingStatPoints === 0 ? "done" : totalStatPoints > 0 ? "progress" : "todo",
    Spells: remainingSpellPool < 0 ? "warn" : totalSpellsSpent > 0 ? "done" : selectedSpellLists.length > 0 ? "progress" : "todo",
    Talents: remainingTalentPoints < 0 ? "warn" : selectedTalents.length > 0 ? "done" : "todo",
    Training: remainingTrainingPoints < 0 ? "warn" : selectedPackages.length > 0 ? "done" : "todo",
    Skills: skillsOverspent ? "warn" : Number(character.spentXp || 0) > 0 ? "done" : "todo",
    "Custom Rules": (character.customRuleIds?.length ?? 0) > 0 ? "done" : "todo",
    Summary: "todo"
  };
  $: tabBadges = {
    Stats: budgetBadge(totalStatPoints, remainingStatPoints),
    Spells: budgetBadge(totalSpellsSpent, remainingSpellPool),
    Talents: budgetBadge(totalTalentCost, remainingTalentPoints),
    Training: budgetBadge(totalPackageCost, remainingTrainingPoints),
    Skills: skillsOverspent ? String(Number(character.xp || 0) - Number(character.spentXp || 0)) : budgetBadge(Number(character.spentXp || 0), remainingXp)
  };
  $: if (selectedCustomRules.length > 0 && !selectedCustomRules.find(rule => rule.id === activeCustomRuleId)) activeCustomRuleId = selectedCustomRules[0].id;
  $: syncOpenCharacter(character);
  $: browserSaveLibrary(library);
  $: queueSharedSave(library);

  onMount(() => {
    loadSharedLibrary();
  });

  function makeEmptyLibrary() {
    return {
      version: 1,
      selectedUserId: "",
      selectedCharacterId: "",
      users: Object.fromEntries(players.map((player) => [player.id, { ...player, characters: [] }]))
    };
  }

  function normalizeCharacter(value, ownerId = "") {
    const normalized = {
      ...blankCharacter(),
      ...value,
      id: value?.id ?? createId("char"),
      ownerId: value?.ownerId ?? ownerId,
      createdAt: value?.createdAt ?? new Date().toISOString(),
      updatedAt: value?.updatedAt ?? new Date().toISOString()
    };
    return {
      ...normalized,
      xp: creationBudget(normalized.xp, DEFAULT_CREATION_XP),
      spellPool: creationBudget(normalized.spellPool, DEFAULT_CREATION_XP),
      talentPool: creationBudget(normalized.talentPool, DEFAULT_TALENT_POINTS),
      trainingPool: creationBudget(normalized.trainingPool, DEFAULT_TRAINING_POINTS),
      skillRanks: normalized.skillRanks && typeof normalized.skillRanks === "object" ? normalized.skillRanks : {},
      spellRanks: normalized.spellRanks && typeof normalized.spellRanks === "object" ? normalized.spellRanks : {},
      directedSpells: normalized.directedSpells && typeof normalized.directedSpells === "object" ? normalized.directedSpells : {},
      inventory: Array.isArray(normalized.inventory) ? normalized.inventory : []
    };
  }

  function normalizeLibrary(value) {
    const base = makeEmptyLibrary();
    const users = { ...base.users };
    for (const player of players) {
      const existing = value?.users?.[player.id];
      users[player.id] = {
        ...player,
        characters: (existing?.characters ?? []).map((item) => normalizeCharacter(item, player.id))
      };
    }

    return {
      ...base,
      ...value,
      users,
      selectedUserId: players.some((player) => player.id === value?.selectedUserId) ? value.selectedUserId : "",
      selectedCharacterId: value?.selectedCharacterId ?? ""
    };
  }

  function loadLibrary() {
    try {
      const stored = localStorage.getItem(libraryStorageKey);
      if (stored) return normalizeLibrary(JSON.parse(stored));

      const legacy = localStorage.getItem(legacyStorageKey);
      if (legacy) {
        const migrated = normalizeCharacter(JSON.parse(legacy), "chris");
        migrated.name = migrated.name || "Imported Character";
        const next = makeEmptyLibrary();
        next.users.chris.characters = [migrated];
        return next;
      }

      return makeEmptyLibrary();
    } catch {
      return makeEmptyLibrary();
    }
  }

  function browserSaveLibrary(value) {
    localStorage.setItem(libraryStorageKey, JSON.stringify(value));
  }

  function creationBudget(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function sharedLibraryPayload(value) {
    return {
      version: value.version ?? 1,
      users: value.users ?? makeEmptyLibrary().users
    };
  }

  async function loadSharedLibrary() {
    try {
      const response = await fetch("/api/library", { cache: "no-store" });
      if (!response.ok) throw new Error("Shared library unavailable");
      const shared = await response.json();
      const selectedUserId = activeUserId;
      const selectedCharacterId = activeCharacterId;
      library = normalizeLibrary({ ...shared, selectedUserId, selectedCharacterId });
      activeUserId = players.some((player) => player.id === selectedUserId) ? selectedUserId : "";
      activeCharacterId = charactersFor(activeUserId).some((item) => item.id === selectedCharacterId) ? selectedCharacterId : "";
      currentView = activeUserId && activeCharacterId ? "editor" : activeUserId ? "characters" : "users";
      character = activeCharacter() ?? blankCharacter();
      lastSharedPayload = JSON.stringify(sharedLibraryPayload(library));
      sharedSaveEnabled = true;
      sharedLibraryLoaded = true;
      saveStatus = "Shared";
    } catch {
      sharedSaveEnabled = false;
      sharedLibraryLoaded = false;
      saveStatus = "Local";
    }
  }

  function queueSharedSave(value) {
    if (!sharedSaveEnabled || !sharedLibraryLoaded) return;
    const payload = JSON.stringify(sharedLibraryPayload(value));
    if (payload === lastSharedPayload) return;
    clearTimeout(sharedSaveTimer);
    sharedSaveTimer = setTimeout(() => saveSharedLibrary(payload), 600);
  }

  async function saveSharedLibrary(payload) {
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });
      if (!response.ok) throw new Error("Shared save failed");
      lastSharedPayload = payload;
      saveStatus = "Shared";
    } catch {
      saveStatus = "Local";
    }
  }

  function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function charactersFor(userId) {
    return library.users?.[userId]?.characters ?? [];
  }

  function activeCharacter() {
    return charactersFor(activeUserId).find((item) => item.id === activeCharacterId);
  }

  function selectUser(userId) {
    activeUserId = userId;
    activeCharacterId = "";
    currentView = "characters";
    library = { ...library, selectedUserId: userId, selectedCharacterId: "" };
  }

  function backToUsers() {
    activeUserId = "";
    activeCharacterId = "";
    currentView = "users";
    character = blankCharacter();
    library = { ...library, selectedUserId: "", selectedCharacterId: "" };
  }

  function backToCharacters() {
    activeCharacterId = "";
    currentView = "characters";
    character = blankCharacter();
    library = { ...library, selectedCharacterId: "" };
  }

  function openCharacter(characterId) {
    activeCharacterId = characterId;
    character = activeCharacter() ?? blankCharacter();
    activeTab = "Race";
    currentView = "editor";
    library = { ...library, selectedUserId: activeUserId, selectedCharacterId: characterId };
  }

  function createCharacter() {
    const now = new Date().toISOString();
    const nextCharacter = normalizeCharacter({ id: createId("char"), ownerId: activeUserId, createdAt: now, updatedAt: now }, activeUserId);
    const user = library.users[activeUserId];
    library = {
      ...library,
      selectedUserId: activeUserId,
      selectedCharacterId: nextCharacter.id,
      users: {
        ...library.users,
        [activeUserId]: {
          ...user,
          characters: [...user.characters, nextCharacter]
        }
      }
    };
    activeCharacterId = nextCharacter.id;
    character = nextCharacter;
    activeTab = "Race";
    currentView = "editor";
  }

  function duplicateCharacter(characterId) {
    const source = charactersFor(activeUserId).find((item) => item.id === characterId);
    if (!source) return;
    const now = new Date().toISOString();
    const copy = normalizeCharacter(
      { ...source, id: createId("char"), name: `${source.name || "Unnamed"} Copy`, ownerId: activeUserId, createdAt: now, updatedAt: now },
      activeUserId
    );
    const user = library.users[activeUserId];
    library = {
      ...library,
      users: {
        ...library.users,
        [activeUserId]: { ...user, characters: [...user.characters, copy] }
      }
    };
  }

  function deleteCharacter(characterId) {
    const source = charactersFor(activeUserId).find((item) => item.id === characterId);
    const label = source?.name || "this character";
    if (!confirm(`Delete ${label}?`)) return;
    const user = library.users[activeUserId];
    library = {
      ...library,
      selectedCharacterId: activeCharacterId === characterId ? "" : library.selectedCharacterId,
      users: {
        ...library.users,
        [activeUserId]: { ...user, characters: user.characters.filter((item) => item.id !== characterId) }
      }
    };
    if (activeCharacterId === characterId) backToCharacters();
  }

  function syncOpenCharacter(value) {
    if (currentView !== "editor" || !activeUserId || !activeCharacterId) return;
    const user = library.users[activeUserId];
    if (!user) return;
    const saved = { ...normalizeCharacter(value, activeUserId), id: activeCharacterId, ownerId: activeUserId, updatedAt: new Date().toISOString() };
    library = {
      ...library,
      users: {
        ...library.users,
        [activeUserId]: {
          ...user,
          characters: user.characters.map((item) => (item.id === activeCharacterId ? saved : item))
        }
      }
    };
  }

  function characterLabel(item) {
    return item.name || "Unnamed Character";
  }

  function characterSubtitle(item) {
    const race = data.races.find((entry) => entry.id === item.raceId)?.name;
    const profession = data.professions.find((entry) => entry.id === item.professionId)?.name;
    return [race, profession].filter(Boolean).join(" / ") || "No race or profession yet";
  }

  function lastEdited(value) {
    if (!value) return "Not edited yet";
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function firstNumber(value) {
    return Number(String(value).match(/\d+/)?.[0] ?? 0);
  }

  function budgetBadge(spent, remaining) {
    if (remaining < 0) return String(remaining);
    if (spent > 0 && remaining > 0) return String(remaining);
    return "";
  }

  function filterBy(items, query, fields) {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => fields.some((field) => String(item[field] ?? "").toLowerCase().includes(needle)));
  }

  function filterTrainingPackages(items, selectedGroups, query) {
    const grouped = selectedGroups.size === 0 ? items : items.filter((trainingPackage) => selectedGroups.has(trainingPackage.group));
    return filterBy(grouped, query, ["name", "type", "group", "summary", "tags"]);
  }

  function filterSkills(items, selectedGroups, query, sortMode = "abc") {
    const grouped = selectedGroups.size === 0 ? items : items.filter((skill) => selectedGroups.has(skill.category));
    return [...filterBy(grouped, query, ["name", "category"])].sort((a, b) => {
      if (sortMode === "cat") {
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }

  function toggleSkillGroup(group) {
    const next = new Set(selectedSkillGroups);
    next.has(group) ? next.delete(group) : next.add(group);
    selectedSkillGroups = next;
  }

  function spellOptionsForProfession(profession) {
    if (!profession?.chooseSpellGroups?.length) {
      return data.spellLists.map((spellList) => ({ ...spellList, group: spellList.realm || "Spell Lists" }));
    }

    const options = [];
    const seen = new Set();
    for (const group of profession.chooseSpellGroups) {
      for (const choice of group.lists) {
        const spellList = data.spellLists.find((candidate) => candidate.id === choice.id);
        if (!spellList || seen.has(spellList.id)) continue;
        seen.add(spellList.id);
        options.push({ ...spellList, group: group.name });
      }
    }
    return options;
  }

  function filterSpellLists(items, selectedGroups, query) {
    const grouped = selectedGroups.size === 0 ? items : items.filter((spellList) => selectedGroups.has(spellList.group));
    return filterBy(grouped, query, ["name", "realm", "category", "listType", "summary"]);
  }

  function toggleSpellGroup(group) {
    const next = new Set(selectedSpellGroups);
    next.has(group) ? next.delete(group) : next.add(group);
    selectedSpellGroups = next;
  }

  function togglePackageGroup(group) {
    const next = new Set(selectedPackageGroups);
    next.has(group) ? next.delete(group) : next.add(group);
    selectedPackageGroups = next;
  }

  function filterTalents(items, selectedGroups, selectedCategories, query) {
    const grouped = selectedGroups.size === 0 ? items : items.filter((talent) => selectedGroups.has(talent.group));
    const categorized = selectedCategories.size === 0 ? grouped : grouped.filter((talent) => selectedCategories.has(talent.category));
    return filterBy(categorized, query, ["name", "category", "group", "tags", "rulesSummary"]);
  }

  function toggleTalentCategory(category) {
    const next = new Set(selectedTalentCategories);
    next.has(category) ? next.delete(category) : next.add(category);
    selectedTalentCategories = next;
  }

  function clearTalentFilters() {
    selectedTalentGroups = new Set();
    selectedTalentCategories = new Set();
  }

  function toggleTalentGroup(group) {
    const next = new Set(selectedTalentGroups);
    next.has(group) ? next.delete(group) : next.add(group);
    selectedTalentGroups = next;
  }

  function raceStats(race) {
    return Object.entries(race?.stats ?? {}).filter(([stat]) => stat !== "AP");
  }

  function raceImage(race) {
    return raceImages[race?.name] ?? "";
  }

  function selectRace(id) {
    character = { ...character, raceId: id };
    raceModal = data.races.find((race) => race.id === id) ?? null;
  }

  function selectCulture(id) {
    character = { ...character, cultureId: id };
  }

  function closeRaceModal() {
    raceModal = null;
  }

  function selectProfession(id) {
    const nextProfession = data.professions.find((profession) => profession.id === id) ?? null;
    if (id === character.professionId) {
      professionModal = nextProfession;
      professionInspector = null;
      return;
    }
    const listCount = character.spellListIds.length;
    const rankCount = (character.spellListIds ?? []).reduce((sum, listId) => sum + Number(character.spellRanks?.[listId] ?? 0), 0);
    if (listCount > 0) {
      const parts = [`${listCount} spell list${listCount === 1 ? "" : "s"}`];
      if (rankCount > 0) parts.push(`${rankCount} spell rank${rankCount === 1 ? "" : "s"}`);
      if (!confirm(`Switching to ${nextProfession?.name ?? "this profession"} removes ${parts.join(" and ")}. Continue?`)) return;
    }
    character = { ...character, professionId: id, spellListIds: [], spellRanks: {} };
    professionModal = nextProfession;
    professionInspector = null;
  }

  function closeProfessionModal() {
    professionModal = null;
    professionInspector = null;
  }

  function skillCategoryKey(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/\s+group\b/g, "")
      .replace(/\s+-\s+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9/-]/g, "");
  }

  function skillsForProfessionCategory(category) {
    const key = skillCategoryKey(category);
    return data.skills.filter((skill) => {
      const candidate = skillCategoryKey(skill.category);
      return candidate === key || candidate.startsWith(`${key}-`);
    });
  }

  function inspectProfessionSkillCategory(category, value = "", valueLabel = "Cost") {
    const skills = skillsForProfessionCategory(category);
    const detail = value ? `${valueLabel} ${value}` : "";
    professionInspector = {
      type: "skillCategory",
      id: category,
      title: category,
      subtitle: ["Skill category", detail].filter(Boolean).join(" · "),
      value,
      valueLabel,
      skills
    };
  }

  function inspectProfessionSpellList(id, groupName) {
    const spellList = data.spellLists.find((candidate) => candidate.id === id);
    if (!spellList) return;
    professionInspector = {
      type: "spellList",
      id,
      groupName,
      title: spellList.name,
      subtitle: [spellList.realm, spellList.category || spellList.listType, groupName].filter(Boolean).join(" · "),
      spellList
    };
  }

  function toggleSpellList(id) {
    const adding = !character.spellListIds.includes(id);
    if (!adding) {
      const ranks = Number(character.spellRanks?.[id] ?? 0);
      if (ranks > 0) {
        const list = data.spellLists.find((item) => item.id === id);
        const label = list?.name ?? "this list";
        if (!confirm(`Remove ${label}? This refunds ${ranks} spell rank${ranks === 1 ? "" : "s"} to your pool.`)) return;
      }
      const nextRanks = { ...character.spellRanks };
      delete nextRanks[id];
      character = { ...character, spellListIds: toggle(character.spellListIds, id), spellRanks: nextRanks };
      return;
    }
    character = { ...character, spellListIds: toggle(character.spellListIds, id) };
    activeSpellListId = id;
  }

  function buySpell(listId, maxRanks) {
    const current = Number(character.spellRanks?.[listId] ?? 0);
    if (remainingSpellPool < 1 || current >= maxRanks) return;
    character = { ...character, spellRanks: { ...character.spellRanks, [listId]: current + 1 } };
  }

  function refundSpell(listId) {
    const current = Number(character.spellRanks?.[listId] ?? 0);
    if (current < 1) return;
    character = { ...character, spellRanks: { ...character.spellRanks, [listId]: current - 1 } };
  }

  function toggleTalent(id) {
    const talent = data.talents.find((item) => item.id === id);
    const adding = !character.talentIds.includes(id);
    if (adding && firstNumber(talent?.cost) > remainingTalentPoints) return;
    character = { ...character, talentIds: toggle(character.talentIds, id) };
  }

  function togglePackage(id) {
    const trainingPackage = data.trainingPackages.find((item) => item.id === id);
    const adding = !character.trainingPackageIds.includes(id);
    if (adding && packageCost(trainingPackage, selectedProfession) > remainingTrainingPoints) return;
    character = { ...character, trainingPackageIds: toggle(character.trainingPackageIds, id) };
  }

  function toggle(list, id) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  function packageCost(trainingPackage, profession) {
    if (!trainingPackage || !profession) return 0;
    return trainingPackage.costs[profession.name] ?? 0;
  }

  function skillOptions() {
    const packageSkillNames = packageRanks.map((rank) => ({ name: rank.name, category: "Training package" }));
    const everyman = selectedProfession?.everymanSkills.map((name) => ({ name, category: "Everyman" })) ?? [];
    const adolescent = adolescentDirectRanks().map((rank) => {
      const existing = data.skills.find((skill) => skill.name === rank.skillName);
      return existing ?? { name: rank.skillName, category: "Adolescence" };
    });
    const merged = [...data.skills, ...packageSkillNames, ...everyman, ...adolescent].filter((skill) => skill.name);
    const seen = new Map();
    for (const skill of merged) {
      if (!seen.has(skill.name)) seen.set(skill.name, skill);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function professionSkillTier(skill) {
    const categoryKey = skillCategoryKey(skill?.category);
    const match = selectedProfession?.skillTraining?.find((entry) => {
      const trainingKey = skillCategoryKey(entry.category);
      return categoryKey === trainingKey || categoryKey.startsWith(`${trainingKey}-`);
    });
    return match?.tier ?? "normal";
  }

  function skillTierLabel(tierId) {
    return skillTiers.find((tier) => tier.id === tierId)?.label ?? "Normal";
  }

  function skillByName(skillName) {
    return knownSkills.find((skill) => skill.name === skillName) ?? { name: skillName, category: "" };
  }

  function cultureDirectRanks(culture) {
    return culture?.ranks?.filter((rank) => rank.kind === "skill" && rank.ranks > 0) ?? [];
  }

  function cultureOpenRanks(culture) {
    return culture?.ranks?.filter((rank) => rank.kind !== "skill" && rank.ranks > 0) ?? [];
  }

  function cultureTotalRanks(culture) {
    return culture?.ranks?.reduce((sum, rank) => sum + Number(rank.ranks || 0), 0) ?? 0;
  }

  function cultureRanksMatching(culture, pattern) {
    return culture?.ranks
      ?.filter((rank) => pattern.test(rank.name))
      .reduce((sum, rank) => sum + Number(rank.ranks || 0), 0) ?? 0;
  }

  function cultureRankPreview(culture) {
    const direct = cultureDirectRanks(culture).slice(0, 6).map((rank) => `${rank.skillName} +${rank.ranks}`);
    return direct.length ? direct.join(", ") : "No direct skill rows";
  }

  function adolescentDirectRanks() {
    return cultureDirectRanks(selectedCulture);
  }

  function adolescentOpenRanks() {
    return cultureOpenRanks(selectedCulture);
  }

  function adolescentSkillRanks(skillName) {
    return adolescentDirectRanks()
      .filter((rank) => rank.skillName === skillName)
      .reduce((sum, rank) => sum + Number(rank.ranks || 0), 0);
  }

  function xpSkillRanks(skillName) {
    return Number(character.skillRanks?.[skillName] ?? 0);
  }

  function totalSkillRanks(skillName) {
    return xpSkillRanks(skillName) + adolescentSkillRanks(skillName);
  }

  function skillRankBreakdown(skillName) {
    const xpRanks = xpSkillRanks(skillName);
    const adolescenceRanks = adolescentSkillRanks(skillName);
    if (!adolescenceRanks) return `${xpRanks} XP ranks`;
    return `${totalSkillRanks(skillName)} total: ${xpRanks} XP + ${adolescenceRanks} adolescence`;
  }

  function summarySkillEntries() {
    const names = new Set([
      ...Object.entries(character.skillRanks).filter(([, ranks]) => Number(ranks) > 0).map(([name]) => name),
      ...adolescentDirectRanks().map((rank) => rank.skillName)
    ]);
    return [...names]
      .map((name) => [name, totalSkillRanks(name)])
      .filter(([, ranks]) => ranks > 0)
      .sort(([a], [b]) => {
        const ca = skillByName(a)?.category ?? "";
        const cb = skillByName(b)?.category ?? "";
        return ca.localeCompare(cb) || a.localeCompare(b);
      });
  }

  function startsNewSkillCategory(index) {
    if (skillSortMode !== "cat" || index === 0) return false;
    return filteredSkills[index - 1]?.category !== filteredSkills[index]?.category;
  }

  function spendXpOnSkill(skillName) {
    if (!skillName || remainingXp < 1) return;
    const tier = professionSkillTier(skillByName(skillName));
    const gain = rankGainFor(tier);
    const currentRanks = Number(character.skillRanks?.[skillName] ?? 0);
    const nextRanks = {
      ...(character.skillRanks ?? {}),
      [skillName]: currentRanks + gain
    };
    character = {
      ...character,
      spentXp: Number(character.spentXp || 0) + 1,
      skillRanks: nextRanks
    };
  }

  function refundXpOnSkill(skillName) {
    const currentRanks = Number(character.skillRanks?.[skillName] ?? 0);
    const currentSpentXp = Number(character.spentXp || 0);
    if (currentRanks < 1 || currentSpentXp < 1) return;
    const tier = professionSkillTier(skillByName(skillName));
    const gain = rankGainFor(tier);
    const nextRanks = {
      ...(character.skillRanks ?? {}),
      [skillName]: Math.max(0, currentRanks - gain)
    };
    if (nextRanks[skillName] === 0) delete nextRanks[skillName];
    character = {
      ...character,
      spentXp: currentSpentXp - 1,
      skillRanks: nextRanks
    };
  }

  function nextTab() {
    const idx = tabs.indexOf(activeTab);
    if (idx < tabs.length - 1) activeTab = tabs[idx + 1];
  }

  function prevTab() {
    const idx = tabs.indexOf(activeTab);
    if (idx > 0) activeTab = tabs[idx - 1];
  }

  function jumpToTab(tab) {
    if (tabs.includes(tab)) activeTab = tab;
  }

  function skillLevel(skillName) {
    if (selectedProfession?.everymanSkills?.includes(skillName)) return "Everyman";
    if (selectedProfession?.occupationalSkills?.includes(skillName)) return "Occupational";
    return "Normal";
  }

  function selectedSpellRows() {
    return selectedSpellLists.flatMap((spellList) =>
      knownSpellsForList(spellList)
        .map((spell) => ({ ...spell, listName: spellList.name }))
    );
  }

  function knownSpellsForList(spellList) {
    const count = Number(character.spellRanks?.[spellList.id] ?? 0);
    return spellList.spells
      .filter((spell) => spell.name && spell.name !== "No spell listed")
      .slice(0, count);
  }

  function spellListNames(group) {
    return group.lists.map((list) => list.name).join(", ");
  }

  function setStatPoint(statId, value) {
    const n = Math.max(0, Math.min(100, Number(value) || 0));
    character = { ...character, statPoints: { ...character.statPoints, [statId]: n } };
  }

  function setPPRanks(realm, value) {
    const key = realm.toLowerCase();
    const n = Math.max(0, parseInt(value) || 0);
    character = { ...character, ppRanks: { ...(character.ppRanks ?? {}), [key]: n } };
  }

  function ppForRealm(realm) {
    const statId = REALM_STAT[realm] ?? "IN";
    const ranks = Number(character.ppRanks?.[realm.toLowerCase()] ?? 0);
    const statBonus = basicStatBonus(finalStat(statId));
    return { ranks, statBonus, total: Math.max(0, ranks + statBonus), statId };
  }

  function toggleCustomRule(id) {
    const adding = !(character.customRuleIds ?? []).includes(id);
    character = { ...character, customRuleIds: toggle(character.customRuleIds ?? [], id) };
    if (adding) activeCustomRuleId = id;
  }

  function parseStatMod(value) {
    return parseInt(value) || 0;
  }

  function finalStat(statId) {
    const base = Number(character.statPoints?.[statId] ?? 0);
    const mod = parseStatMod(selectedRace?.stats?.[statId] ?? "0");
    return base + mod;
  }

  function basicStatBonus(score) {
    const stat = Number(score) || 0;
    if (stat >= 102) return 14;
    if (stat === 101) return 12;
    if (stat === 100) return 10;
    if (stat >= 98) return 9;
    if (stat >= 96) return 8;
    if (stat >= 94) return 7;
    if (stat >= 92) return 6;
    if (stat >= 90) return 5;
    if (stat >= 85) return 4;
    if (stat >= 80) return 3;
    if (stat >= 75) return 2;
    if (stat >= 70) return 1;
    if (stat >= 31) return 0;
    if (stat >= 26) return -1;
    if (stat >= 21) return -2;
    if (stat >= 16) return -3;
    if (stat >= 11) return -4;
    if (stat === 10) return -5;
    if (stat >= 8) return -6;
    if (stat >= 6) return -7;
    if (stat >= 4) return -8;
    if (stat >= 2) return -9;
    return -10;
  }

  function formatBonus(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function statPairBonus(statPair) {
    const ids = String(statPair ?? "")
      .split("+")
      .map((stat) => stat.trim().toUpperCase())
      .filter((stat) => STATS.some((candidate) => candidate.id === stat));
    if (!ids.length) return 0;
    return ids.reduce((sum, statId) => sum + basicStatBonus(finalStat(statId)), 0);
  }

  function skillRankBonus(skill, ranks) {
    const count = Number(ranks) || 0;
    const categoryKey = skillCategoryKey(skill?.category);
    if (categoryKey === "body-development" && selectedRace?.bodyDevelopment?.length) {
      return Array.from({ length: count }, (_, index) => raceBodyDevelopmentValue(index + 1)).reduce((sum, value) => sum + value, 0);
    }
    const steps = categoryKey.startsWith("crafts") ? [5, 3, 1] : [3, 2, 1];
    return Math.min(count, 10) * steps[0] + Math.min(Math.max(count - 10, 0), 10) * steps[1] + Math.max(count - 20, 0) * steps[2];
  }

  function raceBodyDevelopmentValue(rank) {
    const tier = selectedRace?.bodyDevelopment?.find((entry) => rankInRange(rank, entry.range));
    if (tier) return Number(tier.xpCost ?? 0);
    const lastTier = selectedRace?.bodyDevelopment?.at(-1);
    return Number(lastTier?.xpCost ?? 0);
  }

  function rankInRange(rank, range) {
    const [start, end] = String(range ?? "")
      .split("-")
      .map((value) => Number(value.trim()));
    if (!Number.isFinite(start)) return false;
    return rank >= start && rank <= (Number.isFinite(end) ? end : start);
  }

  function professionCategoryBonus(skill) {
    const categoryKey = skillCategoryKey(skill?.category);
    return (selectedProfession?.professionBonuses ?? []).reduce((sum, entry) => {
      const bonusKey = skillCategoryKey(entry.area);
      const matches = categoryKey === bonusKey || categoryKey.startsWith(`${bonusKey}-`);
      return matches ? sum + firstNumber(entry.bonus) : sum;
    }, 0);
  }

  function directedSpellEntry(category) {
    return character.directedSpells?.[category] ?? {};
  }

  function directedSpellCategoryLabel(category) {
    return category === "Custom" ? directedSpellEntry(category).category ?? "" : category;
  }

  function directedSpellDevCost() {
    const match = selectedProfession?.skillCosts?.find((entry) => skillCategoryKey(entry.category) === "directed-spells");
    return match?.cost ?? "-";
  }

  function directedSpellStatBonus() {
    return basicStatBonus(finalStat("AG")) + basicStatBonus(finalStat("SD")) + basicStatBonus(finalStat("AG"));
  }

  function directedSpellProfBonus() {
    return professionCategoryBonus({ category: "Directed Spells" });
  }

  function directedSpellTotal(category) {
    const entry = directedSpellEntry(category);
    const ranks = Number(entry.ranks ?? 0);
    const spec = Number(entry.spec ?? 0);
    const item = Number(entry.item ?? 0);
    return skillRankBonus({ category: "Directed Spells" }, ranks) + directedSpellStatBonus() + directedSpellProfBonus() + spec + item;
  }

  function activeDirectedSpellRows() {
    return directedSpellCategories.filter((category) => {
      const entry = directedSpellEntry(category);
      return category !== "Custom" || entry.category || Number(entry.ranks || 0) || Number(entry.spec || 0) || Number(entry.item || 0);
    });
  }

  function setDirectedSpellField(category, field, value) {
    const numericFields = new Set(["ranks", "spec", "item"]);
    const nextValue = numericFields.has(field) ? Number(value) || 0 : value;
    character = {
      ...character,
      directedSpells: {
        ...character.directedSpells,
        [category]: {
          ...directedSpellEntry(category),
          [field]: nextValue
        }
      }
    };
  }

  function skillTotalBonus(skill) {
    const ranks = totalSkillRanks(skill.name);
    return skillRankBonus(skill, ranks) + statPairBonus(skill.statPair) + professionCategoryBonus(skill);
  }

  function bodyDevelopmentSkill() {
    return skillByName("Body Development");
  }

  function bodyDevelopmentRanks() {
    return totalSkillRanks("Body Development");
  }

  function maxHitPoints() {
    return Math.max(0, skillTotalBonus(bodyDevelopmentSkill()));
  }

  function currentHitPoints() {
    const total = maxHitPoints();
    const current = character.currentHp == null ? total : Number(character.currentHp || 0);
    return Math.min(Math.max(0, current), total);
  }

  function setCurrentHitPoints(value) {
    const total = maxHitPoints();
    const next = Math.min(Math.max(0, Number(value) || 0), total);
    character = { ...character, currentHp: next };
  }

  function trainingTooltip(skill) {
    const gain = rankGainFor(professionSkillTier(skill));
    return `${skillTierLabel(professionSkillTier(skill))}: +${gain} rank${gain === 1 ? "" : "s"} per XP`;
  }

  function addLanguage() {
    character = { ...character, languages: [...(character.languages ?? []), { name: "", spoken: 0, written: 0 }] };
  }

  function removeLanguage(index) {
    const next = (character.languages ?? []).filter((_, i) => i !== index);
    character = { ...character, languages: next };
  }

  function setLanguageProp(index, prop, value) {
    const next = (character.languages ?? []).map((lang, i) => i === index ? { ...lang, [prop]: value } : lang);
    character = { ...character, languages: next };
  }

  function addInventoryItem() {
    character = {
      ...character,
      inventory: [...(character.inventory ?? []), emptyInventoryItem()]
    };
  }

  function emptyInventoryItem() {
    return { name: "", qty: 1, location: "", status: "Carried", weight: 0, value: 0, notes: "" };
  }

  function addInventoryTestItems() {
    character = {
      ...character,
      inventory: [
        ...(character.inventory ?? []),
        ...inventoryTestItems.map((item) => ({ ...emptyInventoryItem(), ...item }))
      ]
    };
  }

  function clearInventory() {
    if (!confirm("Clear all inventory items?")) return;
    character = { ...character, inventory: [] };
  }

  function removeInventoryItem(index) {
    character = { ...character, inventory: (character.inventory ?? []).filter((_, i) => i !== index) };
  }

  function setInventoryProp(index, prop, value) {
    const numericFields = new Set(["qty", "weight", "value"]);
    const next = (character.inventory ?? []).map((item, i) => i === index
      ? { ...item, [prop]: numericFields.has(prop) ? Number(value) || 0 : value }
      : item);
    character = { ...character, inventory: next };
  }

  function adjustInventoryQty(index, delta) {
    const next = (character.inventory ?? []).map((item, i) => i === index
      ? { ...item, qty: Math.max(0, Number(item.qty ?? 0) + delta) }
      : item);
    character = { ...character, inventory: next };
  }

  function duplicateInventoryItem(index) {
    const item = character.inventory?.[index];
    if (!item) return;
    character = { ...character, inventory: [...(character.inventory ?? []), { ...item }] };
  }

  function inventoryTotal(prop) {
    return (character.inventory ?? []).reduce((sum, item) => sum + (Number(item.qty ?? 0) * Number(item[prop] ?? 0)), 0);
  }

  function summaryPanelIndex(panel = activeSummaryPanel) {
    return Math.max(0, summaryPanels.indexOf(panel));
  }

  function summaryNeighbor(delta) {
    return summaryPanels[activeSummaryPanelIndex + delta] ?? "";
  }

  async function setSummaryPanel(panel) {
    if (!summaryPanels.includes(panel)) return;
    activeSummaryPanel = panel;
    await tick();
    const index = summaryPanelIndex(panel);
    summaryCarousel?.scrollTo({ left: index * summaryCarousel.clientWidth, behavior: "smooth" });
  }

  function nudgeSummaryPanel(delta) {
    const index = Math.min(Math.max(activeSummaryPanelIndex + delta, 0), summaryPanels.length - 1);
    setSummaryPanel(summaryPanels[index]);
  }

  function syncSummaryPanelFromScroll(event) {
    const target = event.currentTarget;
    const index = Math.round(target.scrollLeft / Math.max(1, target.clientWidth));
    activeSummaryPanel = summaryPanels[Math.min(Math.max(index, 0), summaryPanels.length - 1)] ?? activeSummaryPanel;
  }

  function resetCharacter() {
    character = { ...blankCharacter(), id: activeCharacterId, ownerId: activeUserId, createdAt: character.createdAt, updatedAt: new Date().toISOString() };
  }
</script>

{#if currentView === "users"}
  <main class="portal-shell">
    <section class="portal-head">
      <div>
        <p>Aethergate</p>
        <h1>Choose Player</h1>
      </div>
    </section>

    <section class="user-grid" aria-label="Players">
      {#each players as player}
        {@const playerCharacters = charactersFor(player.id)}
        {@const latest = playerCharacters.map((item) => item.updatedAt).filter(Boolean).sort().at(-1)}
        <button class="user-card" on:click={() => selectUser(player.id)}>
          <span class="user-avatar">{player.name.slice(0, 1)}</span>
          <strong>{player.name}</strong>
          <small>{playerCharacters.length} {playerCharacters.length === 1 ? "character" : "characters"}</small>
          <span>Last edited: {lastEdited(latest)}</span>
        </button>
      {/each}
    </section>
  </main>
{:else if currentView === "characters"}
  <main class="portal-shell">
    <section class="portal-head">
      <button class="back-link" on:click={backToUsers}>Back to players</button>
      <div>
        <p>{selectedUser?.name ?? "Player"}</p>
        <h1>Characters</h1>
      </div>
      <button class="primary-action" on:click={createCharacter}>New Character</button>
    </section>

    {#if activeCharacters.length === 0}
      <section class="empty-library">
        <h2>No Characters Yet</h2>
        <p>Create the first character for {selectedUser?.name ?? "this player"}.</p>
        <button class="primary-action" on:click={createCharacter}>New Character</button>
      </section>
    {:else}
      <section class="character-library" aria-label={`${selectedUser?.name ?? "Player"} characters`}>
        {#each activeCharacters as item}
          <article class="character-card">
            <div>
              <strong>{characterLabel(item)}</strong>
              <small>{characterSubtitle(item)}</small>
            </div>
            <dl>
              <div>
                <dt>Level</dt>
                <dd>{Math.floor(Number(item.xp || 0) / 100)}</dd>
              </div>
              <div>
                <dt>XP</dt>
                <dd>{item.xp || 0}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{lastEdited(item.updatedAt)}</dd>
              </div>
            </dl>
            <div class="card-actions">
              <button class="primary-action" on:click={() => openCharacter(item.id)}>Open</button>
              <button on:click={() => duplicateCharacter(item.id)}>Duplicate</button>
              <button class="danger-action" on:click={() => deleteCharacter(item.id)}>Delete</button>
            </div>
          </article>
        {/each}
      </section>
    {/if}
  </main>
{:else}
<main class="shell" class:summary-only={activeTab === "Summary"}>
  <section class="workspace">
    {#if activeTab !== "Summary"}
      <header class="creator-topbar">
        <div class="identity-nav">
          <button class="home-button" aria-label="Home" title="Home" on:click={backToCharacters}>⌂</button>
        </div>
        <div class="creator-identity">
          <small>{selectedUser?.name ?? "Player"} <span class="save-pill save-pill--{saveStatus.toLowerCase()}" title={saveStatus === "Shared" ? "Saving to the shared library" : "Shared library unreachable — saving to this browser only"}>{saveStatus === "Shared" ? "● Shared" : "▲ Local only"}</span></small>
          <label for="character-name">Character</label>
          <input id="character-name" bind:value={character.name} placeholder="Name" />
        </div>
        <dl class="snapshot snapshot--top">
          <div>
            <dt>Race</dt>
            <dd>{selectedRace?.name ?? "None"}</dd>
          </div>
          <div>
            <dt>Adolescence</dt>
            <dd>{selectedCulture?.name ?? "None"}</dd>
          </div>
          <div>
            <dt>Profession</dt>
            <dd>{selectedProfession?.name ?? "None"}</dd>
          </div>
          <div>
            <dt>XP</dt>
            <dd>{remainingXp} left</dd>
          </div>
        </dl>

      </header>

      <div class="flow-progress" aria-label="Creator steps">
        {#each tabs as tab}
          {@const state = tabStates[tab]}
          {@const badge = tabBadges[tab] ?? ""}
          <button
            type="button"
            class:active={activeTab === tab}
            class:done={state === "done"}
            class:warn={state === "warn"}
            class:progress={state === "progress"}
            title={state === "warn" ? `${tab} — over budget` : `Jump to ${tab}`}
            aria-current={activeTab === tab ? "step" : undefined}
            on:click={() => jumpToTab(tab)}
          >
            <b>{state === "done" ? "✓" : state === "warn" ? "!" : tabs.indexOf(tab) + 1}</b>
            <small>{tab}</small>
            {#if badge}
              <span class="flow-badge" class:flow-badge--over={state === "warn"}>{badge}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    {#if activeTab === "Race"}
      <header class="section-head">
        <div>
          <p>Step 1</p>
          <h1>Choose Race</h1>
        </div>
        <div class="section-actions">
          <input class="search" bind:value={raceSearch} placeholder="Search races" />
          <button class="inline-back" on:click={prevTab} disabled={tabs.indexOf(activeTab) === 0}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="list-grid">
        {#each filteredRaces as race}
          <button class:selected={character.raceId === race.id} class="choice" on:click={() => selectRace(race.id)}>
            <strong>{race.name}</strong>
            <span>{race.summary}</span>
            <small>Background options: {race.backgroundOptions || "?"} · Base Movement Rate: {race.baseRate || "?"}</small>
          </button>
        {/each}
      </div>

      {#if selectedRace}
        <div class="detail-band">
          <h2>{selectedRace.name}</h2>
          <table>
            <thead>
              <tr>
                {#each raceStats(selectedRace) as [stat]}<th>{stat}</th>{/each}
              </tr>
            </thead>
            <tbody>
              <tr>
                {#each raceStats(selectedRace) as [, value]}<td>{value}</td>{/each}
              </tr>
            </tbody>
          </table>
          <p>{selectedRace.languages}</p>

          {#if selectedRace.bodyDevelopment?.length}
            <div class="bd-progression">
              <h3 class="bd-title">Body Development</h3>
              <div class="bd-tiers">
                {#each selectedRace.bodyDevelopment as tier, i}
                  <div class="bd-tier">
                    <span class="bd-range">Ranks {tier.range}</span>
                    <span class="bd-cost">{tier.xpCost} XP / rank</span>
                  </div>
                  {#if i < selectedRace.bodyDevelopment.length - 1}
                    <span class="bd-arrow">→</span>
                  {/if}
                {/each}
              </div>
              <p class="bd-desc">
                {selectedRace.bodyDevelopment.map((t) => `Ranks ${t.range}: ${t.xpCost} XP each`).join(" · ")}
              </p>
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    {#if activeTab === "Adolescence"}
      <header class="section-head">
        <div>
          <p>Step 2</p>
          <h1>Choose Adolescence</h1>
        </div>
        <div class="section-actions">
          <input class="search" bind:value={cultureSearch} placeholder="Search adolescence paths" />
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="adolescence-compare">
        <div class="adolescence-row adolescence-row--header">
          <span>Path</span>
          <span>Body Dev</span>
          <span>Languages</span>
          <span>Hobby</span>
          <span>Direct Rank Preview</span>
        </div>
        {#each filteredCultures as culture}
          <button class="adolescence-row" class:selected={character.cultureId === culture.id} on:click={() => selectCulture(culture.id)}>
            <span>
              <b>{culture.name}</b>
              <small>{culture.summary}</small>
            </span>
            <span>+{cultureRanksMatching(culture, /Body Development/i)}</span>
            <span>+{cultureRanksMatching(culture, /Language/i)}</span>
            <span>+{cultureRanksMatching(culture, /Hobby/i)}</span>
            <span>{cultureRankPreview(culture)}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if activeTab === "Stats"}
      <header class="section-head">
        <div>
          <p>Step 4</p>
          <h1>Assign Stats</h1>
        </div>
        <div class="section-actions section-actions--nav">
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="xp-panel">
        <label>
          Stat Pool
          <input type="number" min="0" bind:value={character.statPool} />
        </label>
        <strong class:over={remainingStatPoints < 0}>{remainingStatPoints} points left</strong>
        <span>({totalStatPoints} spent)</span>
      </div>

      {#if selectedProfession?.primeStats}
        <div class="prime-stat-hint">
          <span class="prime-stat-hint-label">Prime stats for {selectedProfession.name}:</span>
          <span class="prime-stat-chips">
            {#each primeStats as stat}
              <span class="prime-stat-chip prime-stat-chip--{stat.id.toLowerCase()}" title={stat.name}>
                <b>{stat.id}</b>
                <small>{stat.name}</small>
              </span>
            {/each}
          </span>
        </div>
      {/if}

      <div class="skill-table">
        <div class="skill-row header">
          <span>Stat</span>
          <span>Base</span>
          <span>Race Modifier</span>
          <span>Final</span>
        </div>
        {#each STATS as stat}
          <div class="skill-row" class:skill-row--prime={primeStatSet.has(stat.id)}>
            <span>
              <b>{stat.id}</b>
              <small>{stat.name}</small>
            </span>
            <span>
              <input
                class="stat-input"
                type="number"
                min="0"
                max="100"
                value={character.statPoints?.[stat.id] ?? 0}
                on:input={(e) => setStatPoint(stat.id, e.target.value)}
              />
            </span>
            <span>{selectedRace?.stats?.[stat.id] || "—"}</span>
            <span class:stat-final-boosted={parseStatMod(selectedRace?.stats?.[stat.id]) > 0}
                  class:stat-final-penalized={parseStatMod(selectedRace?.stats?.[stat.id]) < 0}>
              {finalStat(stat.id)}
            </span>
          </div>
        {/each}
      </div>
    {/if}

    {#if activeTab === "Profession"}
      <header class="section-head">
        <div>
          <p>Step 3</p>
          <h1>Choose Profession</h1>
        </div>
        <div class="section-actions">
          <input class="search" bind:value={professionSearch} placeholder="Search professions" />
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="list-grid">
        {#each filteredProfessions as profession}
          <button class:selected={character.professionId === profession.id} class="choice" on:click={() => selectProfession(profession.id)}>
            <strong>{profession.name}</strong>
            <span>{profession.summary}</span>
            <small>{profession.realm}{profession.secondaryRealm ? ` / ${profession.secondaryRealm}` : ""} · {profession.spellUser || "non-spell"}</small>
          </button>
        {/each}
      </div>

      {#if selectedProfession}
        <div class="split-band">
          <section>
            <h2>{selectedProfession.name}</h2>
            <p>{selectedProfession.primeStats}</p>
            <p>{selectedProfession.summary}</p>
          </section>
          <section>
            <h2>Skill Training</h2>
            <div class="compact-table">
              {#each selectedProfession.skillTraining?.length ? selectedProfession.skillTraining : selectedProfession.skillCosts as skill}
                <span>{skill.category}</span><b>{skill.tier ? skillTierLabel(skill.tier) : skill.cost}</b>
              {/each}
            </div>
          </section>
        </div>
      {/if}
    {/if}

    {#if activeTab === "Spells"}
      <header class="section-head">
        <div>
          <p>Step 5</p>
          <h1>Choose Spell Lists</h1>
        </div>
        <div class="section-actions">
          <input class="search" bind:value={spellSearch} placeholder="Search spell lists" />
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="spell-info-bar">
        <div class="spell-info-stat">
          <span class="spell-info-label">Lists Selected</span>
          <strong>{selectedSpellLists.length}</strong>
        </div>
        <div class="spell-info-stat">
          <span class="spell-info-label">Spells Learned</span>
          <strong>{totalSpellsSpent}</strong>
        </div>
        <div class="spell-info-stat spell-info-stat--input">
          <label class="spell-info-label" for="spell-pool-input">Spell Points</label>
          <div class="spell-info-pool">
            <input id="spell-pool-input" type="number" min="0" bind:value={character.spellPool} />
            <span class:over={remainingSpellPool < 0}>{remainingSpellPool} left</span>
          </div>
        </div>
      </div>

      <div class="chip-bar">
        {#each spellGroups as group}
          <button class="chip" class:active={selectedSpellGroups.has(group)} on:click={() => toggleSpellGroup(group)}>{group}</button>
        {/each}
        {#if selectedSpellGroups.size > 0}
          <button class="chip chip-clear" on:click={() => (selectedSpellGroups = new Set())}>Clear</button>
        {/if}
        <span class="chip-count"><strong>{filteredSpellLists.length}</strong> shown</span>
      </div>

      <div class="spell-layout">
        <div class="spell-list-column">
          {#each filteredSpellLists as spellList}
            <article class:selected={character.spellListIds.includes(spellList.id)} class="spell-list-card">
              <label>
                <input type="checkbox" checked={character.spellListIds.includes(spellList.id)} on:change={() => toggleSpellList(spellList.id)} />
                <span>
                  <strong>{spellList.name}</strong>
                  <small>{spellList.group}</small>
                </span>
              </label>
              <p>{spellList.summary}</p>
              <div class="meta-pills">
                <span>{spellList.realm}</span>
                <span>{spellList.listType}</span>
                {#if spellList.status}<span>{spellList.status}</span>{/if}
              </div>
            </article>
          {/each}
        </div>

        <div class="spell-detail-column">
          {#if selectedSpellLists.length === 0}
            <div class="empty-state">
              <h2>No Spell Lists Selected</h2>
              <p>Select one or more lists to see their spells here and add them to the character sheet.</p>
            </div>
          {:else}
            {#if selectedSpellLists.length > 1}
              <div class="spell-list-tabs">
                {#each selectedSpellLists as spellList}
                  <button
                    class="spell-list-tab"
                    class:active={activeSpellListId === spellList.id}
                    on:click={() => (activeSpellListId = spellList.id)}
                  >{spellList.name}<span class="spell-tab-count">{character.spellRanks?.[spellList.id] ?? 0}/{spellList.spells.length}</span></button>
                {/each}
              </div>
            {/if}
            {#each selectedSpellLists.filter(s => s.id === activeSpellListId) as spellList}
              <section class="spell-detail">
                <header>
                  <div>
                    <h2>{spellList.name}</h2>
                    <p>{spellList.realm} · {spellList.listType}</p>
                    <small>{spellList.summary}</small>
                  </div>
                  <div class="spell-rank-control">
                    <button class="rank-btn" on:click={() => refundSpell(spellList.id)} disabled={!(character.spellRanks?.[spellList.id] > 0)}>−</button>
                    <span class="spell-rank-display">
                      <b>{character.spellRanks?.[spellList.id] ?? 0}</b>
                      <small>/ {spellList.spells.length}</small>
                    </span>
                    <button class="rank-btn rank-btn--add" on:click={() => buySpell(spellList.id, spellList.spells.length)} disabled={remainingSpellPool < 1 || (character.spellRanks?.[spellList.id] ?? 0) >= spellList.spells.length}>+</button>
                  </div>
                  <button class="rank-btn" aria-label={`Remove ${spellList.name}`} on:click={() => toggleSpellList(spellList.id)}>×</button>
                </header>
                <div class="spell-table">
                  <div class="spell-row header">
                    <span>Lvl</span>
                    <span>Spell</span>
                    <span>Range</span>
                    <span>Type</span>
                    <span>Effect</span>
                  </div>
                  {#each spellList.spells as spell}
                    <div class="spell-row" class:spell-row--known={spell.level <= (character.spellRanks?.[spellList.id] ?? 0)}>
                      <span>{spell.level}</span>
                      <span>
                        <b>{spell.name}</b>
                        <small>{spell.areaOfEffect}{spell.duration ? ` · ${spell.duration}` : ""}</small>
                      </span>
                      <span>{spell.range || "—"}</span>
                      <span>
                        {#if resolveSpellType(spell.type)}
                          {@const st = resolveSpellType(spell.type)}
                          <span class="spell-type-badge" data-tooltip={st.desc}>{st.label}</span>
                        {:else}
                          —
                        {/if}
                      </span>
                      <span>{spell.description || "—"}</span>
                    </div>
                  {/each}
                </div>
              </section>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    {#if activeTab === "Talents"}
      <header class="section-head">
        <div>
          <p>Step 6</p>
          <h1>Choose Talents</h1>
        </div>
        <div class="section-actions">
          <input class="search" bind:value={talentSearch} placeholder="Search talents" />
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="toolbar">
        <strong>{selectedTalents.length}</strong>
        <span>selected</span>
        <strong>{totalTalentCost}</strong>
        <span>spent</span>
        <label class="toolbar-budget">
          Talent Points
          <input type="number" min="0" bind:value={character.talentPool} />
        </label>
        <strong class:over={remainingTalentPoints < 0}>{remainingTalentPoints}</strong>
        <span>left</span>
      </div>

      <div class="filter-stack">
        <div class="chip-bar">
          <span class="chip-label">Groups</span>
          {#each talentGroups as group}
            <button class="chip" class:active={selectedTalentGroups.has(group)} on:click={() => toggleTalentGroup(group)}>{group}</button>
          {/each}
          {#if selectedTalentGroups.size > 0}
            <button class="chip chip-clear" on:click={() => (selectedTalentGroups = new Set())}>Clear groups</button>
          {/if}
        </div>

        <div class="chip-bar">
          <span class="chip-label">Categories</span>
          {#each talentCategories as category}
            <button class="chip" class:active={selectedTalentCategories.has(category)} on:click={() => toggleTalentCategory(category)}>{category}</button>
          {/each}
          {#if selectedTalentCategories.size > 0}
            <button class="chip chip-clear" on:click={() => (selectedTalentCategories = new Set())}>Clear categories</button>
          {/if}
          {#if selectedTalentGroups.size > 0 || selectedTalentCategories.size > 0}
            <button class="chip chip-clear" on:click={clearTalentFilters}>Clear all</button>
          {/if}
          <span class="chip-count"><strong>{filteredTalents.length}</strong> shown</span>
        </div>
      </div>

      <div class="table-list">
        {#each filteredTalents as talent}
          {@const selected = character.talentIds.includes(talent.id)}
          {@const cost = firstNumber(talent.cost)}
          <label>
            <input type="checkbox" checked={selected} disabled={!selected && cost > remainingTalentPoints} on:change={() => toggleTalent(talent.id)} />
            <span class="talent-main">
              <strong>{talent.name}</strong>
              {#if talent.rulesSummary}
                <small>{talent.rulesSummary}</small>
              {/if}
            </span>
            <span class="talent-meta">
              <small>{talent.group}</small>
              <small>{talent.category}</small>
            </span>
            <span class="talent-cost">
              <b>{talent.cost}</b>
              {#if talent.detailSource}
                <small>{talent.detailSource.replaceAll("*", "")}</small>
              {/if}
            </span>
          </label>
        {/each}
      </div>
    {/if}

    {#if activeTab === "Training"}
      <header class="section-head">
        <div>
          <p>Step 7</p>
          <h1>Choose Training Packages</h1>
        </div>
        <div class="section-actions">
          <input class="search" bind:value={packageSearch} placeholder="Search packages" />
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="chip-bar">
        {#each trainingPackageGroups as group}
          <button class="chip" class:active={selectedPackageGroups.has(group)} on:click={() => togglePackageGroup(group)}>{group}</button>
        {/each}
        {#if selectedPackageGroups.size > 0}
          <button class="chip chip-clear" on:click={() => (selectedPackageGroups = new Set())}>Clear</button>
        {/if}
        <span class="chip-count"><strong>{filteredPackages.length}</strong> shown</span>
      </div>

      <div class="toolbar">
        <strong>{selectedPackages.length}</strong>
        <span>selected</span>
        <strong>{totalPackageCost}</strong>
        <span>spent</span>
        <label class="toolbar-budget">
          Training Points
          <input type="number" min="0" bind:value={character.trainingPool} />
        </label>
        <strong class:over={remainingTrainingPoints < 0}>{remainingTrainingPoints}</strong>
        <span>left</span>
      </div>

      <div class="package-grid">
        {#each filteredPackages as trainingPackage}
          {@const selected = character.trainingPackageIds.includes(trainingPackage.id)}
          {@const cost = packageCost(trainingPackage, selectedProfession)}
          <article class:selected={character.trainingPackageIds.includes(trainingPackage.id)}>
            <div class="package-card-head">
              <label>
                <input type="checkbox" checked={selected} disabled={!selected && cost > remainingTrainingPoints} on:change={() => togglePackage(trainingPackage.id)} />
                <strong>{trainingPackage.name}</strong>
              </label>
              <span class="package-cost-badge">
                {#if selectedProfession}
                  <b>{cost}</b>
                {:else}
                  <b>-</b>
                {/if}
              </span>
            </div>
            <div class="meta-pills">
              <span>{trainingPackage.group}</span>
              {#each trainingPackage.tags as tag}
                <span>{tag}</span>
              {/each}
            </div>
            <p>{trainingPackage.summary}</p>
            <div class="rank-pills">
              {#each trainingPackage.ranks.slice(0, 6) as rank}
                <span>{rank.name} +{rank.ranks}</span>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    {/if}

    {#if activeTab === "Skills"}
      <header class="section-head">
        <div>
          <p>Step 8</p>
          <h1>Spend XP On Skills</h1>
        </div>
        <div class="section-actions">
          <input class="search" bind:value={skillSearch} placeholder="Search skills" />
          <button class="sort-toggle" on:click={() => (skillSortMode = skillSortMode === "abc" ? "cat" : "abc")}>
            {skillSortMode === "abc" ? "ABC" : "CAT"}
          </button>
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="xp-panel xp-panel--slim xp-panel--skills">
        <label>
          Total XP
          <input type="number" min="0" bind:value={character.xp} />
        </label>
        <div class="xp-level-card">
          <div>
            <span>Level {xpLevel}</span>
            <strong>{remainingXp} XP left</strong>
          </div>
          <div class="xp-meter" aria-label={`${xpProgress} XP toward next level`}>
            <span style={`width: ${xpProgressPercent}`}></span>
          </div>
          <small>{xpProgress} / 100 XP to level {xpLevel + 1}</small>
        </div>
      </div>

      <div class="chip-bar">
        {#each skillGroups as group}
          <button class="chip" class:active={selectedSkillGroups.has(group)} on:click={() => toggleSkillGroup(group)}>{group}</button>
        {/each}
        {#if selectedSkillGroups.size > 0}
          <button class="chip chip-clear" on:click={() => (selectedSkillGroups = new Set())}>Clear</button>
        {/if}
        <span class="chip-count"><strong>{filteredSkills.length}</strong> shown</span>
      </div>

      <section class="directed-spells-panel">
        <h2>Directed Spells</h2>
        <div class="directed-spells-table">
          <div class="directed-spell-row header">
            <span>Category</span>
            <span>Stats</span>
            <span>Dev Cost</span>
            <span>Ranks</span>
            <span>Stat</span>
            <span>Prof</span>
            <span>Spec</span>
            <span>Item</span>
            <span>Total</span>
          </div>
          {#each directedSpellCategories as category}
            <div class="directed-spell-row">
              <span>
                {#if category === "Custom"}
                  <input
                    class="directed-category-input"
                    value={directedSpellCategoryLabel(category)}
                    placeholder="Custom"
                    on:input={(e) => setDirectedSpellField(category, "category", e.target.value)}
                  />
                {:else}
                  <b>{category}</b>
                {/if}
              </span>
              <span>Ag/SD/Ag</span>
              <span>{directedSpellDevCost()}</span>
              <span>
                <input
                  type="number"
                  min="0"
                  value={directedSpellEntry(category).ranks ?? 0}
                  on:input={(e) => setDirectedSpellField(category, "ranks", e.target.value)}
                />
              </span>
              <span>{formatBonus(directedSpellStatBonus())}</span>
              <span>{formatBonus(directedSpellProfBonus())}</span>
              <span>
                <input
                  type="number"
                  value={directedSpellEntry(category).spec ?? 0}
                  on:input={(e) => setDirectedSpellField(category, "spec", e.target.value)}
                />
              </span>
              <span>
                <input
                  type="number"
                  value={directedSpellEntry(category).item ?? 0}
                  on:input={(e) => setDirectedSpellField(category, "item", e.target.value)}
                />
              </span>
              <span class="directed-total">{formatBonus(directedSpellTotal(category))}</span>
            </div>
          {/each}
        </div>
      </section>

      <div class="skill-table skill-table--skills">
        <div class="skill-row header">
          <span>Skill</span>
          <span>Stats</span>
          <span>Pair Bonus</span>
          <span>Category Bonus</span>
          <span>Training</span>
          <span>Ranks</span>
          <span>Total</span>
        </div>
        {#each filteredSkills as skill, index (skill.name)}
          <div class="skill-row" class:skill-row--category-break={startsNewSkillCategory(index)}>
            <span>
              <b>{skill.name}</b>
              <small>{skill.category}</small>
            </span>
            <span class="skill-stat-pair">{skill.statPair ?? "-"}</span>
            <span class="skill-pair-bonus">{formatBonus(statPairBonus(skill.statPair))}</span>
            <span class="skill-category-bonus">{formatBonus(professionCategoryBonus(skill))}</span>
            <span class={`skill-training-badge skill-training-badge--${professionSkillTier(skill)}`} title={trainingTooltip(skill)}>{skillTierLabel(professionSkillTier(skill))}</span>
            <span class="rank-control">
              <button class="rank-btn" on:click={() => refundXpOnSkill(skill.name)} disabled={xpSkillRanks(skill.name) < 1}>−</button>
              <b title={skillRankBreakdown(skill.name)}>{totalSkillRanks(skill.name)}</b>
              <small>{xpSkillRanks(skill.name)} XP</small>
              <button class="rank-btn rank-btn--add" on:click={() => spendXpOnSkill(skill.name)} disabled={remainingXp < 1}>+</button>
            </span>
            <span class="skill-total-bonus">{formatBonus(skillTotalBonus(skill))}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if activeTab === "Custom Rules"}
      <header class="section-head">
        <div>
          <p>Step 9</p>
          <h1>Custom Rules</h1>
        </div>
        <div class="section-actions section-actions--nav">
          <button class="inline-back" on:click={prevTab}>← Back</button>
          <button class="inline-next" on:click={nextTab}>Next →</button>
        </div>
      </header>

      <div class="rules-template-grid">
        {#each customRuleTemplates as template}
          <article class:selected={character.customRuleIds?.includes(template.id)} class="rules-template-card">
            <div>
              <strong>{template.name}</strong>
              <small>Player: {template.player}</small>
            </div>
            <p>{template.summary}</p>
            <button on:click={() => toggleCustomRule(template.id)}>
              {character.customRuleIds?.includes(template.id) ? "Selected" : "Add Rule"}
            </button>
          </article>
        {/each}
      </div>

      {#if selectedCustomRules.length}
        <div class="rule-tabs" role="tablist" aria-label="Selected custom rules">
          {#each selectedCustomRules as rule}
            <button
              class="rule-tab"
              class:active={activeCustomRuleId === rule.id}
              role="tab"
              aria-selected={activeCustomRuleId === rule.id}
              on:click={() => (activeCustomRuleId = rule.id)}
            >
              {rule.name}
            </button>
          {/each}
        </div>

        <div class="rules-detail-stack">
          {#each selectedCustomRules.filter((rule) => rule.id === activeCustomRuleId) as rule}
            <section class="rules-detail">
              <header>
                <div>
                  <p>Player: {rule.player}</p>
                  <h2>{rule.name}</h2>
                </div>
                <button on:click={() => toggleCustomRule(rule.id)}>Remove</button>
              </header>
              <p>{rule.description}</p>

              {#if rule.effects?.length}
                <ul class="rule-effects">
                  {#each rule.effects as effect}
                    <li>{effect}</li>
                  {/each}
                </ul>
              {/if}

              {#if rule.crystals?.length}
                <div class="rules-table-wrap">
                  <table class="rules-table">
                    <thead>
                      <tr>
                        <th>Crystal / Stone</th>
                        <th>Type</th>
                        <th>Growth Exposure</th>
                        <th>Capacity</th>
                        <th>Typical Use</th>
                        <th>Value</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each rule.crystals as crystal}
                        <tr>
                          <td><b>{crystal.name}</b></td>
                          <td><span class="rule-type rule-type--{crystal.type.toLowerCase().replaceAll(' ', '-')}">{crystal.type}</span></td>
                          <td>{crystal.exposure}</td>
                          <td>{crystal.capacity}</td>
                          <td>{crystal.use}</td>
                          <td>{crystal.value}</td>
                          <td>{crystal.notes}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </section>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <h2>No Custom Rules Selected</h2>
          <p>Add a rule above to attach it to this character.</p>
        </div>
      {/if}
    {/if}

    {#if activeTab === "Summary"}
      <div class="sheet-wrap">
        <div class="sheet-toolbar">
          <button class="home-button" aria-label="Back to characters" title="Back to characters" on:click={backToCharacters}>⌂</button>
          <button class="sheet-back-btn" on:click={() => jumpToTab(lastEditorTab)}>← Back to Editor</button>
          <span class="save-pill save-pill--{saveStatus.toLowerCase()}" title={saveStatus === "Shared" ? "Saving to the shared library" : "Shared library unreachable — saving to this browser only"}>{saveStatus === "Shared" ? "● Shared" : "▲ Local only"}</span>
        </div>
        <div class="sheet">

          <header class="sheet-header">
            <div class="sheet-summary-line">
              <div class="sheet-name-block">
                <span class="sheet-name-value sheet-name-line">
                  {character.name || "Unnamed"}
                  <small>- {selectedRace?.name ?? "Race"} - {selectedCulture?.name ?? "Adolescence"} - {selectedProfession?.name ?? "Profession"}</small>
                </span>
              </div>
              <div class="sheet-field sheet-field--xp">
                <div class="xp-level-card xp-level-card--sheet">
                  <div>
                    <span>Level {xpLevel}</span>
                    <strong>{remainingXp} left</strong>
                  </div>
                  <div class="xp-meter" aria-label={`${xpProgress} XP toward next level`}>
                    <span style={`width: ${xpProgressPercent}`}></span>
                  </div>
                  <small>{character.spentXp} spent / {character.xp || 0} total - {xpProgress} / 100 progress</small>
                </div>
              </div>
              <label class="sheet-hp-card">
                <span>Hit Points</span>
                <div>
                  <input
                    type="number"
                    min="0"
                    max={maxHitPoints()}
                    value={currentHitPoints()}
                    on:input={(e) => setCurrentHitPoints(e.target.value)}
                  />
                  <strong>/ {maxHitPoints()}</strong>
                </div>
                <small>{bodyDevelopmentRanks()} Body Development ranks</small>
              </label>
            </div>
          </header>

          <section class="sheet-section">
            <h2 class="sheet-section-title">Stats</h2>
            <div class="sheet-stats-row">
              {#each STATS as stat}
                {@const value = finalStat(stat.id)}
                {@const bonus = basicStatBonus(value)}
                <div class="sheet-stat-tile">
                  <span class="sheet-stat-name">{stat.name}</span>
                  <div class="sheet-stat-box" class:sheet-stat-box--up={bonus > 0} class:sheet-stat-box--down={bonus < 0} class:sheet-stat-box--prime={primeStatSet.has(stat.id)}>
                    <span class="sheet-stat-value">{formatBonus(bonus)}</span>
                    <span class="sheet-stat-mod">{value}</span>
                  </div>
                </div>
              {/each}
            </div>
          </section>

          {#if ppRealms.length > 0}
          <section class="sheet-section">
            <h2 class="sheet-section-title">Power Points</h2>
            <div class="sheet-pp-row">
              {#each ppRealms as realm}
                {@const pp = ppForRealm(realm)}
                {@const prog = selectedRace?.ppProgression?.[realm.toLowerCase()] ?? ""}
                <div class="sheet-pp-tile">
                  <span class="sheet-pp-realm">{realm}</span>
                  <span class="sheet-pp-stat">{pp.statId} {formatBonus(pp.statBonus)}</span>
                  <label class="sheet-pp-ranks-label">
                    <span>Ranks</span>
                    <input
                      class="sheet-pp-input"
                      type="number"
                      min="0"
                      value={character.ppRanks?.[realm.toLowerCase()] ?? 0}
                      on:input={(e) => setPPRanks(realm, e.target.value)}
                    />
                  </label>
                  <div class="sheet-pp-total">
                    <strong class="sheet-pp-number">{pp.total}</strong>
                    <small>PP</small>
                  </div>
                  {#if prog}
                    <span class="sheet-pp-prog" title="DP cost per rank (tier progression)">{prog}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
          {/if}

          <section class="sheet-section sheet-section--carousel">
            <div class="summary-panel-tracker" aria-label="Summary panels">
              <button on:click={() => nudgeSummaryPanel(-1)} disabled={activeSummaryPanelIndex === 0}>
                {previousSummaryPanel || "Start"}
              </button>
              <div>
                <small>{activeSummaryPanelIndex + 1} / {summaryPanels.length}</small>
                <strong>{activeSummaryPanel}</strong>
                <span>{previousSummaryPanel || "Start"} / {nextSummaryPanel || "End"}</span>
              </div>
              <button on:click={() => nudgeSummaryPanel(1)} disabled={activeSummaryPanelIndex === summaryPanels.length - 1}>
                {nextSummaryPanel || "End"}
              </button>
            </div>

            <div class="summary-panel-dots">
              {#each summaryPanels as panel}
                <button
                  class:active={activeSummaryPanel === panel}
                  aria-label={`Show ${panel}`}
                  on:click={() => setSummaryPanel(panel)}
                ></button>
              {/each}
            </div>

            <div class="summary-carousel" bind:this={summaryCarousel} on:scroll={syncSummaryPanelFromScroll}>
              <section class="summary-panel">
                <h2 class="sheet-section-title">
                  Languages
                  <button class="sheet-add-btn" on:click={addLanguage}>+ Add Language</button>
                </h2>
                {#if (character.languages ?? []).length === 0}
                  <p class="sheet-empty-hint">No languages added. Click "+ Add Language" to begin.</p>
                {:else}
                  <table class="sheet-skill-table sheet-language-table">
                    <thead>
                      <tr>
                        <th>Language</th>
                        <th>Spoken (0-10)</th>
                        <th>Written (0-10)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each (character.languages ?? []) as lang, i}
                        <tr>
                          <td>
                            <input
                              class="lang-name-input"
                              type="text"
                              placeholder="Language name"
                              value={lang.name}
                              on:input={(e) => setLanguageProp(i, "name", e.target.value)}
                            />
                          </td>
                          <td class="lang-grade-cell">
                            <select value={lang.spoken} on:change={(e) => setLanguageProp(i, "spoken", Number(e.target.value))}>
                              {#each Array.from({length: 11}, (_, n) => n) as grade}
                                <option value={grade} selected={lang.spoken === grade}>{grade}</option>
                              {/each}
                            </select>
                          </td>
                          <td class="lang-grade-cell">
                            <select value={lang.written} on:change={(e) => setLanguageProp(i, "written", Number(e.target.value))}>
                              {#each Array.from({length: 11}, (_, n) => n) as grade}
                                <option value={grade} selected={lang.written === grade}>{grade}</option>
                              {/each}
                            </select>
                          </td>
                          <td>
                            <button class="lang-remove-btn" aria-label="Remove language" on:click={() => removeLanguage(i)}>X</button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {/if}
              </section>

              <section class="summary-panel">
                <h2 class="sheet-section-title">Skills</h2>
                {#if summarySkillEntries().length === 0}
                  <p class="sheet-empty-hint">No skill ranks yet.</p>
                {:else}
                  <table class="sheet-skill-table">
                    <thead>
                      <tr>
                        <th>Skill</th>
                        <th>Category</th>
                        <th>Level</th>
                        <th>Ranks</th>
                        <th>Stats</th>
                        <th>Pair Bonus</th>
                        <th>Cat Bonus</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each summarySkillEntries() as [skillName, ranks]}
                        {@const rowSkill = skillByName(skillName)}
                        {@const level = skillLevel(skillName)}
                        <tr>
                          <td class="sheet-skill-name">{skillName}</td>
                          <td class="sheet-skill-cat">{rowSkill?.category ?? '-'}</td>
                          <td><span class="skill-badge skill-badge--{level.toLowerCase()}">{level}</span></td>
                          <td class="sheet-skill-num">{ranks}</td>
                          <td class="sheet-skill-num">{rowSkill?.statPair ?? '-'}</td>
                          <td class="sheet-skill-num">{formatBonus(statPairBonus(rowSkill?.statPair))}</td>
                          <td class="sheet-skill-num">{formatBonus(professionCategoryBonus(rowSkill))}</td>
                          <td class="sheet-skill-num"><b>{formatBonus(skillTotalBonus(rowSkill))}</b></td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {/if}
              </section>

              <section class="summary-panel">
                <h2 class="sheet-section-title">Directed Spells</h2>
                {#if activeDirectedSpellRows().length === 0}
                  <p class="sheet-empty-hint">No directed spell categories set yet.</p>
                {:else}
                  <table class="sheet-skill-table sheet-directed-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Stats</th>
                        <th>Dev Cost</th>
                        <th>Ranks</th>
                        <th>Stat</th>
                        <th>Prof</th>
                        <th>Spec</th>
                        <th>Item</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each activeDirectedSpellRows() as category}
                        {@const entry = directedSpellEntry(category)}
                        <tr>
                          <td class="sheet-skill-name">{directedSpellCategoryLabel(category) || category}</td>
                          <td class="sheet-skill-num">Ag/SD/Ag</td>
                          <td class="sheet-skill-num">{directedSpellDevCost()}</td>
                          <td class="sheet-skill-num">{entry.ranks ?? 0}</td>
                          <td class="sheet-skill-num">{formatBonus(directedSpellStatBonus())}</td>
                          <td class="sheet-skill-num">{formatBonus(directedSpellProfBonus())}</td>
                          <td class="sheet-skill-num">{formatBonus(Number(entry.spec ?? 0))}</td>
                          <td class="sheet-skill-num">{formatBonus(Number(entry.item ?? 0))}</td>
                          <td class="sheet-skill-num"><b>{formatBonus(directedSpellTotal(category))}</b></td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {/if}
              </section>

              <section class="summary-panel">
                <h2 class="sheet-section-title">Custom Rules</h2>
                {#if selectedCustomRules.length === 0}
                  <p class="sheet-empty-hint">No custom rules selected.</p>
                {:else}
                  <div class="rule-tabs rule-tabs--sheet" role="tablist" aria-label="Summary custom rules">
                    {#each selectedCustomRules as rule}
                      <button
                        class="rule-tab"
                        class:active={activeCustomRuleId === rule.id}
                        role="tab"
                        aria-selected={activeCustomRuleId === rule.id}
                        on:click={() => (activeCustomRuleId = rule.id)}
                      >
                        {rule.name}
                      </button>
                    {/each}
                  </div>
                  <div class="sheet-rule-stack">
                    {#each selectedCustomRules.filter((rule) => rule.id === activeCustomRuleId) as rule}
                      <article class="sheet-rule">
                        <h3>{rule.name}</h3>
                        <small>Player: {rule.player}</small>
                        <p>{rule.description}</p>
                        {#if rule.effects?.length}
                          <ul class="rule-effects">
                            {#each rule.effects as effect}
                              <li>{effect}</li>
                            {/each}
                          </ul>
                        {/if}
                        {#if rule.crystals?.length}
                          <div class="rules-table-wrap">
                            <table class="rules-table rules-table--sheet">
                              <thead>
                                <tr>
                                  <th>Crystal / Stone</th>
                                  <th>Type</th>
                                  <th>Growth Exposure</th>
                                  <th>Capacity</th>
                                  <th>Use</th>
                                  <th>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {#each rule.crystals as crystal}
                                  <tr>
                                    <td><b>{crystal.name}</b></td>
                                    <td><span class="rule-type rule-type--{crystal.type.toLowerCase().replaceAll(' ', '-')}">{crystal.type}</span></td>
                                    <td>{crystal.exposure}</td>
                                    <td>{crystal.capacity}</td>
                                    <td>{crystal.use}</td>
                                    <td>{crystal.value}</td>
                                  </tr>
                                {/each}
                              </tbody>
                            </table>
                          </div>
                        {/if}
                      </article>
                    {/each}
                  </div>
                {/if}
              </section>

              <section class="summary-panel">
                <h2 class="sheet-section-title">
                  Inventory
                  <button class="sheet-add-btn" on:click={addInventoryItem}>+ Add Item</button>
                  <button class="sheet-add-btn" on:click={addInventoryTestItems}>+ Test Items</button>
                  {#if (character.inventory ?? []).length > 0}
                    <button class="sheet-add-btn sheet-add-btn--danger" on:click={clearInventory}>Clear</button>
                  {/if}
                </h2>
                <div class="inventory-summary">
                  <span><b>{(character.inventory ?? []).length}</b> items</span>
                  <span><b>{inventoryWeight.toFixed(1)}</b> weight</span>
                  <span><b>{inventoryValue.toFixed(1)}</b> value</span>
                </div>
                {#if (character.inventory ?? []).length === 0}
                  <p class="sheet-empty-hint">No inventory yet. Click "+ Add Item" to begin.</p>
                {:else}
                  <table class="sheet-skill-table sheet-inventory-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Wt</th>
                        <th>Value</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each (character.inventory ?? []) as item, i}
                        <tr>
                          <td>
                            <input
                              type="text"
                              placeholder="Item"
                              value={item.name}
                              on:input={(e) => setInventoryProp(i, "name", e.target.value)}
                            />
                          </td>
                          <td>
                            <div class="inventory-qty-control">
                              <button aria-label="Reduce quantity" on:click={() => adjustInventoryQty(i, -1)}>-</button>
                              <input
                                class="inventory-qty-input"
                                type="number"
                                min="0"
                                value={item.qty ?? 0}
                                on:input={(e) => setInventoryProp(i, "qty", e.target.value)}
                              />
                              <button aria-label="Increase quantity" on:click={() => adjustInventoryQty(i, 1)}>+</button>
                            </div>
                          </td>
                          <td>
                            <select value={item.status ?? "Carried"} on:change={(e) => setInventoryProp(i, "status", e.target.value)}>
                              <option value="Carried">Carried</option>
                              <option value="Equipped">Equipped</option>
                              <option value="Stored">Stored</option>
                              <option value="Dropped">Dropped</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Carried, pack, storage"
                              value={item.location}
                              on:input={(e) => setInventoryProp(i, "location", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              class="inventory-qty-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.weight ?? 0}
                              on:input={(e) => setInventoryProp(i, "weight", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              class="inventory-qty-input"
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.value ?? 0}
                              on:input={(e) => setInventoryProp(i, "value", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Notes"
                              value={item.notes}
                              on:input={(e) => setInventoryProp(i, "notes", e.target.value)}
                            />
                          </td>
                          <td>
                            <button class="inventory-row-btn" aria-label="Duplicate item" on:click={() => duplicateInventoryItem(i)}>Copy</button>
                            <button class="lang-remove-btn" aria-label="Remove item" on:click={() => removeInventoryItem(i)}>X</button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {/if}
              </section>
            </div>
          </section>

          {#if false}
          <section class="sheet-section">
            <h2 class="sheet-section-title">
              Languages
              <button class="sheet-add-btn" on:click={addLanguage}>+ Add Language</button>
            </h2>
            {#if (character.languages ?? []).length === 0}
              <p class="sheet-empty-hint">No languages added. Click "+ Add Language" to begin.</p>
            {:else}
              <table class="sheet-skill-table sheet-language-table">
                <thead>
                  <tr>
                    <th>Language</th>
                    <th>Spoken (0–10)</th>
                    <th>Written (0–10)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {#each (character.languages ?? []) as lang, i}
                    <tr>
                      <td>
                        <input
                          class="lang-name-input"
                          type="text"
                          placeholder="Language name"
                          value={lang.name}
                          on:input={(e) => setLanguageProp(i, "name", e.target.value)}
                        />
                      </td>
                      <td class="lang-grade-cell">
                        <select value={lang.spoken} on:change={(e) => setLanguageProp(i, "spoken", Number(e.target.value))}>
                          {#each Array.from({length: 11}, (_, n) => n) as grade}
                            <option value={grade} selected={lang.spoken === grade}>{grade}</option>
                          {/each}
                        </select>
                      </td>
                      <td class="lang-grade-cell">
                        <select value={lang.written} on:change={(e) => setLanguageProp(i, "written", Number(e.target.value))}>
                          {#each Array.from({length: 11}, (_, n) => n) as grade}
                            <option value={grade} selected={lang.written === grade}>{grade}</option>
                          {/each}
                        </select>
                      </td>
                      <td>
                        <button class="lang-remove-btn" aria-label="Remove language" on:click={() => removeLanguage(i)}>×</button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </section>

          {#if selectedSpellRows().length > 0}
            <section class="sheet-section">
              <h2 class="sheet-section-title">Spell Lists <span class="sheet-section-count">{selectedSpellLists.filter((spellList) => knownSpellsForList(spellList).length > 0).length} lists / {selectedSpellRows().length} spells</span></h2>
              <div class="sheet-spell-lists">
                {#each selectedSpellLists as spellList}
                  {@const knownSpells = knownSpellsForList(spellList)}
                  {#if knownSpells.length > 0}
                    <div class="sheet-spell-list">
                      <h3>{spellList.name}</h3>
                      <small>{spellList.realm} / {spellList.listType}</small>
                      <ol>
                        {#each knownSpells as spell}
                          <li><span>{spell.level}</span><b>{spell.name}</b><small>{spell.range || "-"} / {spell.type || "-"}</small></li>
                        {/each}
                      </ol>
                    </div>
                  {/if}
                {/each}
              </div>
            </section>
          {/if}

          {#if activeDirectedSpellRows().length > 0}
            <section class="sheet-section">
              <h2 class="sheet-section-title">Directed Spells</h2>
              <table class="sheet-skill-table sheet-directed-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Stats</th>
                    <th>Dev Cost</th>
                    <th>Ranks</th>
                    <th>Stat</th>
                    <th>Prof</th>
                    <th>Spec</th>
                    <th>Item</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {#each activeDirectedSpellRows() as category}
                    {@const entry = directedSpellEntry(category)}
                    <tr>
                      <td class="sheet-skill-name">{directedSpellCategoryLabel(category) || category}</td>
                      <td class="sheet-skill-num">Ag/SD/Ag</td>
                      <td class="sheet-skill-num">{directedSpellDevCost()}</td>
                      <td class="sheet-skill-num">{entry.ranks ?? 0}</td>
                      <td class="sheet-skill-num">{formatBonus(directedSpellStatBonus())}</td>
                      <td class="sheet-skill-num">{formatBonus(directedSpellProfBonus())}</td>
                      <td class="sheet-skill-num">{formatBonus(Number(entry.spec ?? 0))}</td>
                      <td class="sheet-skill-num">{formatBonus(Number(entry.item ?? 0))}</td>
                      <td class="sheet-skill-num"><b>{formatBonus(directedSpellTotal(category))}</b></td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </section>
          {/if}

          {#if summarySkillEntries().length > 0}
            <section class="sheet-section">
              <h2 class="sheet-section-title">Skills</h2>
              <table class="sheet-skill-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Ranks</th>
                    <th>Stats</th>
                    <th>Pair Bonus</th>
                    <th>Cat Bonus</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {#each summarySkillEntries() as [skillName, ranks]}
                    {@const rowSkill = skillByName(skillName)}
                    {@const level = skillLevel(skillName)}
                    <tr>
                      <td class="sheet-skill-name">{skillName}</td>
                      <td class="sheet-skill-cat">{rowSkill?.category ?? '—'}</td>
                      <td><span class="skill-badge skill-badge--{level.toLowerCase()}">{level}</span></td>
                      <td class="sheet-skill-num">{ranks}</td>
                      <td class="sheet-skill-num">{rowSkill?.statPair ?? '-'}</td>
                      <td class="sheet-skill-num">{formatBonus(statPairBonus(rowSkill?.statPair))}</td>
                      <td class="sheet-skill-num">{formatBonus(professionCategoryBonus(rowSkill))}</td>
                      <td class="sheet-skill-num"><b>{formatBonus(skillTotalBonus(rowSkill))}</b></td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </section>
          {/if}

          {#if selectedTalents.length > 0 || selectedPackages.length > 0}
            <div class="sheet-lower-grid">
              {#if selectedTalents.length > 0}
                <section class="sheet-section">
                  <h2 class="sheet-section-title">Talents <span class="sheet-section-count">{selectedTalents.length}</span></h2>
                  <ul class="sheet-list sheet-list--details">
                    {#each selectedTalents as talent}
                      <li>
                        <span>{talent.name}</span>
                        <small>{talent.rulesSummary || talent.group || talent.category}</small>
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}
              {#if selectedPackages.length > 0}
                <section class="sheet-section">
                  <h2 class="sheet-section-title">Training Packages <span class="sheet-section-count">{selectedPackages.length} · {totalPackageCost} pts</span></h2>
                  <ul class="sheet-list">
                    {#each selectedPackages as pkg}
                      <li><span>{pkg.name}</span><small>{pkg.group}</small></li>
                    {/each}
                  </ul>
                </section>
              {/if}
            </div>
          {/if}

          {#if selectedCustomRules.length}
            <section class="sheet-section">
              <h2 class="sheet-section-title">Custom Rules</h2>
              <div class="rule-tabs rule-tabs--sheet" role="tablist" aria-label="Summary custom rules">
                {#each selectedCustomRules as rule}
                  <button
                    class="rule-tab"
                    class:active={activeCustomRuleId === rule.id}
                    role="tab"
                    aria-selected={activeCustomRuleId === rule.id}
                    on:click={() => (activeCustomRuleId = rule.id)}
                  >
                    {rule.name}
                  </button>
                {/each}
              </div>
              <div class="sheet-rule-stack">
                {#each selectedCustomRules.filter((rule) => rule.id === activeCustomRuleId) as rule}
                  <article class="sheet-rule">
                    <h3>{rule.name}</h3>
                    <small>Player: {rule.player}</small>
                    <p>{rule.description}</p>
                    {#if rule.effects?.length}
                      <ul class="rule-effects">
                        {#each rule.effects as effect}
                          <li>{effect}</li>
                        {/each}
                      </ul>
                    {/if}
                    {#if rule.crystals?.length}
                      <div class="rules-table-wrap">
                        <table class="rules-table rules-table--sheet">
                          <thead>
                            <tr>
                              <th>Crystal / Stone</th>
                              <th>Type</th>
                              <th>Growth Exposure</th>
                              <th>Capacity</th>
                              <th>Use</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {#each rule.crystals as crystal}
                              <tr>
                                <td><b>{crystal.name}</b></td>
                                <td><span class="rule-type rule-type--{crystal.type.toLowerCase().replaceAll(' ', '-')}">{crystal.type}</span></td>
                                <td>{crystal.exposure}</td>
                                <td>{crystal.capacity}</td>
                                <td>{crystal.use}</td>
                                <td>{crystal.value}</td>
                              </tr>
                            {/each}
                          </tbody>
                        </table>
                      </div>
                    {/if}
                  </article>
                {/each}
              </div>
            </section>
          {/if}
          {/if}

        </div>
      </div>
    {/if}

    {#if activeTab !== "Summary"}
      <div class="wizard-nav">
        <button class="wizard-nav-btn" on:click={prevTab} disabled={tabs.indexOf(activeTab) === 0}>← Back</button>
        <span class="wizard-nav-step">{tabs.indexOf(activeTab) + 1} / {tabs.length} - {activeTab}</span>
        <button class="wizard-nav-btn wizard-nav-btn--next" on:click={nextTab}>Next →</button>
      </div>
    {/if}
  </section>

  {#if raceModal}
    <div class="modal-backdrop" role="presentation" on:click|self={closeRaceModal}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="race-modal-title">
        <header>
          <div>
            <p>Race Details</p>
            <h1 id="race-modal-title">{raceModal.name}</h1>
          </div>
          <button class="icon-button" aria-label="Close race details" on:click={closeRaceModal}>X</button>
        </header>

        {#if raceImage(raceModal)}
          <img class="race-portrait" src={raceImage(raceModal)} alt={`${raceModal.name} example portrait`} />
        {/if}

        <p>{raceModal.summary}</p>

        <div class="modal-facts">
          <span><b>Background options</b>{raceModal.backgroundOptions || "?"}</span>
          <span><b>Base Movement Rate</b>{raceModal.baseRate || "?"}</span>
          <span><b>Source</b>{raceModal.sourcePage ? `${raceModal.source}, p. ${raceModal.sourcePage}` : raceModal.source || "Unknown"}</span>
        </div>

        {#if raceStats(raceModal).length}
          <section>
            <h2>Stat Modifiers</h2>
            <table>
              <thead>
                <tr>
                  {#each raceStats(raceModal) as [stat]}<th>{stat}</th>{/each}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {#each raceStats(raceModal) as [, value]}<td>{value || "-"}</td>{/each}
                </tr>
              </tbody>
            </table>
          </section>
        {/if}

        {#if raceModal.bodyDevelopment?.length}
          <section>
            <h2>Body Development</h2>
            <div class="bd-tiers">
              {#each raceModal.bodyDevelopment as tier, i}
                <div class="bd-tier">
                  <span class="bd-range">Ranks {tier.range}</span>
                  <span class="bd-cost">{tier.xpCost} XP / rank</span>
                </div>
                {#if i < raceModal.bodyDevelopment.length - 1}
                  <span class="bd-arrow">→</span>
                {/if}
              {/each}
            </div>
          </section>
        {/if}

        {#if raceModal.languages}
          <section>
            <h2>Languages</h2>
            <p>{raceModal.languages}</p>
          </section>
        {/if}

        {#if raceModal.notes}
          <section>
            <h2>Mechanical Notes</h2>
            <p class="preline">{raceModal.notes}</p>
          </section>
        {/if}
      </div>
    </div>
  {/if}

  {#if professionModal}
    <div class="modal-backdrop" role="presentation" on:click|self={closeProfessionModal}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="profession-modal-title">
        <header>
          <div>
            <p>Profession Details</p>
            <h1 id="profession-modal-title">{professionModal.name}</h1>
          </div>
          <button class="icon-button" aria-label="Close profession details" on:click={closeProfessionModal}>X</button>
        </header>

        <p>{professionModal.summary}</p>

        <div class="modal-facts">
          <span><b>Spell Use</b>{professionModal.spellUser || "None"}</span>
          <span><b>Realm</b>{professionModal.realm || "None"}{professionModal.secondaryRealm ? ` / ${professionModal.secondaryRealm}` : ""}</span>
          <span><b>Source</b>{professionModal.sourcePage ? `${professionModal.source}, p. ${professionModal.sourcePage}` : professionModal.source || "Unknown"}</span>
        </div>

        <div class="profession-modal-layout">
          <div class="profession-modal-main">
            {#if professionModal.primeStats}
              <section>
                <h2>Prime Stats</h2>
                <p>{professionModal.primeStats}</p>
              </section>
            {/if}

            {#if professionModal.professionBonuses?.length}
              <section>
                <h2>Profession Bonuses</h2>
                <table>
                  <thead>
                    <tr><th>Category / Area</th><th>Bonus</th></tr>
                  </thead>
                  <tbody>
                    {#each professionModal.professionBonuses as bonus}
                      <tr>
                        <td>
                          <button
                            class="modal-table-button"
                            class:active={professionInspector?.type === "skillCategory" && professionInspector.id === bonus.area}
                            on:click={() => inspectProfessionSkillCategory(bonus.area, bonus.bonus, "Bonus")}
                          >
                            {bonus.area}
                          </button>
                        </td>
                        <td>{bonus.bonus}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </section>
            {/if}

            <section>
              <h2>Skill Notes</h2>
              <div class="modal-note-grid">
                <span><b>Everyman</b>{professionModal.everymanSkills.length ? professionModal.everymanSkills.join(", ") : "None"}</span>
                <span><b>Occupational</b>{professionModal.occupationalSkills.length ? professionModal.occupationalSkills.join(", ") : "None"}</span>
                <span><b>Restricted</b>{professionModal.restrictedSkills.length ? professionModal.restrictedSkills.join(", ") : "None"}</span>
              </div>
            </section>

            {#if professionModal.chooseSpellGroups?.length}
              <section>
                <h2>Spell Choices</h2>
                <div class="modal-choice-groups">
                  {#each professionModal.chooseSpellGroups as group}
                    <div>
                      <h3>{group.name}</h3>
                      <div class="modal-choice-list">
                        {#each group.lists as list}
                          <button
                            class:active={professionInspector?.type === "spellList" && professionInspector.id === list.id}
                            on:click={() => inspectProfessionSpellList(list.id, group.name)}
                          >
                            {list.name}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </section>
            {/if}

            {#if professionModal.skillCosts?.length}
              <section>
                <h2>Skill Categories</h2>
                <div class="modal-category-list">
                  {#each professionModal.skillCosts as skill}
                    <button
                      class:active={professionInspector?.type === "skillCategory" && professionInspector.id === skill.category}
                      on:click={() => inspectProfessionSkillCategory(skill.category, skill.cost, "Cost")}
                    >
                      <span>{skill.category}</span><b>{skill.cost}</b>
                    </button>
                  {/each}
                </div>
              </section>
            {/if}

            {#if professionModal.skillTraining?.length}
              <section>
                <h2>Simplified Skill Training</h2>
                <div class="modal-category-list">
                  {#each professionModal.skillTraining as skill}
                    <button
                      class:active={professionInspector?.type === "skillCategory" && professionInspector.id === skill.category}
                      on:click={() => inspectProfessionSkillCategory(skill.category, skillTierLabel(skill.tier), "Training")}
                    >
                      <span>{skill.category}</span><b>{skillTierLabel(skill.tier)}</b>
                    </button>
                  {/each}
                </div>
              </section>
            {/if}
          </div>

          <aside class="profession-modal-inspector" aria-live="polite">
            {#if professionInspector?.type === "skillCategory"}
              <p>Skill Category</p>
              <h2>{professionInspector.title}</h2>
              <small>{professionInspector.subtitle}</small>
              {#if professionInspector.skills.length}
                <ul>
                  {#each professionInspector.skills as skill}
                    <li><b>{skill.name}</b><span>{skill.summary || skill.category}</span></li>
                  {/each}
                </ul>
              {:else}
                <p class="muted">No individual skills are listed for this category yet.</p>
              {/if}
            {:else if professionInspector?.type === "spellList"}
              <p>Spell List</p>
              <h2>{professionInspector.title}</h2>
              <small>{professionInspector.subtitle}</small>
              <p>{professionInspector.spellList.summary}</p>
              {#if professionInspector.spellList.spells.length}
                <div class="spell-table spell-table--modal">
                  <div class="spell-row header">
                    <span>Lvl</span><span>Spell</span><span>Range</span><span>Type</span><span>Description</span>
                  </div>
                  {#each professionInspector.spellList.spells as spell}
                    <div class="spell-row">
                      <span>{spell.level}</span>
                      <b>{spell.name}</b>
                      <span>{spell.range || "-"}</span>
                      <span>{spell.type || "-"}</span>
                      <span>{spell.description || "-"}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else}
              <p>Details</p>
              <h2>Select a skill category or spell list</h2>
              <small>The last item you click will appear here.</small>
            {/if}
          </aside>
        </div>
      </div>
    </div>
  {/if}
</main>
{/if}
