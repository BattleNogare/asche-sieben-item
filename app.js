const SUPABASE_URL = "https://nnwmjwprfofihhbutcff.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ud21qd3ByZm9maWhoYnV0Y2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTcyNzMsImV4cCI6MjA4ODk5MzI3M30.RM4EDjvjWN2R7IVfz-4GdhSIfQI4N0NescFshkHxWZ4";
const ALLOWED_PROFILE_ID = "b934eac7-aae5-4ec2-abb7-d67d7dbdabad";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  session: null,
  user: null,
  profile: null,

  items: [],
  equipSlotItemTypes: [],
  affixDefinitions: [],
  affixAllowedByType: new Map(),
  affixSearchPoolByType: new Map(),
  itemTypeToSlot: new Map(),
  itemRarityRules: [],
  rarityRuleMap: new Map(),

  editCurrentItem: null
};

const ITEM_STRUCTURE = {
  "Waffen": {
    "Einhand": [
      { label: "Axt", item_type: "axe_1h" },
      { label: "Dolch", item_type: "dagger" },
      { label: "Streitkolben", item_type: "mace_1h" },
      { label: "Speer", item_type: "spear" },
      { label: "Schwert", item_type: "sword_1h" },
      { label: "Zeremonienmesser (nur für Scion)", item_type: "ceremonial_knife" },
      { label: "Faustwaffe (nur für Rogue)", item_type: "fist_weapon" },
      { label: "Flegel (nur für Crusader)", item_type: "flail_1h" },
      { label: "Mächtige Waffe (nur für Berserker)", item_type: "mighty_weapon_1h" },
      { label: "Sense (nur für Necromancer)", item_type: "scythe_1h" }
    ],
    "Zweihand": [
      { label: "Streitkolben", item_type: "mace_2h" },
      { label: "Stangenwaffe", item_type: "polearm" },
      { label: "Stab", item_type: "staff" },
      { label: "Schwert", item_type: "sword_2h" },
      { label: "Flegel (nur für Crusader)", item_type: "flail_2h" },
      { label: "Mächtige Waffe (nur für Berserker)", item_type: "mighty_weapon_2h" },
      { label: "Sense (nur für Necromancer)", item_type: "scythe_2h" }
    ],
    "Distanzwaffen": [
      { label: "Bogen", item_type: "bow" },
      { label: "Armbrust", item_type: "crossbow" },
      { label: "Handarmbrust (nur für Ranger)", item_type: "hand_crossbow" },
      { label: "Zauberstab (nur für Mage)", item_type: "wand" }
    ]
  },
  "Rüstung": {
    "Head": [
      { label: "Helm", item_type: "helmet" },
      { label: "Kraftstein (nur für Necromancer)", item_type: "soulstone" },
      { label: "Maske (nur für Rogue)", item_type: "mask" },
      { label: "Hut (nur für Mage)", item_type: "hat" }
    ],
    "Shoulders": [
      { label: "Schulterpanzer", item_type: "shoulder_armor" }
    ],
    "Chest": [
      { label: "Brustrüstung", item_type: "chest_armor" },
      { label: "Umhang", item_type: "cloak" }
    ],
    "Sleeve": [
      { label: "Armschiene", item_type: "bracer" }
    ],
    "Hand": [
      { label: "Handschuhe", item_type: "gloves" }
    ],
    "Belt": [
      { label: "Gürtel", item_type: "belt" },
      { label: "Mächtiger Gürtel (nur für Berserker)", item_type: "mighty_belt" }
    ],
    "Legs": [
      { label: "Hose", item_type: "pants" }
    ],
    "Feet": [
      { label: "Stiefel", item_type: "boots" }
    ]
  },
  "Schmuck": {
    "Amulett": [
      { label: "Amulett", item_type: "amulet" }
    ],
    "Ring": [
      { label: "Ring", item_type: "ring" }
    ]
  },
  "Weapon Off": {
    "Schild": [
      { label: "Schild", item_type: "shield" }
    ],
    "Kreuzritterschild": [
      { label: "Kreuzritterschild (nur für Crusader)", item_type: "crusader_shield" }
    ],
    "Kugel": [
      { label: "Kugel (nur für Mage)", item_type: "orb" }
    ],
    "Köcher": [
      { label: "Köcher (nur für Ranger)", item_type: "quiver" }
    ],
    "Buch": [
      { label: "Buch (nur für Necromancer)", item_type: "book" }
    ]
  },
  "Backpack": {
    "Rückenslot": [
      { label: "Rückenslot", item_type: "backpack" }
    ]
  },
  "Artifact": {
    "Artefakt": [
      { label: "Artefakt", item_type: "artifact" }
    ]
  },
  "Begleiter-Special": {
    "Fokus": [
      { label: "Fokus", item_type: "companion_focus" }
    ],
    "Marke": [
      { label: "Marke", item_type: "companion_mark" }
    ],
    "Relikt": [
      { label: "Relikt", item_type: "companion_relic" }
    ]
  }
};

const CANONICAL_AFFIX_CODES = new Set([
  "mainstat_strength_primary",
  "mainstat_dexterity_primary",
  "mainstat_intelligence_primary",
  "vitality_primary",

  "flat_damage_primary",
  "damage_percent_primary",
  "attack_speed_primary",
  "crit_chance_primary",
  "crit_damage_primary",
  "cooldown_reduction_primary",
  "resource_cost_reduction_primary",
  "resource_regen_primary",
  "area_damage_primary",
  "elite_damage_primary",
  "life_on_hit_primary",
  "life_percent_primary",
  "life_per_second_primary",
  "armor_primary",
  "all_resistance_primary",
  "movement_speed_primary",
  "block_chance_primary",

  "socket_1_primary",
  "socket_2_primary",
  "socket_3_primary",

  "pickup_radius_1_2",
  "healing_globe_bonus",
  "resist_single_121_140",
  "resist_single_141_160",
  "resource_on_rage_spend",
  "life_after_kill_secondary",
  "max_resource_secondary",
  "ranged_damage_reduction_secondary",
  "melee_damage_reduction_secondary",
  "reduced_level_requirement_secondary",
  "bleed_secondary",
  "physical_resist_secondary",
  "lightning_resist_secondary",
  "fire_resist_secondary",
  "cold_resist_secondary",
  "arcane_resist_secondary",
  "poison_resist_secondary",
  "ignore_durability_loss_secondary",
  "experience_per_kill_secondary",
  "gold_find_secondary",
  "thorns_secondary",
  "cc_duration_reduction_secondary",
  "globe_potion_bonus_secondary",
  "on_hit_knockback_secondary",
  "on_hit_freeze_secondary",
  "on_hit_blind_secondary",
  "on_hit_chill_secondary",
  "on_hit_slow_secondary",
  "on_hit_immobilize_secondary",
  "on_hit_stun_secondary"
]);

function $(id) {
  return document.getElementById(id);
}

function idKey(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function showStatus(message, type = "info") {
  const box = $("statusBox");
  if (!box) return;
  box.textContent = message;
  box.className = `status ${type}`;
  box.classList.remove("hidden");
}

function clearStatus() {
  const box = $("statusBox");
  if (!box) return;
  box.textContent = "";
  box.className = "status info hidden";
}

function debounce(fn, wait = 180) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseNullableNumber(value, integer = false) {
  if (value === null || value === undefined || value === "") return null;
  const num = integer ? parseInt(value, 10) : parseFloat(value);
  return Number.isNaN(num) ? null : num;
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeForSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/intilligenz/g, "intelligenz")
    .replace(/geschiklichkeit/g, "geschicklichkeit")
    .replace(/kritischer trefferschaden/g, "krit trefferschaden")
    .replace(/kritische trefferchance/g, "krit trefferchance")
    .replace(/abklingzeitreduktion/g, "cooldown reduction")
    .replace(/abklingzeiten/g, "cooldown")
    .replace(/ressourcenkostenreduktion/g, "resource cost reduction")
    .replace(/ressourcenkosten/g, "resource cost")
    .replace(/angriffsgeschwindigkeit/g, "attack speed")
    .replace(/flaechenschaden/g, "area damage")
    .replace(/flächenschaden/g, "area damage")
    .replace(/leben pro treffer/g, "life on hit")
    .replace(/leben pro sekunde/g, "life per second")
    .replace(/leben in prozent/g, "life percent")
    .replace(/leben in %/g, "life percent")
    .replace(/bewegungsgeschwindigkeit/g, "movement speed")
    .replace(/widerstand gegen alle schadensarten/g, "all resistance")
    .replace(/alle widerstaende/g, "all resistance")
    .replace(/alle widerstände/g, "all resistance")
    .replace(/einzelwiderstand/g, "single resistance")
    .replace(/widerstand/g, "resistance")
    .replace(/goldfund/g, "gold find")
    .replace(/goldaufnahme reichweite/g, "pickup radius")
    .replace(/goldaufnahme-reichweite/g, "pickup radius")
    .replace(/aufnahmeradius/g, "pickup radius")
    .replace(/kontrollverlustdauer/g, "cc reduction")
    .replace(/kontrollverlusteffekte/g, "cc reduction")
    .replace(/fernkampfschaden reduziert/g, "ranged damage reduction")
    .replace(/nahkampfschaden reduziert/g, "melee damage reduction")
    .replace(/bonus erfahrung/g, "bonus experience")
    .replace(/erfahrung pro kill/g, "bonus experience")
    .replace(/dornenschaden/g, "thorns")
    .replace(/sockel/g, "socket")
    .replace(/r\u00fcstung/g, "armor")
    .replace(/ruestung/g, "armor")
    .replace(/blockchance/g, "block chance")
    .replace(/staerke/g, "strength")
    .replace(/stärke/g, "strength")
    .replace(/geschicklichkeit/g, "dexterity")
    .replace(/intelligenz/g, "intelligence")
    .replace(/vitalitaet/g, "vitality")
    .replace(/vitalität/g, "vitality")
    .replace(/schaden/g, "damage")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  a = normalizeForSearch(a);
  b = normalizeForSearch(b);

  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function isCanonicalAffix(def) {
  if (!def) return false;
  return CANONICAL_AFFIX_CODES.has(String(def.affix_code || ""));
}

function getAffixDisplayLabel(def) {
  if (!def) return "";

  const code = String(def.affix_code || "");
  if (code === "socket_1_primary") return "(1) Sockel";
  if (code === "socket_2_primary") return "(2) Sockel";
  if (code === "socket_3_primary") return "(3) Sockel";

  return String(def.description_template || def.affix_code || "").trim();
}

function fuzzyScoreAffix(def, query) {
  const q = normalizeForSearch(query);
  if (!q) return 0;

  const code = normalizeForSearch(def.affix_code || "");
  const stat = normalizeForSearch(def.stat_name || "");
  const desc = normalizeForSearch(def.description_template || "");
  const category = normalizeForSearch(def.affix_category || "");

  let score = 0;

  if (desc === q) score += 2000;
  if (stat === q) score += 1800;
  if (code === q) score += 1500;

  if (desc.includes(q)) score += 1000;
  if (stat.includes(q)) score += 900;
  if (code.includes(q)) score += 700;
  if (category.includes(q)) score += 200;

  const qTokens = q.split(" ").filter(Boolean);
  for (const token of qTokens) {
    if (desc.includes(token)) score += 180;
    if (stat.includes(token)) score += 150;
    if (code.includes(token)) score += 130;
    if (category.includes(token)) score += 30;
  }

  const descDistance = levenshtein(q, desc);
  const statDistance = levenshtein(q, stat);
  const codeDistance = levenshtein(q, code);

  score += Math.max(0, 220 - descDistance * 8);
  score += Math.max(0, 170 - statDistance * 10);
  score += Math.max(0, 120 - codeDistance * 8);

  return score;
}

function formatPreviewNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function buildPreviewRarityClass(rarity) {
  if (!rarity) return "rarity-normal";
  if (["legendary", "unique", "unreal"].includes(rarity)) return "rarity-legendary";
  if (rarity === "rare") return "rarity-rare";
  if (rarity === "magic") return "rarity-magic";
  return "rarity-normal";
}

function buildRarityLabelFallback(rarity, itemType) {
  const prefix = {
    normal: "",
    magic: "Magischer",
    rare: "Seltener",
    legendary: "Legendärer",
    unique: "Einzigartiger",
    unreal: "Unwirklicher"
  }[rarity] || "";

  const typeMap = {
    sword_1h: "Schwert",
    sword_2h: "Zweihandschwert",
    axe_1h: "Axt",
    dagger: "Dolch",
    mace_1h: "Streitkolben",
    mace_2h: "Zweihand-Streitkolben",
    spear: "Speer",
    polearm: "Stangenwaffe",
    staff: "Stab",
    bow: "Bogen",
    crossbow: "Armbrust",
    hand_crossbow: "Handarmbrust",
    wand: "Zauberstab",
    shield: "Schild",
    crusader_shield: "Kreuzritterschild",
    orb: "Kugel",
    quiver: "Köcher",
    book: "Buch",
    helmet: "Helm",
    soulstone: "Kraftstein",
    mask: "Maske",
    hat: "Hut",
    shoulder_armor: "Schulterpanzer",
    chest_armor: "Brustrüstung",
    cloak: "Umhang",
    bracer: "Armschiene",
    gloves: "Handschuhe",
    belt: "Gürtel",
    mighty_belt: "Mächtiger Gürtel",
    pants: "Hose",
    boots: "Stiefel",
    amulet: "Amulett",
    ring: "Ring",
    backpack: "Rückenslot",
    artifact: "Artefakt",
    companion_focus: "Fokus",
    companion_mark: "Marke",
    companion_relic: "Relikt"
  };

  const label = typeMap[itemType] || itemType || "Gegenstand";
  return prefix ? `${prefix} ${label}` : label;
}

function inferTooltipArchetype(itemType, equipSlot, family) {
  if (family === "Waffen") return "weapon";
  if (family === "Rüstung") return "armor";
  if (family === "Schmuck") return "jewelry";
  if (equipSlot === "weapon_off") return "offhand";
  if (itemType === "backpack") return "backpack";
  if (itemType === "artifact") return "artifact";
  return "";
}

function isAllowedUser() {
  return state.user?.id === ALLOWED_PROFILE_ID || state.profile?.id === ALLOWED_PROFILE_ID;
}

function getFamilyOfItemType(itemType) {
  for (const [family, subMap] of Object.entries(ITEM_STRUCTURE)) {
    for (const [subfamily, entries] of Object.entries(subMap)) {
      if (entries.some(e => e.item_type === itemType)) {
        return { family, subfamily };
      }
    }
  }
  return { family: "", subfamily: "" };
}

async function generateUniqueItemCode(displayName, itemType, existingItemId = null) {
  const base = `${slugify(itemType)}_${slugify(displayName)}`.replace(/^_+|_+$/g, "");
  let code = base || `item_${Date.now()}`;

  let tries = 0;
  while (tries < 100) {
    let query = supabaseClient
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("item_code", code);

    if (existingItemId) query = query.neq("id", existingItemId);

    const { count, error } = await query;
    if (error) throw error;
    if (!count) return code;

    tries += 1;
    code = `${base}_${tries + 1}`;
  }

  return `${base}_${Date.now()}`;
}

async function getSessionAndProfile() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;

  state.session = sessionData.session;
  state.user = sessionData.session?.user || null;

  if (!state.user) {
    state.profile = null;
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  state.profile = profile || null;
}

function pushAffixSearchEntry(itemType, entry) {
  if (!itemType) return;
  if (!state.affixSearchPoolByType.has(itemType)) {
    state.affixSearchPoolByType.set(itemType, []);
  }
  state.affixSearchPoolByType.get(itemType).push(entry);
}

function getAllKnownItemTypes() {
  const allKnownItemTypes = new Set();

  Object.values(ITEM_STRUCTURE).forEach(subMap => {
    Object.values(subMap).forEach(entries => {
      entries.forEach(entry => {
        if (entry?.item_type) allKnownItemTypes.add(entry.item_type);
      });
    });
  });

  state.equipSlotItemTypes.forEach(row => {
    if (row?.item_type) allKnownItemTypes.add(row.item_type);
  });

  state.items.forEach(item => {
    if (item?.item_type) allKnownItemTypes.add(item.item_type);
  });

  return Array.from(allKnownItemTypes);
}

function buildAffixSearchPools() {
  state.affixSearchPoolByType = new Map();

  const allKnownItemTypes = getAllKnownItemTypes();

  allKnownItemTypes.forEach(itemType => {
    const allowedSet = state.affixAllowedByType.get(itemType) || new Set();

    state.affixDefinitions.forEach(def => {
      if (!isCanonicalAffix(def)) return;
      const defId = idKey(def.id);
      if (!allowedSet.has(defId)) return;

      pushAffixSearchEntry(itemType, {
        source: "affix_definitions",
        source_id: defId,
        affix_code: def.affix_code,
        affix_category: def.affix_category,
        stat_name: def.stat_name,
        mod_type: def.mod_type,
        value_min: def.value_min,
        value_max: def.value_max,
        value2_min: def.value2_min,
        value2_max: def.value2_max,
        description_template: def.description_template,
        sort_order: def.sort_order || 9999,
        rolls_socket_count: !!def.rolls_socket_count,
        socket_count_min: def.socket_count_min,
        socket_count_max: def.socket_count_max
      });
    });
  });

  for (const [itemType, rows] of state.affixSearchPoolByType.entries()) {
    const dedupe = new Map();

    rows.forEach(row => {
      const key = [
        row.affix_code,
        row.affix_category,
        row.stat_name,
        row.mod_type,
        row.value_min ?? "",
        row.value_max ?? "",
        row.value2_min ?? "",
        row.value2_max ?? "",
        row.socket_count_min ?? "",
        row.socket_count_max ?? ""
      ].join("|");

      if (!dedupe.has(key)) {
        dedupe.set(key, row);
      }
    });

    state.affixSearchPoolByType.set(itemType, Array.from(dedupe.values()));
  }

  console.log("AffixDefinitions count:", state.affixDefinitions.length);
  console.log("Allowed item types:", [...state.affixAllowedByType.keys()].length);
  console.log("Allowed sword_1h IDs:", state.affixAllowedByType.get("sword_1h"));
  console.log("First affix def IDs:", state.affixDefinitions.slice(0, 5).map(x => ({
    raw: x.id,
    key: idKey(x.id),
    code: x.affix_code
  })));

  console.log("Affix-Pool gebaut:");
  for (const [itemType, rows] of state.affixSearchPoolByType.entries()) {
    const bySource = rows.reduce((acc, row) => {
      acc[row.source] = (acc[row.source] || 0) + 1;
      return acc;
    }, {});
    console.log(itemType, rows.length, bySource);
  }
}

async function loadReferenceData() {
  const [
    equipSlotItemTypesRes,
    affixesRes,
    rarityRulesRes,
    allowedRowsRes
  ] = await Promise.all([
    supabaseClient.from("equip_slot_item_types").select("*").eq("is_enabled", true).order("sort_order"),
    supabaseClient.from("affix_definitions").select("*").eq("is_enabled", true).order("sort_order"),
    supabaseClient.from("item_rarity_rules").select("*"),
    supabaseClient.from("affix_definition_item_types").select("affix_definition_id,item_type")
  ]);

  if (equipSlotItemTypesRes.error) throw equipSlotItemTypesRes.error;
  if (affixesRes.error) throw affixesRes.error;
  if (rarityRulesRes.error) throw rarityRulesRes.error;
  if (allowedRowsRes.error) throw allowedRowsRes.error;

  state.equipSlotItemTypes = equipSlotItemTypesRes.data || [];
  state.affixDefinitions = (affixesRes.data || []).filter(isCanonicalAffix);
  state.itemRarityRules = rarityRulesRes.data || [];

  state.itemTypeToSlot = new Map();
  state.equipSlotItemTypes.forEach(row => {
    state.itemTypeToSlot.set(row.item_type, row.equip_slot);
  });

  state.rarityRuleMap = new Map();
  state.itemRarityRules.forEach(rule => {
    state.rarityRuleMap.set(rule.rarity, rule);
  });

  const canonicalAffixIdSet = new Set(state.affixDefinitions.map(x => idKey(x.id)));

  state.affixAllowedByType = new Map();
  (allowedRowsRes.data || []).forEach(row => {
    const itemType = row.item_type;
    const affixId = idKey(row.affix_definition_id);

    if (!canonicalAffixIdSet.has(affixId)) return;

    if (!state.affixAllowedByType.has(itemType)) {
      state.affixAllowedByType.set(itemType, new Set());
    }
    state.affixAllowedByType.get(itemType).add(affixId);
  });

  buildAffixSearchPools();
  populateListTypeFilter();
  populateFamilySelectors("create");
  populateFamilySelectors("edit");
}

function populateListTypeFilter() {
  const types = getAllKnownItemTypes().sort((a, b) => a.localeCompare(b));

  const targets = [
    $("list_filter_item_type"),
    $("edit_filter_item_type")
  ].filter(Boolean);

  targets.forEach(select => {
    const previous = select.value || "";
    select.innerHTML = `<option value="">alle</option>`;

    types.forEach(type => {
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      select.appendChild(opt);
    });

    if (types.includes(previous)) {
      select.value = previous;
    }
  });
}

function populateFamilySelectors(prefix) {
  const familySelect = $(`${prefix}_item_family`);
  const subfamilySelect = $(`${prefix}_item_subfamily`);
  const typeSelect = $(`${prefix}_item_type`);
  if (!familySelect || !subfamilySelect || !typeSelect) return;

  familySelect.innerHTML = "";
  Object.keys(ITEM_STRUCTURE).forEach(family => {
    const opt = document.createElement("option");
    opt.value = family;
    opt.textContent = family;
    familySelect.appendChild(opt);
  });

  function fillSubfamilies() {
    const family = familySelect.value;
    subfamilySelect.innerHTML = "";
    Object.keys(ITEM_STRUCTURE[family] || {}).forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub;
      opt.textContent = sub;
      subfamilySelect.appendChild(opt);
    });
    fillTypes();
  }

  function fillTypes() {
    const family = familySelect.value;
    const sub = subfamilySelect.value;
    typeSelect.innerHTML = "";

    const entries = ITEM_STRUCTURE[family]?.[sub] || [];
    entries.forEach(entry => {
      const opt = document.createElement("option");
      opt.value = entry.item_type;
      opt.textContent = entry.label;
      typeSelect.appendChild(opt);
    });

    if (prefix === "create") {
      refreshCreateDerivedFields();
    } else {
      refreshEditDerivedFields();
    }
  }

  familySelect.onchange = fillSubfamilies;
  subfamilySelect.onchange = fillTypes;
  typeSelect.onchange = prefix === "create" ? refreshCreateDerivedFields : refreshEditDerivedFields;

  fillSubfamilies();
}

function getSelectedFamily(prefix) {
  return $(`${prefix}_item_family`)?.value || "";
}

function getSelectedItemType(prefix) {
  return $(`${prefix}_item_type`)?.value || "";
}

function getAllowedAffixesForItemType(itemType, category = null) {
  const pool = state.affixSearchPoolByType.get(itemType) || [];
  return pool.filter(def => {
    if (category && def.affix_category !== category) return false;
    return true;
  });
}

function rankAffixesForItemType(itemType, category = null, search = "") {
  return getAllowedAffixesForItemType(itemType, category)
    .map(def => ({
      ...def,
      _score: fuzzyScoreAffix(def, search)
    }))
    .sort((a, b) => {
      if (search.trim() && b._score !== a._score) {
        return b._score - a._score;
      }
      if ((a.sort_order || 0) !== (b.sort_order || 0)) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return String(a.affix_code || "").localeCompare(String(b.affix_code || ""));
    });
}

function getRarityRule(rarity) {
  return state.rarityRuleMap.get(rarity) || null;
}

function applyRarityDefaults(prefix) {
  const rarityEl = $(`${prefix}_rarity`);
  if (!rarityEl) return;

  const rarity = rarityEl.value;
  const rule = getRarityRule(rarity);
  if (!rule) return;

  const pMin = rule.primary_min ?? rule.random_primary_min ?? rule.min_primary_affixes ?? rule.primary_affixes_min ?? 0;
  const pMax = rule.primary_max ?? rule.random_primary_max ?? rule.max_primary_affixes ?? rule.primary_affixes_max ?? 0;
  const sMin = rule.secondary_min ?? rule.random_secondary_min ?? rule.min_secondary_affixes ?? rule.secondary_affixes_min ?? 0;
  const sMax = rule.secondary_max ?? rule.random_secondary_max ?? rule.max_secondary_affixes ?? rule.secondary_affixes_max ?? 0;

  if ($(`${prefix}_random_primary_min`)) $(`${prefix}_random_primary_min`).value = pMin;
  if ($(`${prefix}_random_primary_max`)) $(`${prefix}_random_primary_max`).value = pMax;
  if ($(`${prefix}_random_secondary_min`)) $(`${prefix}_random_secondary_min`).value = sMin;
  if ($(`${prefix}_random_secondary_max`)) $(`${prefix}_random_secondary_max`).value = sMax;
}

function createTopHitsHtml() {
  return `<div class="affix-top-hits" style="display:flex;flex-direction:column;gap:6px;"></div>`;
}

function createAffixModuleHtml(prefix, moduleId, data = null) {
  const always = data?.is_always_present ? "checked" : "";

  return `
    <div class="module-box affix-module" data-module-id="${moduleId}">
      <div class="row">
        <div class="field col-3">
          <label>Typ</label>
          <select class="affix-module-kind">
            <option value="fixed" ${!data || data.kind === "fixed" ? "selected" : ""}>Fester Affix</option>
            <option value="random_fill" ${data?.kind === "random_fill" ? "selected" : ""}>Random-Fill Modul</option>
            <option value="choice_group" ${data?.kind === "choice_group" ? "selected" : ""}>Choice Group</option>
          </select>
        </div>
        <div class="field col-2">
          <label>Kategorie</label>
          <select class="affix-property-category">
            <option value="primary" ${data?.property_category === "secondary" ? "" : "selected"}>primary</option>
            <option value="secondary" ${data?.property_category === "secondary" ? "selected" : ""}>secondary</option>
          </select>
        </div>
        <div class="field col-2">
          <label>Immer vorhanden</label>
          <select class="affix-is-always-present">
            <option value="true" ${always ? "selected" : ""}>ja</option>
            <option value="false" ${!always ? "selected" : ""}>nein</option>
          </select>
        </div>
        <div class="field col-3">
          <label>Suche Affix</label>
          <input class="affix-search" type="text" placeholder="z.B. Krit, Intilligenz, Leben ..." />
        </div>
        <div class="field col-2">
          <label>&nbsp;</label>
          <button type="button" class="btn-remove-affix-module btn-danger btn-small">Modul löschen</button>
        </div>
      </div>

      <div class="module-fixed-block">
        <div class="row">
          <div class="field col-12">
            <label>Top Treffer</label>
            ${createTopHitsHtml()}
          </div>
        </div>

        <div class="row">
          <div class="field col-12">
            <label>Fallback-Auswahl</label>
            <select class="affix-select"></select>
          </div>
        </div>

        <div class="row">
          <div class="field col-3">
            <label>stat_name</label>
            <input class="fixed-stat-name" type="text" />
          </div>
          <div class="field col-3">
            <label>mod_type</label>
            <input class="fixed-mod-type" type="text" />
          </div>
          <div class="field col-3">
            <label>value_min</label>
            <input class="fixed-value-min" type="number" step="0.01" />
          </div>
          <div class="field col-3">
            <label>value_max</label>
            <input class="fixed-value-max" type="number" step="0.01" />
          </div>
        </div>

        <div class="row">
          <div class="field col-3">
            <label>value2_min</label>
            <input class="fixed-value2-min" type="number" step="0.01" />
          </div>
          <div class="field col-3">
            <label>value2_max</label>
            <input class="fixed-value2-max" type="number" step="0.01" />
          </div>
          <div class="field col-6">
            <label>description_template</label>
            <input class="fixed-desc-template" type="text" />
          </div>
        </div>
      </div>

      <div class="module-random-fill-block hidden">
        <div class="row">
          <div class="field col-4">
            <label>Beschreibung</label>
            <input class="random-fill-description" type="text" value="${escapeHtml(data?.display_label || "+1 zufällige magische Eigenschaft")}" />
          </div>
          <div class="field col-2">
            <label>Anzahl</label>
            <input class="random-fill-count" type="number" min="1" value="${data?.choose_count ?? 1}" />
          </div>
          <div class="field col-2">
            <label>Display Order</label>
            <input class="random-fill-order" type="number" min="1" value="${data?.display_order ?? 10}" />
          </div>
        </div>
      </div>

      <div class="module-choice-group-block hidden">
        <div class="row">
          <div class="field col-4">
            <label>Gruppen-Label</label>
            <input class="choice-group-label" type="text" value="${escapeHtml(data?.display_label || "Eine von X magischen Eigenschaften (variiert)")}" />
          </div>
          <div class="field col-2">
            <label>Choose Count</label>
            <input class="choice-group-choose-count" type="number" min="1" value="${data?.choose_count ?? 1}" />
          </div>
          <div class="field col-2">
            <label>Display Order</label>
            <input class="choice-group-order" type="number" min="1" value="${data?.display_order ?? 100}" />
          </div>
          <div class="field col-4">
            <label>&nbsp;</label>
            <button type="button" class="btn-add-choice-option btn-secondary btn-small">+ Option</button>
          </div>
        </div>
        <div class="choice-options-list"></div>
      </div>
    </div>
  `;
}

function createChoiceOptionHtml(data = null) {
  return `
    <div class="module-mini choice-option">
      <div class="row">
        <div class="field col-4">
          <label>Suche Affix</label>
          <input class="choice-option-search" type="text" placeholder="z.B. Krit, Intilligenz ..." />
        </div>
        <div class="field col-8">
          <label>Top Treffer</label>
          ${createTopHitsHtml()}
        </div>
      </div>

      <div class="row">
        <div class="field col-10">
          <label>Fallback-Auswahl</label>
          <select class="choice-option-affix-select"></select>
        </div>
        <div class="field col-2">
          <label>Weight</label>
          <input class="choice-option-weight" type="number" min="1" value="${data?.spawn_weight ?? 1}" />
        </div>
      </div>

      <div class="row">
        <div class="field col-3">
          <label>stat_name</label>
          <input class="choice-stat-name" type="text" />
        </div>
        <div class="field col-3">
          <label>mod_type</label>
          <input class="choice-mod-type" type="text" />
        </div>
        <div class="field col-3">
          <label>value_min</label>
          <input class="choice-value-min" type="number" step="0.01" />
        </div>
        <div class="field col-3">
          <label>value_max</label>
          <input class="choice-value-max" type="number" step="0.01" />
        </div>
      </div>

      <div class="row">
        <div class="field col-3">
          <label>value2_min</label>
          <input class="choice-value2-min" type="number" step="0.01" />
        </div>
        <div class="field col-3">
          <label>value2_max</label>
          <input class="choice-value2-max" type="number" step="0.01" />
        </div>
        <div class="field col-4">
          <label>description_template</label>
          <input class="choice-desc-template" type="text" />
        </div>
        <div class="field col-2">
          <label>&nbsp;</label>
          <button type="button" class="btn-remove-choice-option btn-danger btn-small">Option löschen</button>
        </div>
      </div>
    </div>
  `;
}

function renderTopHits(target, ranked, onPick) {
  if (!target) return;
  target.innerHTML = "";

  if (!ranked.length) {
    target.innerHTML = `<div class="small-note">Keine passenden Affixe gefunden.</div>`;
    return;
  }

  ranked.slice(0, 5).forEach(def => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary btn-small";
    btn.style.textAlign = "left";
    btn.style.whiteSpace = "normal";
    btn.textContent = `${getAffixDisplayLabel(def)} [${def.affix_code}]`;
    btn.title = `${def.affix_category || ""} | ${def.stat_name || ""} | ${def.mod_type || ""}`;
    btn.onclick = onPick.bind(null, def);
    target.appendChild(btn);
  });
}

function setAffixOverrideFields(root, def, prefix = "") {
  if (!root || !def) return;

  const minEl = root.querySelector(`.${prefix}value-min`);
  const maxEl = root.querySelector(`.${prefix}value-max`);
  const min2El = root.querySelector(`.${prefix}value2-min`);
  const max2El = root.querySelector(`.${prefix}value2-max`);
  const statEl = root.querySelector(`.${prefix}stat-name`);
  const modEl = root.querySelector(`.${prefix}mod-type`);
  const descEl = root.querySelector(`.${prefix}desc-template`);

  const resolvedMin = def.rolls_socket_count
    ? (def.socket_count_min ?? def.value_min ?? "")
    : (def.value_min ?? "");
  const resolvedMax = def.rolls_socket_count
    ? (def.socket_count_max ?? def.value_max ?? "")
    : (def.value_max ?? "");

  if (minEl) minEl.value = resolvedMin;
  if (maxEl) maxEl.value = resolvedMax;
  if (min2El) min2El.value = def.value2_min ?? "";
  if (max2El) max2El.value = def.value2_max ?? "";
  if (statEl) statEl.value = def.stat_name ?? "";
  if (modEl) modEl.value = def.mod_type ?? "";
  if (descEl) descEl.value = def.description_template ?? "";
}

function readAffixOverrideFields(root, prefix = "") {
  return {
    stat_name: root.querySelector(`.${prefix}stat-name`)?.value?.trim() || null,
    mod_type: root.querySelector(`.${prefix}mod-type`)?.value?.trim() || null,
    value_min: parseNullableNumber(root.querySelector(`.${prefix}value-min`)?.value, false),
    value_max: parseNullableNumber(root.querySelector(`.${prefix}value-max`)?.value, false),
    value2_min: parseNullableNumber(root.querySelector(`.${prefix}value2-min`)?.value, false),
    value2_max: parseNullableNumber(root.querySelector(`.${prefix}value2-max`)?.value, false),
    description_template: root.querySelector(`.${prefix}desc-template`)?.value?.trim() || ""
  };
}

function refreshSingleAffixModule(mod, itemType) {
  const kind = mod.querySelector(".affix-module-kind").value;
  const category = mod.querySelector(".affix-property-category").value;
  const search = mod.querySelector(".affix-search").value || "";

  const fixedBlock = mod.querySelector(".module-fixed-block");
  const randomFillBlock = mod.querySelector(".module-random-fill-block");
  const choiceBlock = mod.querySelector(".module-choice-group-block");

  fixedBlock.classList.toggle("hidden", kind !== "fixed");
  randomFillBlock.classList.toggle("hidden", kind !== "random_fill");
  choiceBlock.classList.toggle("hidden", kind !== "choice_group");

  const ranked = rankAffixesForItemType(itemType, category, search);

  const fixedSelect = mod.querySelector(".affix-select");
  if (fixedSelect) {
    const previous = fixedSelect.dataset.value || fixedSelect.value || "";
    fixedSelect.innerHTML = `<option value="">- bitte wählen -</option>`;

    ranked.slice(0, 200).forEach(def => {
      const opt = document.createElement("option");
      opt.value = `${def.source}:${idKey(def.source_id)}:${def.affix_category}:${def.affix_code}`;
      opt.textContent = `${def.affix_code} | ${getAffixDisplayLabel(def)}`;
      fixedSelect.appendChild(opt);
    });

    let selectedValue = previous;
    if (!selectedValue && ranked.length) {
      const d = ranked[0];
      selectedValue = `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}`;
    }

    fixedSelect.value = selectedValue;
    fixedSelect.dataset.value = selectedValue;

    renderTopHits(mod.querySelector(".affix-top-hits"), ranked, (def) => {
      const value = `${def.source}:${idKey(def.source_id)}:${def.affix_category}:${def.affix_code}`;
      fixedSelect.value = value;
      fixedSelect.dataset.value = value;

      const categorySelect = mod.querySelector(".affix-property-category");
      if (categorySelect && def.affix_category && categorySelect.value !== def.affix_category) {
        categorySelect.value = def.affix_category;
      }

      mod.dataset.fixedManualValues = "";
      setAffixOverrideFields(mod, def, "fixed-");
      refreshSingleAffixModule(mod, itemType);
    });

    const selectedDef = ranked.find(d => `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}` === String(selectedValue));
    if (selectedDef && !mod.dataset.fixedManualValues) {
      setAffixOverrideFields(mod, selectedDef, "fixed-");
    }
  }

  mod.querySelectorAll(".choice-option").forEach(optionEl => {
    const optionSearch = optionEl.querySelector(".choice-option-search")?.value || "";
    const optionRanked = rankAffixesForItemType(itemType, category, optionSearch);

    const select = optionEl.querySelector(".choice-option-affix-select");
    if (!select) return;

    const previous = select.dataset.value || select.value || "";
    select.innerHTML = `<option value="">- bitte wählen -</option>`;

    optionRanked.slice(0, 200).forEach(def => {
      const opt = document.createElement("option");
      opt.value = `${def.source}:${idKey(def.source_id)}:${def.affix_category}:${def.affix_code}`;
      opt.textContent = `${def.affix_code} | ${getAffixDisplayLabel(def)}`;
      select.appendChild(opt);
    });

    let selectedValue = previous;
    if (!selectedValue && optionRanked.length) {
      const d = optionRanked[0];
      selectedValue = `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}`;
    }

    select.value = selectedValue;
    select.dataset.value = selectedValue;

    renderTopHits(optionEl.querySelector(".affix-top-hits"), optionRanked, (def) => {
      const value = `${def.source}:${idKey(def.source_id)}:${def.affix_category}:${def.affix_code}`;
      select.value = value;
      select.dataset.value = value;
      optionEl.dataset.manualValues = "";
      setAffixOverrideFields(optionEl, def, "choice-");
    });

    const selectedDef = optionRanked.find(d => `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}` === String(selectedValue));
    if (selectedDef && !optionEl.dataset.manualValues) {
      setAffixOverrideFields(optionEl, selectedDef, "choice-");
    }
  });
}

function refreshAffixModuleSelects(container, itemType) {
  if (!container) return;
  container.querySelectorAll(".affix-module").forEach(mod => {
    refreshSingleAffixModule(mod, itemType);
  });
}

function bindAffixModuleEvents(container, prefix) {
  if (!container) return;

  container.querySelectorAll(".affix-module").forEach(mod => {
    mod.querySelector(".btn-remove-affix-module").onclick = () => {
      mod.remove();
      prefix === "create" ? updateCreatePreview() : updateEditPreview();
    };

    mod.querySelector(".affix-module-kind").onchange = () => {
      mod.dataset.fixedManualValues = "";
      refreshSingleAffixModule(mod, getSelectedItemType(prefix));
      prefix === "create" ? updateCreatePreview() : updateEditPreview();
    };

    mod.querySelector(".affix-property-category").onchange = () => {
      mod.dataset.fixedManualValues = "";
      refreshSingleAffixModule(mod, getSelectedItemType(prefix));
      prefix === "create" ? updateCreatePreview() : updateEditPreview();
    };

    mod.querySelector(".affix-search").oninput = () => {
      mod.dataset.fixedManualValues = "";
      refreshSingleAffixModule(mod, getSelectedItemType(prefix));
      prefix === "create" ? updateCreatePreview() : updateEditPreview();
    };

    const fixedSelect = mod.querySelector(".affix-select");
    if (fixedSelect) {
      fixedSelect.onchange = () => {
        fixedSelect.dataset.value = fixedSelect.value;
        const ranked = rankAffixesForItemType(
          getSelectedItemType(prefix),
          mod.querySelector(".affix-property-category").value,
          mod.querySelector(".affix-search").value || ""
        );
        const def = ranked.find(d => `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}` === String(fixedSelect.value));
        mod.dataset.fixedManualValues = "";
        if (def) setAffixOverrideFields(mod, def, "fixed-");
        prefix === "create" ? updateCreatePreview() : updateEditPreview();
      };
    }

    mod.querySelectorAll(".fixed-stat-name,.fixed-mod-type,.fixed-value-min,.fixed-value-max,.fixed-value2-min,.fixed-value2-max,.fixed-desc-template")
      .forEach(el => {
        el.oninput = () => {
          mod.dataset.fixedManualValues = "1";
          prefix === "create" ? updateCreatePreview() : updateEditPreview();
        };
        el.onchange = () => {
          mod.dataset.fixedManualValues = "1";
          prefix === "create" ? updateCreatePreview() : updateEditPreview();
        };
      });

    const btnAddChoice = mod.querySelector(".btn-add-choice-option");
    if (btnAddChoice) {
      btnAddChoice.onclick = () => {
        const list = mod.querySelector(".choice-options-list");
        list.insertAdjacentHTML("beforeend", createChoiceOptionHtml());
        bindAffixModuleEvents(container, prefix);
        refreshSingleAffixModule(mod, getSelectedItemType(prefix));
        prefix === "create" ? updateCreatePreview() : updateEditPreview();
      };
    }

    mod.querySelectorAll(".choice-option").forEach(optionEl => {
      const searchInput = optionEl.querySelector(".choice-option-search");
      const select = optionEl.querySelector(".choice-option-affix-select");
      const removeBtn = optionEl.querySelector(".btn-remove-choice-option");

      if (searchInput) {
        searchInput.oninput = () => {
          optionEl.dataset.manualValues = "";
          refreshSingleAffixModule(mod, getSelectedItemType(prefix));
          prefix === "create" ? updateCreatePreview() : updateEditPreview();
        };
      }

      if (select) {
        select.onchange = () => {
          select.dataset.value = select.value;
          const ranked = rankAffixesForItemType(
            getSelectedItemType(prefix),
            mod.querySelector(".affix-property-category").value,
            optionEl.querySelector(".choice-option-search").value || ""
          );
          const def = ranked.find(d => `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}` === String(select.value));
          optionEl.dataset.manualValues = "";
          if (def) setAffixOverrideFields(optionEl, def, "choice-");
          prefix === "create" ? updateCreatePreview() : updateEditPreview();
        };
      }

      optionEl.querySelectorAll(".choice-stat-name,.choice-mod-type,.choice-value-min,.choice-value-max,.choice-value2-min,.choice-value2-max,.choice-desc-template,.choice-option-weight")
        .forEach(el => {
          el.oninput = () => {
            optionEl.dataset.manualValues = "1";
            prefix === "create" ? updateCreatePreview() : updateEditPreview();
          };
          el.onchange = () => {
            optionEl.dataset.manualValues = "1";
            prefix === "create" ? updateCreatePreview() : updateEditPreview();
          };
        });

      if (removeBtn) {
        removeBtn.onclick = () => {
          optionEl.remove();
          prefix === "create" ? updateCreatePreview() : updateEditPreview();
        };
      }
    });

    mod.querySelectorAll(".random-fill-description,.random-fill-count,.random-fill-order,.choice-group-label,.choice-group-choose-count,.choice-group-order")
      .forEach(el => {
        el.oninput = () => prefix === "create" ? updateCreatePreview() : updateEditPreview();
        el.onchange = () => prefix === "create" ? updateCreatePreview() : updateEditPreview();
      });
  });

  refreshAffixModuleSelects(container, getSelectedItemType(prefix));
}

function refreshCreateDerivedFields() {
  const itemType = getSelectedItemType("create");
  const equipSlot = state.itemTypeToSlot.get(itemType) || "";
  if ($("create_equip_slot")) $("create_equip_slot").value = equipSlot;

  const family = getSelectedFamily("create");
  if ($("createWeaponBlock")) $("createWeaponBlock").classList.toggle("hidden", family !== "Waffen");
  if ($("createArmorBlock")) $("createArmorBlock").classList.toggle("hidden", family !== "Rüstung");

  refreshAffixModuleSelects($("createAffixModuleList"), itemType);
  refreshCreateItemCode();
  updateCreatePreview();
}

function refreshEditDerivedFields() {
  const itemType = getSelectedItemType("edit");
  const equipSlot = state.itemTypeToSlot.get(itemType) || "";
  if ($("edit_equip_slot")) $("edit_equip_slot").value = equipSlot;

  const family = getSelectedFamily("edit");
  if ($("editWeaponBlock")) $("editWeaponBlock").classList.toggle("hidden", family !== "Waffen");
  if ($("editArmorBlock")) $("editArmorBlock").classList.toggle("hidden", family !== "Rüstung");

  refreshAffixModuleSelects($("editAffixModuleList"), itemType);
  updateEditPreview();
}

async function refreshCreateItemCode() {
  const displayName = $("create_display_name")?.value?.trim() || "";
  const itemType = getSelectedItemType("create");
  const preview = $("create_item_code_preview");

  if (!preview) return;

  if (!displayName || !itemType) {
    preview.value = "";
    return;
  }

  const code = await generateUniqueItemCode(displayName, itemType);
  preview.value = code;
}

function buildDescriptionFromAffix(def) {
  if (!def) return "";
  let text = def.description_template || "";

  let value = def.value_max ?? def.value_min;
  let value2 = def.value2_max ?? def.value2_min;

  if (def.mod_type === "socket" || def.rolls_socket_count) {
    value = def.socket_count_max ?? def.socket_count_min ?? value;
  }

  text = text.replaceAll("{value}", value !== null && value !== undefined ? String(value) : "");
  text = text.replaceAll("{value2}", value2 !== null && value2 !== undefined ? String(value2) : "");
  return text.trim();
}

function collectAffixModules(prefix) {
  const modules = [];
  const root = $(`${prefix}AffixModuleList`);
  if (!root) return modules;

  root.querySelectorAll(".affix-module").forEach((mod, idx) => {
    const kind = mod.querySelector(".affix-module-kind").value;
    const property_category = mod.querySelector(".affix-property-category").value;
    const is_always_present = mod.querySelector(".affix-is-always-present").value === "true";

    if (kind === "fixed") {
      const selectValue = mod.querySelector(".affix-select").value;
      if (!selectValue) return;

      const ranked = rankAffixesForItemType(
        getSelectedItemType(prefix),
        property_category,
        mod.querySelector(".affix-search").value || ""
      );

      const def = ranked.find(d => `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}` === String(selectValue));
      if (!def) return;

      const override = readAffixOverrideFields(mod, "fixed-");

      modules.push({
        kind,
        property_category,
        is_always_present,
        affix_definition: {
          ...def,
          stat_name: override.stat_name || def.stat_name,
          mod_type: override.mod_type || def.mod_type,
          value_min: override.value_min,
          value_max: override.value_max,
          value2_min: override.value2_min,
          value2_max: override.value2_max,
          description_template: override.description_template || def.description_template
        },
        display_order: (idx + 1) * 10
      });
    }

    if (kind === "random_fill") {
      const count = parseNullableNumber(mod.querySelector(".random-fill-count").value, true) || 1;
      const displayLabel = mod.querySelector(".random-fill-description").value.trim() || `+${count} zufällige magische Eigenschaften`;
      const displayOrder = parseNullableNumber(mod.querySelector(".random-fill-order").value, true) || (idx + 1) * 10;

      modules.push({
        kind,
        property_category,
        choose_count: count,
        display_label: displayLabel,
        display_order: displayOrder
      });
    }

    if (kind === "choice_group") {
      const displayLabel = mod.querySelector(".choice-group-label").value.trim() || "Eine von X magischen Eigenschaften (variiert)";
      const chooseCount = parseNullableNumber(mod.querySelector(".choice-group-choose-count").value, true) || 1;
      const displayOrder = parseNullableNumber(mod.querySelector(".choice-group-order").value, true) || (idx + 1) * 10;

      const options = [];
      mod.querySelectorAll(".choice-option").forEach((optEl, optionIndex) => {
        const selectValue = optEl.querySelector(".choice-option-affix-select").value;
        if (!selectValue) return;

        const ranked = rankAffixesForItemType(
          getSelectedItemType(prefix),
          property_category,
          optEl.querySelector(".choice-option-search").value || ""
        );

        const def = ranked.find(d => `${d.source}:${idKey(d.source_id)}:${d.affix_category}:${d.affix_code}` === String(selectValue));
        if (!def) return;

        const override = readAffixOverrideFields(optEl, "choice-");

        options.push({
          affix_definition: {
            ...def,
            stat_name: override.stat_name || def.stat_name,
            mod_type: override.mod_type || def.mod_type,
            value_min: override.value_min,
            value_max: override.value_max,
            value2_min: override.value2_min,
            value2_max: override.value2_max,
            description_template: override.description_template || def.description_template
          },
          spawn_weight: parseNullableNumber(optEl.querySelector(".choice-option-weight").value, true) || 1,
          display_order: (optionIndex + 1) * 10
        });
      });

      if (!options.length) return;

      modules.push({
        kind,
        property_category,
        display_label: displayLabel,
        choose_count: chooseCount,
        display_order: displayOrder,
        options
      });
    }
  });

  return modules;
}

function buildPreviewHeaderLines(baseItem) {
  const archetype = baseItem.tooltip_archetype;

  if (archetype === "weapon") {
    const dmgMin = parseNullableNumber(baseItem.damage_min, true);
    const dmgMax = parseNullableNumber(baseItem.damage_max, true);
    const aps = parseNullableNumber(baseItem.attacks_per_second, false);

    if (dmgMin !== null && dmgMax !== null && aps !== null) {
      const dps = (((dmgMin + dmgMax) / 2) * aps);
      return [
        formatPreviewNumber(dps, 1),
        "Schaden pro Sekunde",
        `${formatPreviewNumber(dmgMin, 0)}-${formatPreviewNumber(dmgMax, 0)} Schaden`,
        `${formatPreviewNumber(aps, 2)} Angriffe pro Sekunde`
      ];
    }
  }

  if (archetype === "armor") {
    const armorMin = parseNullableNumber(baseItem.armor_min, true);
    const armorMax = parseNullableNumber(baseItem.armor_max, true);

    if (armorMin !== null && armorMax !== null) {
      return [`${formatPreviewNumber(armorMin, 0)} - ${formatPreviewNumber(armorMax, 0)}`, "Rüstung"];
    }

    const armorBase = parseNullableNumber(baseItem.armor_base, true);
    if (armorBase !== null) return [formatPreviewNumber(armorBase, 0), "Rüstung"];
  }

  if (baseItem.tooltip_archetype === "offhand") {
    const block = parseNullableNumber(baseItem.block_base, false);
    if (block !== null) {
      return [`${formatPreviewNumber(block, 1)}%`, "Blockchance"];
    }
  }

  return [];
}

function buildPreviewData(baseItem, modules, powerData) {
  const primaryLines = [];
  const secondaryLines = [];
  const powerLines = [];

  modules.forEach(mod => {
    if (mod.kind === "fixed" && mod.affix_definition) {
      const line = buildDescriptionFromAffix(mod.affix_definition);
      if (mod.property_category === "primary") primaryLines.push(line);
      if (mod.property_category === "secondary") secondaryLines.push(line);
    }

    if (mod.kind === "random_fill") {
      const line = mod.display_label;
      if (mod.property_category === "primary") primaryLines.push(line);
      if (mod.property_category === "secondary") secondaryLines.push(line);
    }

    if (mod.kind === "choice_group") {
      const bucket = mod.property_category === "secondary" ? secondaryLines : primaryLines;
      bucket.push(mod.display_label);
      mod.options.forEach(opt => {
        bucket.push(`• ${buildDescriptionFromAffix(opt.affix_definition)}`);
      });
    }
  });

  if (powerData?.enabled && powerData.description) {
    let line = powerData.description;
    if (line.includes("{value}")) {
      line = line.replaceAll("{value}", String(powerData.value_max ?? powerData.value_min ?? ""));
    } else if ((powerData.value_min ?? null) !== null || (powerData.value_max ?? null) !== null) {
      const a = powerData.value_min ?? "";
      const b = powerData.value_max ?? "";
      if (a !== "" && b !== "") line += ` [${a} - ${b}]`;
    }
    powerLines.push(line);
  }

  const footer = [];
  if (baseItem.binding_mode === "tradable") footer.push("Handelbar");
  if (baseItem.binding_mode === "account_bound") footer.push("Account Bound");
  if (baseItem.binding_mode === "bind_on_equip") footer.push("Bind on Equip");
  if (baseItem.binding_mode === "bind_on_pickup") footer.push("Bind on Pickup");
  if (baseItem.is_unique_equipped) footer.push("Unique Equipped");

  if (baseItem.source_type === "crafted" && baseItem.crafted_by) {
    const craftedName =
      baseItem.crafted_by === "blacksmith" ? "Schmied" :
      baseItem.crafted_by === "jeweler" ? "Juwelier" :
      baseItem.crafted_by;
    const tier = baseItem.crafted_tier ? ` (Stufe ${baseItem.crafted_tier})` : "";
    footer.push(`Hergestellt von: ${craftedName}${tier}`);
  }

  if (baseItem.level_requirement) footer.push(`Benötigte Stufe: ${baseItem.level_requirement}`);

  return {
    display_name: baseItem.display_name,
    rarity: baseItem.rarity,
    rarity_label: baseItem.rarity_label || buildRarityLabelFallback(baseItem.rarity, baseItem.item_type),
    item_type: baseItem.item_type,
    equip_slot: baseItem.equip_slot,
    tooltip_archetype: baseItem.tooltip_archetype,
    header_lines: buildPreviewHeaderLines(baseItem),
    primary_lines: primaryLines,
    secondary_lines: secondaryLines,
    power_lines: powerLines,
    footer_lines: footer
  };
}

function renderTooltipPreview(targetId, previewData) {
  const target = $(targetId);
  if (!target) return;

  if (!previewData) {
    target.innerHTML = `<div class="preview-hint">Keine Vorschau verfügbar.</div>`;
    return;
  }

  const rarityClass = buildPreviewRarityClass(previewData.rarity);
  const lines = [];

  lines.push(`<div class="tooltip-preview-title ${rarityClass}">${escapeHtml(previewData.display_name || "Unbenanntes Item")}</div>`);
  if (previewData.rarity_label) {
    lines.push(`<div class="tooltip-line ${rarityClass}">${escapeHtml(previewData.rarity_label)}</div>`);
  }

  (previewData.header_lines || []).forEach(line => {
    lines.push(`<div class="tooltip-line">${escapeHtml(line)}</div>`);
  });

  if (previewData.primary_lines?.length) {
    lines.push(`<div class="tooltip-section-label">Primär</div>`);
    previewData.primary_lines.forEach(line => lines.push(`<div class="tooltip-line">${escapeHtml(line)}</div>`));
  }

  if (previewData.secondary_lines?.length) {
    lines.push(`<div class="tooltip-section-label">Sekundär</div>`);
    previewData.secondary_lines.forEach(line => lines.push(`<div class="tooltip-line">${escapeHtml(line)}</div>`));
  }

  if (previewData.power_lines?.length) {
    lines.push(`<div class="tooltip-section-label tooltip-power">Macht</div>`);
    previewData.power_lines.forEach(line => lines.push(`<div class="tooltip-line tooltip-power">${escapeHtml(line)}</div>`));
  }

  if (previewData.footer_lines?.length) {
    lines.push(`<div class="tooltip-divider"></div>`);
    previewData.footer_lines.forEach(line => lines.push(`<div class="tooltip-line tooltip-footer">${escapeHtml(line)}</div>`));
  }

  target.innerHTML = `${lines.join("")}
    <div class="preview-meta">
      item_type: ${escapeHtml(previewData.item_type || "-")}<br>
      equip_slot: ${escapeHtml(previewData.equip_slot || "-")}<br>
      tooltip_archetype: ${escapeHtml(previewData.tooltip_archetype || "-")}
    </div>`;
}

function collectBaseItemFromCreateForm() {
  const itemType = getSelectedItemType("create");
  const family = getSelectedFamily("create");
  const equipSlot = $("create_equip_slot")?.value || "";

  return {
    item_code: $("create_item_code_preview")?.value?.trim() || "",
    internal_name: $("create_item_code_preview")?.value?.trim() || "",
    display_name: $("create_display_name")?.value?.trim() || "",
    rarity: $("create_rarity")?.value || "normal",
    item_type: itemType,
    equip_slot: equipSlot,
    level_requirement: parseNullableNumber($("create_level_requirement")?.value, true) || 1,
    appearance_code: $("create_appearance_code")?.value?.trim() || $("create_item_code_preview")?.value?.trim() || "",
    rarity_label: $("create_rarity_label")?.value?.trim() || "",
    damage_min: parseNullableNumber($("create_damage_min")?.value, true),
    damage_max: parseNullableNumber($("create_damage_max")?.value, true),
    attacks_per_second: parseNullableNumber($("create_attacks_per_second")?.value, false),
    armor_min: parseNullableNumber($("create_armor_min")?.value, true),
    armor_max: parseNullableNumber($("create_armor_max")?.value, true),
    block_base: parseNullableNumber($("create_block_base")?.value, false),
    random_primary_min: parseNullableNumber($("create_random_primary_min")?.value, true) || 0,
    random_primary_max: parseNullableNumber($("create_random_primary_max")?.value, true) || 0,
    random_secondary_min: parseNullableNumber($("create_random_secondary_min")?.value, true) || 0,
    random_secondary_max: parseNullableNumber($("create_random_secondary_max")?.value, true) || 0,
    binding_mode: $("create_binding_mode")?.value || "tradable",
    is_unique_equipped: !!$("create_is_unique_equipped")?.checked,
    source_type: $("create_is_crafted")?.checked ? "crafted" : "drop",
    crafted_by: $("create_is_crafted")?.checked ? ($("create_crafted_by")?.value || null) : null,
    crafted_tier: $("create_is_crafted")?.checked ? parseNullableNumber($("create_crafted_tier")?.value, true) : null,
    tooltip_archetype: inferTooltipArchetype(itemType, equipSlot, family)
  };
}

function collectBaseItemFromEditForm() {
  const itemType = getSelectedItemType("edit");
  const family = getSelectedFamily("edit");
  const equipSlot = $("edit_equip_slot")?.value || "";

  return {
    item_code: $("edit_item_code")?.value?.trim() || "",
    internal_name: $("edit_item_code")?.value?.trim() || "",
    display_name: $("edit_display_name")?.value?.trim() || "",
    rarity: $("edit_rarity")?.value || "normal",
    item_type: itemType,
    equip_slot: equipSlot,
    level_requirement: parseNullableNumber($("edit_level_requirement")?.value, true) || 1,
    appearance_code: $("edit_appearance_code")?.value?.trim() || $("edit_item_code")?.value?.trim() || "",
    rarity_label: $("edit_rarity_label")?.value?.trim() || "",
    damage_min: parseNullableNumber($("edit_damage_min")?.value, true),
    damage_max: parseNullableNumber($("edit_damage_max")?.value, true),
    attacks_per_second: parseNullableNumber($("edit_attacks_per_second")?.value, false),
    armor_min: parseNullableNumber($("edit_armor_min")?.value, true),
    armor_max: parseNullableNumber($("edit_armor_max")?.value, true),
    block_base: parseNullableNumber($("edit_block_base")?.value, false),
    random_primary_min: parseNullableNumber($("edit_random_primary_min")?.value, true) || 0,
    random_primary_max: parseNullableNumber($("edit_random_primary_max")?.value, true) || 0,
    random_secondary_min: parseNullableNumber($("edit_random_secondary_min")?.value, true) || 0,
    random_secondary_max: parseNullableNumber($("edit_random_secondary_max")?.value, true) || 0,
    binding_mode: $("edit_binding_mode")?.value || "tradable",
    is_unique_equipped: !!$("edit_is_unique_equipped")?.checked,
    source_type: $("edit_is_crafted")?.checked ? "crafted" : "drop",
    crafted_by: $("edit_is_crafted")?.checked ? ($("edit_crafted_by")?.value || null) : null,
    crafted_tier: $("edit_is_crafted")?.checked ? parseNullableNumber($("edit_crafted_tier")?.value, true) : null,
    tooltip_archetype: inferTooltipArchetype(itemType, equipSlot, family)
  };
}

function collectPowerData(prefix) {
  return {
    enabled: !!$(`${prefix}_has_power`)?.checked,
    description: $(`${prefix}_power_description`)?.value?.trim() || "",
    value_min: parseNullableNumber($(`${prefix}_power_value_min`)?.value, false),
    value_max: parseNullableNumber($(`${prefix}_power_value_max`)?.value, false)
  };
}

function updateCreatePreview() {
  const baseItem = collectBaseItemFromCreateForm();
  if (!baseItem.display_name && !baseItem.item_type) {
    renderTooltipPreview("createPreviewContent", null);
    return;
  }
  const modules = collectAffixModules("create");
  const powerData = collectPowerData("create");
  renderTooltipPreview("createPreviewContent", buildPreviewData(baseItem, modules, powerData));
}

function updateEditPreview() {
  const form = $("editForm");
  if (form && form.classList.contains("hidden")) {
    renderTooltipPreview("editPreviewContent", null);
    return;
  }
  const baseItem = collectBaseItemFromEditForm();
  const modules = collectAffixModules("edit");
  const powerData = collectPowerData("edit");
  renderTooltipPreview("editPreviewContent", buildPreviewData(baseItem, modules, powerData));
}

function resetCreateForm() {
  $("createForm")?.reset();
  if ($("createAffixModuleList")) $("createAffixModuleList").innerHTML = "";
  if ($("create_has_power")) $("create_has_power").checked = false;
  if ($("createPowerBlock")) $("createPowerBlock").classList.add("hidden");
  populateFamilySelectors("create");
  applyRarityDefaults("create");
  renderTooltipPreview("createPreviewContent", null);
}

async function persistItemToDatabase(baseItem, modules, powerData, existingItemId = null) {
  const payload = {
    item_code: baseItem.item_code,
    item_type: baseItem.item_type,
    internal_name: baseItem.internal_name || baseItem.item_code,
    display_name: baseItem.display_name,
    rarity: baseItem.rarity,
    equip_slot: baseItem.equip_slot,
    level_requirement: baseItem.level_requirement,
    appearance_code: baseItem.appearance_code || null,
    transmog_code: null,
    min_sockets: 0,
    max_sockets: 0,
    is_equippable: true,
    is_stackable: false,
    max_stack: 1,
    inventory_width: 1,
    inventory_height: 1,
    flavor_text: "",
    description: "",
    can_roll_primary_affixes: true,
    can_roll_secondary_affixes: true,
    can_have_gems: true,
    can_have_durability: false,
    base_name: baseItem.display_name,
    rarity_label: baseItem.rarity_label || buildRarityLabelFallback(baseItem.rarity, baseItem.item_type),
    source_type: baseItem.source_type || "drop",
    damage_min: baseItem.damage_min,
    damage_max: baseItem.damage_max,
    attacks_per_second: baseItem.attacks_per_second,
    armor_base: baseItem.armor_max ?? baseItem.armor_min ?? null,
    armor_min: baseItem.armor_min,
    armor_max: baseItem.armor_max,
    block_base: baseItem.block_base,
    random_primary_min: baseItem.random_primary_min,
    random_primary_max: baseItem.random_primary_max,
    random_secondary_min: baseItem.random_secondary_min,
    random_secondary_max: baseItem.random_secondary_max,
    item_set_code: null,
    crafted_tier: baseItem.crafted_tier,
    crafted_by: baseItem.crafted_by,
    binding_mode: baseItem.binding_mode,
    is_unique_equipped: baseItem.is_unique_equipped,
    tooltip_archetype: baseItem.tooltip_archetype
  };

  let itemId = existingItemId;

  if (existingItemId) {
    const { error } = await supabaseClient.from("items").update(payload).eq("id", existingItemId);
    if (error) throw error;
  } else {
    const { data, error } = await supabaseClient.from("items").insert(payload).select("id").single();
    if (error) throw error;
    itemId = data.id;
  }

  if (!itemId) throw new Error("Item-ID konnte nicht ermittelt werden.");

  await Promise.all([
    supabaseClient.from("item_fixed_properties").delete().eq("item_id", itemId),
    (async () => {
      const { data: groups } = await supabaseClient.from("item_choice_groups").select("id").eq("item_id", itemId);
      const groupIds = (groups || []).map(g => g.id);
      if (groupIds.length) {
        await supabaseClient.from("item_choice_group_options").delete().in("choice_group_id", groupIds);
      }
      await supabaseClient.from("item_choice_groups").delete().eq("item_id", itemId);
    })()
  ]);

  const fixedRows = [];
  const groupRows = [];
  const optionRows = [];

  modules.forEach((mod, idx) => {
    if (mod.kind === "fixed") {
      const def = mod.affix_definition;
      fixedRows.push({
        item_id: itemId,
        property_code: `${slugify(def.affix_code || def.stat_name || "fixed")}_${idx + 1}`,
        property_category: mod.property_category,
        stat_name: def.stat_name,
        mod_type: def.mod_type,
        value_min: def.value_min,
        value_max: def.value_max,
        value2_min: def.value2_min,
        value2_max: def.value2_max,
        description_template: def.description_template,
        display_order: mod.display_order || (idx + 1) * 10,
        is_always_present: mod.is_always_present
      });
    }

    if (mod.kind === "random_fill") {
      groupRows.push({
        _local_key: `random_fill_${idx}`,
        item_id: itemId,
        group_code: `random_fill_${idx + 1}`,
        display_label: mod.display_label,
        property_category: mod.property_category,
        choose_count: mod.choose_count,
        display_order: mod.display_order || (idx + 1) * 10
      });
    }

    if (mod.kind === "choice_group") {
      const localKey = `choice_group_${idx}`;
      groupRows.push({
        _local_key: localKey,
        item_id: itemId,
        group_code: `choice_group_${idx + 1}`,
        display_label: mod.display_label,
        property_category: mod.property_category,
        choose_count: mod.choose_count,
        display_order: mod.display_order || (idx + 1) * 10
      });

      mod.options.forEach((opt, optionIndex) => {
        optionRows.push({
          _group_local_key: localKey,
          option_code: `${slugify(opt.affix_definition.affix_code || opt.affix_definition.stat_name || "choice")}_${optionIndex + 1}`,
          stat_name: opt.affix_definition.stat_name,
          mod_type: opt.affix_definition.mod_type,
          value_min: opt.affix_definition.value_min,
          value_max: opt.affix_definition.value_max,
          value2_min: opt.affix_definition.value2_min,
          value2_max: opt.affix_definition.value2_max,
          description_template: opt.affix_definition.description_template,
          spawn_weight: opt.spawn_weight,
          display_order: opt.display_order || (optionIndex + 1) * 10
        });
      });
    }
  });

  if (powerData.enabled && powerData.description) {
    fixedRows.push({
      item_id: itemId,
      property_code: "legendary_power",
      property_category: "power",
      stat_name: "legendary_power",
      mod_type: "special",
      value_min: powerData.value_min,
      value_max: powerData.value_max,
      value2_min: null,
      value2_max: null,
      description_template: powerData.description,
      display_order: 10,
      is_always_present: true
    });
  }

  if (fixedRows.length) {
    const { error } = await supabaseClient.from("item_fixed_properties").insert(fixedRows);
    if (error) throw error;
  }

  if (groupRows.length) {
    const groupInsertPayload = groupRows.map(({ _local_key, ...rest }) => rest);
    const { data: insertedGroups, error } = await supabaseClient
      .from("item_choice_groups")
      .insert(groupInsertPayload)
      .select("id,group_code");

    if (error) throw error;

    const groupMap = new Map();
    insertedGroups.forEach((g, index) => {
      groupMap.set(groupRows[index]._local_key, g.id);
    });

    const finalOptions = optionRows.map(opt => ({
      choice_group_id: groupMap.get(opt._group_local_key),
      option_code: opt.option_code,
      stat_name: opt.stat_name,
      mod_type: opt.mod_type,
      value_min: opt.value_min,
      value_max: opt.value_max,
      value2_min: opt.value2_min,
      value2_max: opt.value2_max,
      description_template: opt.description_template,
      spawn_weight: opt.spawn_weight,
      display_order: opt.display_order
    })).filter(o => !!o.choice_group_id);

    if (finalOptions.length) {
      const { error: optionError } = await supabaseClient.from("item_choice_group_options").insert(finalOptions);
      if (optionError) throw optionError;
    }
  }

  return itemId;
}

async function createItemFromForm() {
  const baseItem = collectBaseItemFromCreateForm();
  const modules = collectAffixModules("create");
  const powerData = collectPowerData("create");

  if (!baseItem.item_type) throw new Error("Bitte ein genaues Item auswählen.");
  if (!baseItem.display_name) throw new Error("Bitte einen Anzeigenamen eingeben.");
  if (!baseItem.item_code) throw new Error("item_code konnte nicht erzeugt werden.");

  await persistItemToDatabase(baseItem, modules, powerData, null);
  showStatus("Item erfolgreich angelegt.", "ok");
  resetCreateForm();
  await loadReferenceData();
  await loadItemsForList();
  renderEditItemList();
}

async function updateCurrentItemFromForm() {
  const itemId = parseNullableNumber($("edit_item_id")?.value, true);
  if (!itemId) throw new Error("Kein Item ausgewählt.");

  const baseItem = collectBaseItemFromEditForm();
  const modules = collectAffixModules("edit");
  const powerData = collectPowerData("edit");

  if (!baseItem.item_type) throw new Error("Bitte ein genaues Item auswählen.");
  if (!baseItem.display_name) throw new Error("Bitte einen Anzeigenamen eingeben.");
  if (!baseItem.item_code) throw new Error("Bitte item_code eingeben.");

  await persistItemToDatabase(baseItem, modules, powerData, itemId);
  showStatus("Item erfolgreich aktualisiert.", "ok");
  await loadReferenceData();
  await loadItemsForList();
  renderEditItemList();
}

async function deleteCurrentItem() {
  const itemId = parseNullableNumber($("edit_item_id")?.value, true);
  if (!itemId) throw new Error("Kein Item ausgewählt.");
  if (!window.confirm("Dieses Item wirklich löschen?")) return;

  const { data: groups } = await supabaseClient.from("item_choice_groups").select("id").eq("item_id", itemId);
  const groupIds = (groups || []).map(g => g.id);

  if (groupIds.length) {
    const { error: optionErr } = await supabaseClient.from("item_choice_group_options").delete().in("choice_group_id", groupIds);
    if (optionErr) throw optionErr;
  }

  const { error: groupErr } = await supabaseClient.from("item_choice_groups").delete().eq("item_id", itemId);
  if (groupErr) throw groupErr;

  const { error: fixedErr } = await supabaseClient.from("item_fixed_properties").delete().eq("item_id", itemId);
  if (fixedErr) throw fixedErr;

  const { error } = await supabaseClient.from("items").delete().eq("id", itemId);
  if (error) throw error;

  showStatus("Item gelöscht.", "ok");
  if ($("editForm")) $("editForm").classList.add("hidden");
  if ($("editHint")) $("editHint").classList.remove("hidden");
  state.editCurrentItem = null;
  renderTooltipPreview("editPreviewContent", null);

  await loadReferenceData();
  await loadItemsForList();
  renderEditItemList();
}

async function loadItemsForList() {
  const { data, error } = await supabaseClient.from("items").select("*").order("display_name");
  if (error) throw error;

  state.items = data || [];
  populateListTypeFilter();
  renderEditItemList();
}

function renderEditItemList() {
  const q = $("edit_search")?.value?.trim()?.toLowerCase() || "";
  const rarity = $("edit_filter_rarity")?.value || "";
  const itemType = $("edit_filter_item_type")?.value || "";

  const list = $("editItemList");
  if (!list) return;
  list.innerHTML = "";

  state.items
    .filter(item => {
      if (rarity && item.rarity !== rarity) return false;
      if (itemType && item.item_type !== itemType) return false;

      if (!q) return true;

      return (
        String(item.display_name || "").toLowerCase().includes(q) ||
        String(item.item_code || "").toLowerCase().includes(q) ||
        String(item.item_type || "").toLowerCase().includes(q) ||
        String(item.rarity || "").toLowerCase().includes(q)
      );
    })
    .forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <div class="item-title">${escapeHtml(item.display_name)}</div>
        <div class="pill">${escapeHtml(item.rarity)}</div>
        <div class="pill">${escapeHtml(item.item_type)}</div>
        <div class="pill">${escapeHtml(item.equip_slot || "-")}</div>
        <div class="muted" style="margin-top:8px;">${escapeHtml(item.item_code)}</div>
      `;
      card.onclick = () => loadItemIntoEdit(item.id);
      list.appendChild(card);
    });
}

function findAffixDefinitionLike(row, itemType, propertyCategory) {
  const ranked = rankAffixesForItemType(itemType, propertyCategory, row.stat_name || row.description_template || "");

  const scored = ranked.map(def => {
    let score = 0;
    if (String(def.stat_name || "") === String(row.stat_name || "")) score += 500;
    if (String(def.mod_type || "") === String(row.mod_type || "")) score += 300;
    if (String(def.description_template || "") === String(row.description_template || "")) score += 800;
    if (String(def.value_min ?? "") === String(row.value_min ?? "")) score += 100;
    if (String(def.value_max ?? "") === String(row.value_max ?? "")) score += 100;
    if (String(def.value2_min ?? "") === String(row.value2_min ?? "")) score += 50;
    if (String(def.value2_max ?? "") === String(row.value2_max ?? "")) score += 50;
    return { def, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.def || null;
}

async function loadItemIntoEdit(itemId) {
  const { data: item, error: itemErr } = await supabaseClient.from("items").select("*").eq("id", itemId).single();
  if (itemErr) throw itemErr;

  const { data: fixedRows, error: fixedErr } = await supabaseClient
    .from("item_fixed_properties")
    .select("*")
    .eq("item_id", itemId)
    .order("display_order");
  if (fixedErr) throw fixedErr;

  const { data: groups, error: groupErr } = await supabaseClient
    .from("item_choice_groups")
    .select("*")
    .eq("item_id", itemId)
    .order("display_order");
  if (groupErr) throw groupErr;

  const groupIds = (groups || []).map(g => g.id);
  let options = [];
  if (groupIds.length) {
    const { data: opts, error: optErr } = await supabaseClient
      .from("item_choice_group_options")
      .select("*")
      .in("choice_group_id", groupIds)
      .order("display_order");
    if (optErr) throw optErr;
    options = opts || [];
  }

  fillEditForm(item, fixedRows || [], groups || [], options || []);
}

function fillEditForm(item, fixedRows, groups, options) {
  state.editCurrentItem = item;

  if ($("edit_item_id")) $("edit_item_id").value = item.id;
  if ($("edit_display_name")) $("edit_display_name").value = item.display_name || "";
  if ($("edit_item_code")) $("edit_item_code").value = item.item_code || "";
  if ($("edit_rarity")) $("edit_rarity").value = item.rarity || "normal";
  if ($("edit_level_requirement")) $("edit_level_requirement").value = item.level_requirement || 1;
  if ($("edit_appearance_code")) $("edit_appearance_code").value = item.appearance_code || "";
  if ($("edit_rarity_label")) $("edit_rarity_label").value = item.rarity_label || "";
  if ($("edit_damage_min")) $("edit_damage_min").value = item.damage_min ?? "";
  if ($("edit_damage_max")) $("edit_damage_max").value = item.damage_max ?? "";
  if ($("edit_attacks_per_second")) $("edit_attacks_per_second").value = item.attacks_per_second ?? "";
  if ($("edit_armor_min")) $("edit_armor_min").value = item.armor_min ?? "";
  if ($("edit_armor_max")) $("edit_armor_max").value = item.armor_max ?? "";
  if ($("edit_block_base")) $("edit_block_base").value = item.block_base ?? "";
  if ($("edit_random_primary_min")) $("edit_random_primary_min").value = item.random_primary_min ?? 0;
  if ($("edit_random_primary_max")) $("edit_random_primary_max").value = item.random_primary_max ?? 0;
  if ($("edit_random_secondary_min")) $("edit_random_secondary_min").value = item.random_secondary_min ?? 0;
  if ($("edit_random_secondary_max")) $("edit_random_secondary_max").value = item.random_secondary_max ?? 0;
  if ($("edit_binding_mode")) $("edit_binding_mode").value = item.binding_mode || "tradable";
  if ($("edit_is_unique_equipped")) $("edit_is_unique_equipped").checked = !!item.is_unique_equipped;
  if ($("edit_is_crafted")) $("edit_is_crafted").checked = item.source_type === "crafted";
  if ($("edit_crafted_by")) $("edit_crafted_by").value = item.crafted_by || "";
  if ($("edit_crafted_tier")) $("edit_crafted_tier").value = item.crafted_tier ?? "";

  const { family, subfamily } = getFamilyOfItemType(item.item_type);
  if ($("edit_item_family")) $("edit_item_family").value = family;
  $("edit_item_family")?.dispatchEvent(new Event("change"));
  if ($("edit_item_subfamily")) $("edit_item_subfamily").value = subfamily;
  $("edit_item_subfamily")?.dispatchEvent(new Event("change"));
  if ($("edit_item_type")) $("edit_item_type").value = item.item_type;
  if ($("edit_equip_slot")) $("edit_equip_slot").value = item.equip_slot || state.itemTypeToSlot.get(item.item_type) || "";

  const powerRow = fixedRows.find(r => r.property_category === "power");
  if ($("edit_has_power")) $("edit_has_power").checked = !!powerRow;
  if ($("editPowerBlock")) $("editPowerBlock").classList.toggle("hidden", !powerRow);
  if ($("edit_power_description")) $("edit_power_description").value = powerRow?.description_template || "";
  if ($("edit_power_value_min")) $("edit_power_value_min").value = powerRow?.value_min ?? "";
  if ($("edit_power_value_max")) $("edit_power_value_max").value = powerRow?.value_max ?? "";

  const normalFixed = fixedRows.filter(r => r.property_category !== "power");
  const modRoot = $("editAffixModuleList");
  if (!modRoot) return;
  modRoot.innerHTML = "";

  normalFixed.forEach((row, idx) => {
    modRoot.insertAdjacentHTML("beforeend", createAffixModuleHtml("edit", `fixed_${idx}`, {
      kind: "fixed",
      property_category: row.property_category,
      is_always_present: row.is_always_present
    }));

    const mod = modRoot.lastElementChild;
    const foundDef = findAffixDefinitionLike(row, item.item_type, row.property_category);

    if (foundDef) {
      const value = `${foundDef.source || "affix_definitions"}:${idKey(foundDef.source_id || foundDef.id)}:${row.property_category}:${foundDef.affix_code}`;
      mod.querySelector(".affix-select").dataset.value = String(value || "");
    }

    mod.querySelector(".affix-search").value = row.stat_name || row.description_template || "";
    mod.querySelector(".fixed-stat-name").value = row.stat_name ?? "";
    mod.querySelector(".fixed-mod-type").value = row.mod_type ?? "";
    mod.querySelector(".fixed-value-min").value = row.value_min ?? "";
    mod.querySelector(".fixed-value-max").value = row.value_max ?? "";
    mod.querySelector(".fixed-value2-min").value = row.value2_min ?? "";
    mod.querySelector(".fixed-value2-max").value = row.value2_max ?? "";
    mod.querySelector(".fixed-desc-template").value = row.description_template ?? "";
    mod.dataset.fixedManualValues = "1";
  });

  groups.forEach((group, idx) => {
    const groupOptions = options.filter(o => o.choice_group_id === group.id);
    const isRandomFill =
      groupOptions.length === 0 &&
      String(group.display_label || "").toLowerCase().includes("zufällige");

    modRoot.insertAdjacentHTML("beforeend", createAffixModuleHtml("edit", `group_${idx}`, {
      kind: isRandomFill ? "random_fill" : "choice_group",
      property_category: group.property_category,
      display_label: group.display_label,
      choose_count: group.choose_count,
      display_order: group.display_order
    }));

    const mod = modRoot.lastElementChild;

    if (!isRandomFill) {
      const list = mod.querySelector(".choice-options-list");
      groupOptions.forEach(opt => {
        list.insertAdjacentHTML("beforeend", createChoiceOptionHtml({ spawn_weight: opt.spawn_weight }));
        const optionEl = list.lastElementChild;

        const foundDef = findAffixDefinitionLike(opt, item.item_type, group.property_category);

        if (foundDef) {
          const value = `${foundDef.source || "affix_definitions"}:${idKey(foundDef.source_id || foundDef.id)}:${group.property_category}:${foundDef.affix_code}`;
          optionEl.querySelector(".choice-option-affix-select").dataset.value = String(value || "");
        }

        optionEl.querySelector(".choice-option-search").value = opt.stat_name || opt.description_template || "";
        optionEl.querySelector(".choice-stat-name").value = opt.stat_name ?? "";
        optionEl.querySelector(".choice-mod-type").value = opt.mod_type ?? "";
        optionEl.querySelector(".choice-value-min").value = opt.value_min ?? "";
        optionEl.querySelector(".choice-value-max").value = opt.value_max ?? "";
        optionEl.querySelector(".choice-value2-min").value = opt.value2_min ?? "";
        optionEl.querySelector(".choice-value2-max").value = opt.value2_max ?? "";
        optionEl.querySelector(".choice-desc-template").value = opt.description_template ?? "";
        optionEl.dataset.manualValues = "1";
      });
    }
  });

  bindAffixModuleEvents(modRoot, "edit");
  refreshEditDerivedFields();

  $("editForm")?.classList.remove("hidden");
  $("editHint")?.classList.add("hidden");
  updateEditPreview();
}

async function login() {
  clearStatus();
  try {
    const email = $("login_email")?.value?.trim() || "";
    const password = $("login_password")?.value || "";
    if (!email || !password) {
      showStatus("Bitte E-Mail und Passwort eingeben.", "error");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await initAppAfterAuth();
    showStatus("Login erfolgreich.", "ok");
  } catch (err) {
    showStatus(`Login fehlgeschlagen:\n${err.message}`, "error");
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  state.session = null;
  state.user = null;
  state.profile = null;
  $("authCard")?.classList.remove("hidden");
  $("appShell")?.classList.add("hidden");
}

async function initAppAfterAuth() {
  await getSessionAndProfile();

  if (!state.user) {
    $("authCard")?.classList.remove("hidden");
    $("appShell")?.classList.add("hidden");
    return;
  }

  if (!state.profile) {
    throw new Error("Kein Profil für diesen Benutzer gefunden.");
  }

  if (!isAllowedUser()) {
    $("authCard")?.classList.add("hidden");
    $("appShell")?.classList.add("hidden");
    throw new Error(`Dieser Benutzer darf das Tool nicht verwenden.\n\nErlaubt ist nur Profil-ID:\n${ALLOWED_PROFILE_ID}`);
  }

  $("authCard")?.classList.add("hidden");
  $("appShell")?.classList.remove("hidden");
  if ($("whoami")) $("whoami").textContent = state.user.email || state.user.id;
  if ($("profileInfo")) $("profileInfo").textContent = `${state.profile.display_name || "-"} (${state.profile.id})`;

  await loadReferenceData();
  await loadItemsForList();
  renderEditItemList();
  applyRarityDefaults("create");
  refreshCreateDerivedFields();
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  $(tabId)?.classList.remove("hidden");
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");
}

function wireCreateEvents() {
  $("create_display_name")?.addEventListener("input", async () => {
    await refreshCreateItemCode();
    updateCreatePreview();
  });

  [
    "create_rarity",
    "create_damage_min",
    "create_damage_max",
    "create_attacks_per_second",
    "create_armor_min",
    "create_armor_max",
    "create_block_base",
    "create_random_primary_min",
    "create_random_primary_max",
    "create_random_secondary_min",
    "create_random_secondary_max",
    "create_is_unique_equipped",
    "create_binding_mode",
    "create_level_requirement",
    "create_rarity_label",
    "create_appearance_code",
    "create_is_crafted",
    "create_crafted_by",
    "create_crafted_tier",
    "create_has_power",
    "create_power_description",
    "create_power_value_min",
    "create_power_value_max"
  ].forEach(id => {
    $(id)?.addEventListener("input", updateCreatePreview);
    $(id)?.addEventListener("change", updateCreatePreview);
  });

  $("create_rarity")?.addEventListener("change", () => {
    applyRarityDefaults("create");
    updateCreatePreview();
  });

  $("create_has_power")?.addEventListener("change", () => {
    $("createPowerBlock")?.classList.toggle("hidden", !$("create_has_power")?.checked);
    updateCreatePreview();
  });

  if ($("btnAddCreateAffixModule")) {
    $("btnAddCreateAffixModule").onclick = () => {
      $("createAffixModuleList")?.insertAdjacentHTML("beforeend", createAffixModuleHtml("create", `m_${Date.now()}`));
      bindAffixModuleEvents($("createAffixModuleList"), "create");
      updateCreatePreview();
    };
  }

  if ($("btnCreateReset")) {
    $("btnCreateReset").onclick = () => resetCreateForm();
  }

  if ($("createForm")) {
    $("createForm").onsubmit = async (e) => {
      e.preventDefault();
      clearStatus();
      try {
        await createItemFromForm();
      } catch (err) {
        showStatus(err.message, "error");
      }
    };
  }
}

function wireEditEvents() {
  [
    "edit_display_name",
    "edit_item_code",
    "edit_rarity",
    "edit_damage_min",
    "edit_damage_max",
    "edit_attacks_per_second",
    "edit_armor_min",
    "edit_armor_max",
    "edit_block_base",
    "edit_random_primary_min",
    "edit_random_primary_max",
    "edit_random_secondary_min",
    "edit_random_secondary_max",
    "edit_is_unique_equipped",
    "edit_binding_mode",
    "edit_level_requirement",
    "edit_rarity_label",
    "edit_appearance_code",
    "edit_is_crafted",
    "edit_crafted_by",
    "edit_crafted_tier",
    "edit_has_power",
    "edit_power_description",
    "edit_power_value_min",
    "edit_power_value_max"
  ].forEach(id => {
    $(id)?.addEventListener("input", updateEditPreview);
    $(id)?.addEventListener("change", updateEditPreview);
  });

  $("edit_rarity")?.addEventListener("change", () => {
    applyRarityDefaults("edit");
    updateEditPreview();
  });

  $("edit_has_power")?.addEventListener("change", () => {
    $("editPowerBlock")?.classList.toggle("hidden", !$("edit_has_power")?.checked);
    updateEditPreview();
  });

  if ($("btnAddEditAffixModule")) {
    $("btnAddEditAffixModule").onclick = () => {
      $("editAffixModuleList")?.insertAdjacentHTML("beforeend", createAffixModuleHtml("edit", `m_${Date.now()}`));
      bindAffixModuleEvents($("editAffixModuleList"), "edit");
      updateEditPreview();
    };
  }

  if ($("editForm")) {
    $("editForm").onsubmit = async (e) => {
      e.preventDefault();
      clearStatus();
      try {
        await updateCurrentItemFromForm();
      } catch (err) {
        showStatus(err.message, "error");
      }
    };
  }

  if ($("btnDeleteItem")) {
    $("btnDeleteItem").onclick = async () => {
      clearStatus();
      try {
        await deleteCurrentItem();
      } catch (err) {
        showStatus(err.message, "error");
      }
    };
  }
}

function wireUi() {
  if ($("btnLogin")) $("btnLogin").onclick = login;
  if ($("btnLogout")) $("btnLogout").onclick = logout;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  $("edit_search")?.addEventListener("input", debounce(renderEditItemList, 100));
  $("edit_filter_rarity")?.addEventListener("change", renderEditItemList);
  $("edit_filter_item_type")?.addEventListener("change", renderEditItemList);

  if ($("btnReloadEditList")) {
    $("btnReloadEditList").onclick = async () => {
      await loadItemsForList();
      renderEditItemList();
    };
  }

  wireCreateEvents();
  wireEditEvents();
}

async function init() {
  wireUi();
  try {
    await initAppAfterAuth();
  } catch (err) {
    if (state.user) {
      showStatus(err.message, "error");
    }
  }
}

init();
