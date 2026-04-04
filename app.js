const SUPABASE_URL = "https://nnwmjwprfofihhbutcff.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ud21qd3ByZm9maWhoYnV0Y2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTcyNzMsImV4cCI6MjA4ODk5MzI3M30.RM4EDjvjWN2R7IVfz-4GdhSIfQI4N0NescFshkHxWZ4";
const ALLOWED_PROFILE_ID = "b934eac7-aae5-4ec2-abb7-d67d7dbdabad";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

const state = {
  session: null,
  user: null,
  profile: null,
  itemTypeMap: new Map(),     // item_type -> { equip_slot, sort_order }
  itemTypes: [],
  classRules: [],
  classes: [],
  allItems: [],
  editItems: [],
  currentEditItem: null
};
console.log("app.js geladen");
// ---------- helpers ----------
function $(id) {
  return document.getElementById(id);
}

function showStatus(message, type = "info") {
  const box = $("statusBox");
  box.textContent = message;
  box.className = `status ${type}`;
  box.classList.remove("hidden");
}

function clearStatus() {
  $("statusBox").classList.add("hidden");
}

function setTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

  $(tabId).classList.remove("hidden");
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");
}

function toSlug(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function inferTooltipArchetype(itemType, equipSlot) {
  const weaponMain = [
    "axe_1h", "dagger", "mace_1h", "spear", "sword_1h", "ceremonial_knife",
    "fist_weapon", "flail_1h", "mighty_weapon_1h", "scythe_1h", "mace_2h",
    "polearm", "staff", "sword_2h", "flail_2h", "mighty_weapon_2h",
    "scythe_2h", "bow", "crossbow", "hand_crossbow", "wand"
  ];

  const armorTypes = [
    "helmet", "soulstone", "mask", "hat", "shoulder_armor", "chest_armor",
    "cloak", "bracer", "gloves", "belt", "mighty_belt", "pants", "boots"
  ];

  const jewelryTypes = ["amulet", "ring"];
  const offhandTypes = ["shield", "crusader_shield", "orb", "quiver", "book"];

  if (weaponMain.includes(itemType)) return "weapon";
  if (armorTypes.includes(itemType)) return "armor";
  if (jewelryTypes.includes(itemType)) return "jewelry";
  if (offhandTypes.includes(itemType)) return "offhand";
  if (itemType === "backpack") return "backpack";
  if (itemType === "artifact") return "artifact";

  if (equipSlot === "weapon_main") return "weapon";
  if (equipSlot === "weapon_off") return "offhand";
  if (["head", "shoulders", "chest", "sleeve", "hand", "belt", "legs", "feet"].includes(equipSlot)) return "armor";
  if (["amulet", "ring_left", "ring_right"].includes(equipSlot)) return "jewelry";
  if (equipSlot === "backpack") return "backpack";
  if (equipSlot === "artifact") return "artifact";

  return "special";
}

function parseNullableNumber(value, integer = false) {
  if (value === "" || value === null || value === undefined) return null;
  const n = integer ? parseInt(value, 10) : parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function parseNullableText(value) {
  const v = (value || "").trim();
  return v === "" ? null : v;
}

function boolFromCheckbox(id) {
  return $(id).checked;
}

function setCheckbox(id, value) {
  $(id).checked = !!value;
}

function buildRarityLabelFallback(rarity, itemType, archetype) {
  const rarityMap = {
    normal: "",
    magic: "Magischer",
    rare: "Seltener",
    legendary: "Legendärer",
    unique: "Einzigartiger",
    unreal: "Unwirklicher"
  };

  const baseMap = {
    weapon: "Waffe",
    armor: "Rüstung",
    offhand: "Nebenhand",
    jewelry: "Schmuck",
    backpack: "Rückenslot",
    artifact: "Artefakt",
    special: "Gegenstand"
  };

  const prefix = rarityMap[rarity] || "";
  const base = baseMap[archetype] || itemType || "Gegenstand";
  return prefix ? `${prefix} ${base}` : base;
}

function makeDefaultInternalName(itemCode) {
  return itemCode || "";
}

function debounce(fn, wait = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---------- auth ----------
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

function isAllowedUser() {
  return state.user?.id === ALLOWED_PROFILE_ID && state.profile?.id === ALLOWED_PROFILE_ID;
}

async function login() {
  console.log("Login geklickt");
  clearStatus();
  try {
    const email = $("login_email").value.trim();
    const password = $("login_password").value;

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
  $("authCard").classList.remove("hidden");
  $("appShell").classList.add("hidden");
  showStatus("Ausgeloggt.", "info");
}

// ---------- data loading ----------
async function loadReferenceData() {
  // item types from equip_slot_item_types
  const { data: slotTypeRows, error: slotTypeError } = await supabaseClient
    .from("equip_slot_item_types")
    .select("equip_slot, item_type, sort_order, is_enabled")
    .order("sort_order", { ascending: true });

  if (slotTypeError) throw slotTypeError;

  state.itemTypeMap.clear();
  state.itemTypes = [];

  (slotTypeRows || [])
    .filter(r => r.is_enabled !== false)
    .forEach(row => {
      state.itemTypeMap.set(row.item_type, {
        equip_slot: row.equip_slot,
        sort_order: row.sort_order ?? 0
      });
      state.itemTypes.push(row.item_type);
    });

  state.itemTypes = [...new Set(state.itemTypes)];

  // class rules
  const { data: classRules, error: classRulesError } = await supabaseClient
    .from("item_type_class_rules")
    .select("item_type, class_code, is_allowed");

  if (classRulesError && !String(classRulesError.message).includes("permission")) {
    throw classRulesError;
  }
  state.classRules = classRules || [];

  // classes
  const { data: classes, error: classesError } = await supabaseClient
    .from("class_definitions")
    .select("class_code, display_name")
    .order("sort_order", { ascending: true });

  if (classesError && !String(classesError.message).includes("permission")) {
    throw classesError;
  }
  state.classes = classes || [];

  populateItemTypeSelects();
}

function populateItemTypeSelects() {
  const selects = [$("create_item_type"), $("edit_item_type"), $("list_filter_type")];
  selects.forEach(sel => {
    const current = sel.value;
    sel.innerHTML = sel.id === "list_filter_type" ? `<option value="">alle</option>` : `<option value="">bitte wählen</option>`;

    state.itemTypes.forEach(itemType => {
      const opt = document.createElement("option");
      opt.value = itemType;
      opt.textContent = itemType;
      sel.appendChild(opt);
    });

    if (current && state.itemTypes.includes(current)) {
      sel.value = current;
    }
  });
}

async function loadItemsForList() {
  const { data, error } = await supabaseClient
    .from("items")
    .select(`
      id,
      item_code,
      internal_name,
      display_name,
      rarity,
      rarity_label,
      item_type,
      equip_slot,
      tooltip_archetype,
      level_requirement,
      binding_mode,
      source_type,
      crafted_tier,
      is_unique_equipped,
      damage_min,
      damage_max,
      attacks_per_second,
      armor_base,
      block_base,
      random_primary_min,
      random_primary_max,
      random_secondary_min,
      random_secondary_max
    `)
    .order("id", { ascending: false });

  if (error) throw error;
  state.allItems = data || [];
  renderItemList();
  renderEditItemList();
}

async function loadItemDeep(itemId) {
  const { data: item, error: itemError } = await supabaseClient
    .from("items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError) throw itemError;

  const { data: fixedRows, error: fixedError } = await supabaseClient
    .from("item_fixed_properties")
    .select("*")
    .eq("item_id", itemId)
    .order("display_order", { ascending: true });

  if (fixedError) throw fixedError;

  const { data: groups, error: groupError } = await supabaseClient
    .from("item_choice_groups")
    .select("*")
    .eq("item_id", itemId)
    .order("display_order", { ascending: true });

  if (groupError) throw groupError;

  const groupIds = (groups || []).map(g => g.id);

  let options = [];
  if (groupIds.length > 0) {
    const { data: optionRows, error: optionError } = await supabaseClient
      .from("item_choice_group_options")
      .select("*")
      .in("choice_group_id", groupIds)
      .order("display_order", { ascending: true });

    if (optionError) throw optionError;
    options = optionRows || [];
  }

  return {
    item,
    fixedRows: fixedRows || [],
    groups: groups || [],
    options
  };
}

// ---------- render list ----------
function renderItemList() {
  const search = $("list_search").value.trim().toLowerCase();
  const rarity = $("list_filter_rarity").value;
  const itemType = $("list_filter_type").value;

  let rows = [...state.allItems];

  if (rarity) rows = rows.filter(r => r.rarity === rarity);
  if (itemType) rows = rows.filter(r => r.item_type === itemType);
  if (search) {
    rows = rows.filter(r =>
      (r.display_name || "").toLowerCase().includes(search) ||
      (r.item_code || "").toLowerCase().includes(search) ||
      (r.item_type || "").toLowerCase().includes(search) ||
      (r.rarity_label || "").toLowerCase().includes(search)
    );
  }

  const container = $("itemList");
  container.innerHTML = "";

  if (rows.length === 0) {
    container.innerHTML = `<div class="muted">Keine Items gefunden.</div>`;
    return;
  }

  rows.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-title">${escapeHtml(item.display_name || "")}</div>
      <div class="muted">${escapeHtml(item.item_code || "")}</div>
      <div style="margin-top:8px;">
        <span class="pill">${escapeHtml(item.rarity || "")}</span>
        <span class="pill">${escapeHtml(item.item_type || "")}</span>
        <span class="pill">${escapeHtml(item.equip_slot || "")}</span>
      </div>
    `;
    card.addEventListener("click", async () => {
      await openEditItem(item.id);
      setTab("tab-edit");
    });
    container.appendChild(card);
  });
}

function renderEditItemList() {
  const search = $("edit_search").value.trim().toLowerCase();
  let rows = [...state.allItems];

  if (search) {
    rows = rows.filter(r =>
      (r.display_name || "").toLowerCase().includes(search) ||
      (r.item_code || "").toLowerCase().includes(search)
    );
  }

  const container = $("editItemList");
  container.innerHTML = "";

  rows.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-title">${escapeHtml(item.display_name || "")}</div>
      <div class="muted">${escapeHtml(item.item_code || "")}</div>
      <div style="margin-top:8px;">
        <span class="pill">${escapeHtml(item.rarity || "")}</span>
        <span class="pill">${escapeHtml(item.item_type || "")}</span>
      </div>
    `;
    card.addEventListener("click", async () => {
      await openEditItem(item.id);
    });
    container.appendChild(card);
  });

  if (rows.length === 0) {
    container.innerHTML = `<div class="muted">Keine Items gefunden.</div>`;
  }
}

async function openEditItem(itemId) {
  clearStatus();
  try {
    const payload = await loadItemDeep(itemId);
    state.currentEditItem = payload;
    fillEditForm(payload);
    $("editHint").textContent = `Bearbeite: ${payload.item.display_name} (${payload.item.item_code})`;
    $("editForm").classList.remove("hidden");
  } catch (err) {
    showStatus(`Item konnte nicht geladen werden:\n${err.message}`, "error");
  }
}

// ---------- repeaters ----------
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createFixedPropertyHtml(prefix, data = {}) {
  return `
    <div class="repeater-item fixed-property">
      <div class="toolbar" style="justify-content:flex-end;">
        <button type="button" class="btn-danger btn-small btn-remove-fixed">Entfernen</button>
      </div>

      <div class="row">
        <div class="field col-3">
          <label>Property Code</label>
          <input class="${prefix}_fixed_property_code" type="text" value="${escapeHtml(data.property_code || "")}" placeholder="z. B. shield_block_chance" />
        </div>
        <div class="field col-3">
          <label>Property Category</label>
          <select class="${prefix}_fixed_property_category">
            ${selectOptions(["primary","secondary","power","meta"], data.property_category)}
          </select>
        </div>
        <div class="field col-3">
          <label>Stat Name</label>
          <input class="${prefix}_fixed_stat_name" type="text" value="${escapeHtml(data.stat_name || "")}" placeholder="z. B. block_chance" />
        </div>
        <div class="field col-3">
          <label>Mod Type</label>
          <select class="${prefix}_fixed_mod_type">
            ${selectOptions(["flat","percent","percent_add","percent_mult","range","special"], data.mod_type || "flat")}
          </select>
        </div>
      </div>

      <div class="row">
        <div class="field col-3">
          <label>Value Min</label>
          <input class="${prefix}_fixed_value_min" type="number" step="0.01" value="${data.value_min ?? ""}" />
        </div>
        <div class="field col-3">
          <label>Value Max</label>
          <input class="${prefix}_fixed_value_max" type="number" step="0.01" value="${data.value_max ?? ""}" />
        </div>
        <div class="field col-3">
          <label>Value2 Min</label>
          <input class="${prefix}_fixed_value2_min" type="number" step="0.01" value="${data.value2_min ?? ""}" />
        </div>
        <div class="field col-3">
          <label>Value2 Max</label>
          <input class="${prefix}_fixed_value2_max" type="number" step="0.01" value="${data.value2_max ?? ""}" />
        </div>
      </div>

      <div class="row">
        <div class="field col-9">
          <label>Description Template</label>
          <input class="${prefix}_fixed_description_template" type="text" value="${escapeHtml(data.description_template || "")}" placeholder="+{value}% Blockchance" />
        </div>
        <div class="field col-2">
          <label>Display Order</label>
          <input class="${prefix}_fixed_display_order" type="number" value="${data.display_order ?? 0}" />
        </div>
        <div class="field col-1">
          <label>Immer</label>
          <input class="${prefix}_fixed_is_always_present" type="checkbox" ${data.is_always_present === false ? "" : "checked"} />
        </div>
      </div>
    </div>
  `;
}

function createChoiceGroupHtml(prefix, group = {}, options = []) {
  return `
    <div class="repeater-item choice-group">
      <div class="toolbar" style="justify-content:space-between;">
        <strong>Choice Group</strong>
        <div class="inline">
          <button type="button" class="btn-secondary btn-small btn-add-option">+ Option</button>
          <button type="button" class="btn-danger btn-small btn-remove-group">Gruppe entfernen</button>
        </div>
      </div>

      <div class="row">
        <div class="field col-3">
          <label>Group Code</label>
          <input class="${prefix}_group_code" type="text" value="${escapeHtml(group.group_code || "")}" placeholder="z. B. shield_mainstat" />
        </div>
        <div class="field col-4">
          <label>Display Label</label>
          <input class="${prefix}_group_label" type="text" value="${escapeHtml(group.display_label || "")}" placeholder="Eine von 3 magischen Eigenschaften (variiert)" />
        </div>
        <div class="field col-2">
          <label>Property Category</label>
          <select class="${prefix}_group_property_category">
            ${selectOptions(["primary","secondary","power","meta"], group.property_category || "primary")}
          </select>
        </div>
        <div class="field col-1">
          <label>Choose</label>
          <input class="${prefix}_group_choose_count" type="number" min="1" value="${group.choose_count ?? 1}" />
        </div>
        <div class="field col-2">
          <label>Display Order</label>
          <input class="${prefix}_group_display_order" type="number" value="${group.display_order ?? 0}" />
        </div>
      </div>

      <div class="choice-options repeater-list">
        ${options.map(opt => createChoiceOptionHtml(prefix, opt)).join("")}
      </div>
    </div>
  `;
}

function createChoiceOptionHtml(prefix, option = {}) {
  return `
    <div class="sub-block choice-option">
      <div class="toolbar" style="justify-content:flex-end;">
        <button type="button" class="btn-danger btn-small btn-remove-option">Option entfernen</button>
      </div>

      <div class="row">
        <div class="field col-3">
          <label>Option Code</label>
          <input class="${prefix}_option_code" type="text" value="${escapeHtml(option.option_code || "")}" placeholder="z. B. mainstat_str" />
        </div>
        <div class="field col-3">
          <label>Stat Name</label>
          <input class="${prefix}_option_stat_name" type="text" value="${escapeHtml(option.stat_name || "")}" placeholder="z. B. strength" />
        </div>
        <div class="field col-3">
          <label>Mod Type</label>
          <select class="${prefix}_option_mod_type">
            ${selectOptions(["flat","percent","percent_add","percent_mult","range","special"], option.mod_type || "flat")}
          </select>
        </div>
        <div class="field col-3">
          <label>Spawn Weight</label>
          <input class="${prefix}_option_spawn_weight" type="number" min="1" value="${option.spawn_weight ?? 100}" />
        </div>
      </div>

      <div class="row">
        <div class="field col-3">
          <label>Value Min</label>
          <input class="${prefix}_option_value_min" type="number" step="0.01" value="${option.value_min ?? ""}" />
        </div>
        <div class="field col-3">
          <label>Value Max</label>
          <input class="${prefix}_option_value_max" type="number" step="0.01" value="${option.value_max ?? ""}" />
        </div>
        <div class="field col-3">
          <label>Value2 Min</label>
          <input class="${prefix}_option_value2_min" type="number" step="0.01" value="${option.value2_min ?? ""}" />
        </div>
        <div class="field col-3">
          <label>Value2 Max</label>
          <input class="${prefix}_option_value2_max" type="number" step="0.01" value="${option.value2_max ?? ""}" />
        </div>
      </div>

      <div class="row">
        <div class="field col-10">
          <label>Description Template</label>
          <input class="${prefix}_option_description_template" type="text" value="${escapeHtml(option.description_template || "")}" placeholder="+{value} Stärke" />
        </div>
        <div class="field col-2">
          <label>Display Order</label>
          <input class="${prefix}_option_display_order" type="number" value="${option.display_order ?? 0}" />
        </div>
      </div>
    </div>
  `;
}

function selectOptions(values, selected) {
  return values.map(v => `<option value="${escapeHtml(v)}" ${v === selected ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
}

function bindRepeaterEvents(root) {
  root.querySelectorAll(".btn-remove-fixed").forEach(btn => {
    btn.onclick = () => btn.closest(".fixed-property").remove();
  });

  root.querySelectorAll(".btn-remove-group").forEach(btn => {
    btn.onclick = () => btn.closest(".choice-group").remove();
  });

  root.querySelectorAll(".btn-add-option").forEach(btn => {
    btn.onclick = () => {
      const container = btn.closest(".choice-group").querySelector(".choice-options");
      container.insertAdjacentHTML("beforeend", createChoiceOptionHtml("x"));
      bindRepeaterEvents(container);
    };
  });

  root.querySelectorAll(".btn-remove-option").forEach(btn => {
    btn.onclick = () => btn.closest(".choice-option").remove();
  });
}

// ---------- form collect ----------
function collectBaseItemFromCreateForm(generatedItemCode) {
  const itemType = $("create_item_type").value;
  const equipSlot = $("create_equip_slot").value;
  const tooltipArchetype = $("create_tooltip_archetype").value || inferTooltipArchetype(itemType, equipSlot);
  const rarity = $("create_rarity").value;
  const rarityLabel = parseNullableText($("create_rarity_label").value) || buildRarityLabelFallback(rarity, itemType, tooltipArchetype);

  return {
    item_code: generatedItemCode,
    internal_name: makeDefaultInternalName(generatedItemCode),
    display_name: $("create_display_name").value.trim(),
    rarity,
    item_type: itemType,
    equip_slot: equipSlot || null,
    level_requirement: parseNullableNumber($("create_level_requirement").value, true) ?? 1,
    description: $("create_description").value.trim() || rarityLabel,
    flavor_text: $("create_flavor_text").value.trim() || "",
    transmog_code: null,
    appearance_code: parseNullableText($("create_appearance_code").value) || generatedItemCode,
    min_sockets: parseNullableNumber($("create_min_sockets").value, true) ?? 0,
    max_sockets: parseNullableNumber($("create_max_sockets").value, true) ?? 0,
    is_equippable: true,
    is_stackable: false,
    max_stack: 1,
    inventory_width: 1,
    inventory_height: 1,
    icon_path: null,
    mesh_path: null,
    can_roll_primary_affixes: boolFromCheckbox("create_can_roll_primary_affixes"),
    can_roll_secondary_affixes: boolFromCheckbox("create_can_roll_secondary_affixes"),
    can_have_gems: boolFromCheckbox("create_can_have_gems"),
    can_have_durability: true,
    base_name: $("create_display_name").value.trim(),
    rarity_label: rarityLabel,
    source_type: $("create_source_type").value,
    damage_min: parseNullableNumber($("create_damage_min").value, true),
    damage_max: parseNullableNumber($("create_damage_max").value, true),
    attacks_per_second: parseNullableNumber($("create_attacks_per_second").value, false),
    armor_base: parseNullableNumber($("create_armor_base").value, true),
    block_base: parseNullableNumber($("create_block_base").value, false),
    random_primary_min: parseNullableNumber($("create_random_primary_min").value, true) ?? 0,
    random_primary_max: parseNullableNumber($("create_random_primary_max").value, true) ?? 0,
    random_secondary_min: parseNullableNumber($("create_random_secondary_min").value, true) ?? 0,
    random_secondary_max: parseNullableNumber($("create_random_secondary_max").value, true) ?? 0,
    item_set_code: parseNullableText($("create_item_set_code").value),
    crafted_tier: parseNullableNumber($("create_crafted_tier").value, true),
    binding_mode: $("create_binding_mode").value,
    is_unique_equipped: boolFromCheckbox("create_is_unique_equipped"),
    tooltip_archetype: tooltipArchetype
  };
}

function collectBaseItemFromEditForm() {
  const itemType = $("edit_item_type").value;
  const equipSlot = $("edit_equip_slot").value;
  const tooltipArchetype = $("edit_tooltip_archetype").value || inferTooltipArchetype(itemType, equipSlot);
  const rarity = $("edit_rarity").value;
  const rarityLabel = parseNullableText($("edit_rarity_label").value) || buildRarityLabelFallback(rarity, itemType, tooltipArchetype);

  return {
    item_code: $("edit_item_code").value.trim(),
    internal_name: $("edit_internal_name").value.trim(),
    display_name: $("edit_display_name").value.trim(),
    rarity,
    item_type: itemType,
    equip_slot: equipSlot || null,
    level_requirement: parseNullableNumber($("edit_level_requirement").value, true) ?? 1,
    description: $("edit_description").value.trim() || rarityLabel,
    flavor_text: $("edit_flavor_text").value.trim() || "",
    appearance_code: parseNullableText($("edit_appearance_code").value),
    min_sockets: parseNullableNumber($("edit_min_sockets").value, true) ?? 0,
    max_sockets: parseNullableNumber($("edit_max_sockets").value, true) ?? 0,
    is_equippable: true,
    is_stackable: false,
    max_stack: 1,
    inventory_width: 1,
    inventory_height: 1,
    icon_path: null,
    mesh_path: null,
    can_roll_primary_affixes: boolFromCheckbox("edit_can_roll_primary_affixes"),
    can_roll_secondary_affixes: boolFromCheckbox("edit_can_roll_secondary_affixes"),
    can_have_gems: boolFromCheckbox("edit_can_have_gems"),
    can_have_durability: true,
    base_name: $("edit_display_name").value.trim(),
    rarity_label: rarityLabel,
    source_type: $("edit_source_type").value,
    damage_min: parseNullableNumber($("edit_damage_min").value, true),
    damage_max: parseNullableNumber($("edit_damage_max").value, true),
    attacks_per_second: parseNullableNumber($("edit_attacks_per_second").value, false),
    armor_base: parseNullableNumber($("edit_armor_base").value, true),
    block_base: parseNullableNumber($("edit_block_base").value, false),
    random_primary_min: parseNullableNumber($("edit_random_primary_min").value, true) ?? 0,
    random_primary_max: parseNullableNumber($("edit_random_primary_max").value, true) ?? 0,
    random_secondary_min: parseNullableNumber($("edit_random_secondary_min").value, true) ?? 0,
    random_secondary_max: parseNullableNumber($("edit_random_secondary_max").value, true) ?? 0,
    item_set_code: parseNullableText($("edit_item_set_code").value),
    crafted_tier: parseNullableNumber($("edit_crafted_tier").value, true),
    binding_mode: $("edit_binding_mode").value,
    is_unique_equipped: boolFromCheckbox("edit_is_unique_equipped"),
    tooltip_archetype: tooltipArchetype
  };
}

function collectFixedProperties(containerId) {
  const list = [];
  const items = $(containerId).querySelectorAll(".fixed-property");

  items.forEach((el, index) => {
    const row = {
      property_code: el.querySelector('[class$="_fixed_property_code"]').value.trim(),
      property_category: el.querySelector('[class$="_fixed_property_category"]').value,
      stat_name: parseNullableText(el.querySelector('[class$="_fixed_stat_name"]').value),
      mod_type: el.querySelector('[class$="_fixed_mod_type"]').value,
      value_min: parseNullableNumber(el.querySelector('[class$="_fixed_value_min"]').value, false),
      value_max: parseNullableNumber(el.querySelector('[class$="_fixed_value_max"]').value, false),
      value2_min: parseNullableNumber(el.querySelector('[class$="_fixed_value2_min"]').value, false),
      value2_max: parseNullableNumber(el.querySelector('[class$="_fixed_value2_max"]').value, false),
      description_template: el.querySelector('[class$="_fixed_description_template"]').value.trim(),
      display_order: parseNullableNumber(el.querySelector('[class$="_fixed_display_order"]').value, true) ?? ((index + 1) * 10),
      is_always_present: el.querySelector('[class$="_fixed_is_always_present"]').checked
    };

    const hasContent =
      row.property_code ||
      row.stat_name ||
      row.description_template ||
      row.value_min !== null ||
      row.value_max !== null ||
      row.value2_min !== null ||
      row.value2_max !== null;

    if (hasContent) list.push(row);
  });

  return list;
}

function collectChoiceGroups(containerId) {
  const result = [];
  const groups = $(containerId).querySelectorAll(".choice-group");

  groups.forEach((groupEl, groupIndex) => {
    const group = {
      group_code: groupEl.querySelector('[class$="_group_code"]').value.trim(),
      display_label: groupEl.querySelector('[class$="_group_label"]').value.trim(),
      property_category: groupEl.querySelector('[class$="_group_property_category"]').value,
      choose_count: parseNullableNumber(groupEl.querySelector('[class$="_group_choose_count"]').value, true) ?? 1,
      display_order: parseNullableNumber(groupEl.querySelector('[class$="_group_display_order"]').value, true) ?? ((groupIndex + 1) * 10),
      options: []
    };

    const optionEls = groupEl.querySelectorAll(".choice-option");
    optionEls.forEach((optEl, optionIndex) => {
      const opt = {
        option_code: optEl.querySelector('[class$="_option_code"]').value.trim(),
        stat_name: parseNullableText(optEl.querySelector('[class$="_option_stat_name"]').value),
        mod_type: optEl.querySelector('[class$="_option_mod_type"]').value,
        value_min: parseNullableNumber(optEl.querySelector('[class$="_option_value_min"]').value, false),
        value_max: parseNullableNumber(optEl.querySelector('[class$="_option_value_max"]').value, false),
        value2_min: parseNullableNumber(optEl.querySelector('[class$="_option_value2_min"]').value, false),
        value2_max: parseNullableNumber(optEl.querySelector('[class$="_option_value2_max"]').value, false),
        description_template: optEl.querySelector('[class$="_option_description_template"]').value.trim(),
        spawn_weight: parseNullableNumber(optEl.querySelector('[class$="_option_spawn_weight"]').value, true) ?? 100,
        display_order: parseNullableNumber(optEl.querySelector('[class$="_option_display_order"]').value, true) ?? ((optionIndex + 1) * 10)
      };

      const hasContent =
        opt.option_code ||
        opt.stat_name ||
        opt.description_template ||
        opt.value_min !== null ||
        opt.value_max !== null ||
        opt.value2_min !== null ||
        opt.value2_max !== null;

      if (hasContent) {
        group.options.push(opt);
      }
    });

    const groupHasContent = group.group_code || group.display_label || group.options.length > 0;
    if (groupHasContent) result.push(group);
  });

  return result;
}

// ---------- item code ----------
async function generateUniqueItemCode(displayName, itemType) {
  const base = toSlug(displayName);
  const typePart = toSlug(itemType || "item");
  const prefix = `${typePart}_${base}`;

  const { data, error } = await supabaseClient
    .from("items")
    .select("item_code")
    .ilike("item_code", `${prefix}%`);

  if (error) throw error;

  const codes = (data || []).map(r => r.item_code);
  if (!codes.includes(prefix)) return prefix;

  let i = 1;
  while (codes.includes(`${prefix}_${String(i).padStart(3, "0")}`)) {
    i++;
  }

  return `${prefix}_${String(i).padStart(3, "0")}`;
}

async function refreshCreateAutoFields() {
  try {
    const displayName = $("create_display_name").value.trim();
    const itemType = $("create_item_type").value;
    const mapping = state.itemTypeMap.get(itemType);

    $("create_equip_slot").value = mapping?.equip_slot || "";
    $("create_item_code_preview").value = "";
    $("create_internal_name").value = "";

    if (!displayName || !itemType) return;

    const code = await generateUniqueItemCode(displayName, itemType);
    $("create_item_code_preview").value = code;
    $("create_internal_name").value = code;
  } catch (err) {
    showStatus(`Auto item_code konnte nicht berechnet werden:\n${err.message}`, "error");
  }
}

function refreshEditDerivedFields() {
  const itemType = $("edit_item_type").value;
  const mapping = state.itemTypeMap.get(itemType);
  $("edit_equip_slot").value = mapping?.equip_slot || "";
}

// ---------- save / update / delete ----------
async function insertItemWithChildren(baseItem, fixedRows, choiceGroups) {
  const { data: insertedItem, error: itemError } = await supabaseClient
    .from("items")
    .insert(baseItem)
    .select("id")
    .single();

  if (itemError) throw itemError;

  const itemId = insertedItem.id;

  if (fixedRows.length > 0) {
    const payload = fixedRows.map(row => ({
      item_id: itemId,
      property_code: row.property_code,
      property_category: row.property_category,
      stat_name: row.stat_name,
      mod_type: row.mod_type,
      value_min: row.value_min,
      value_max: row.value_max,
      value2_min: row.value2_min,
      value2_max: row.value2_max,
      description_template: row.description_template,
      display_order: row.display_order,
      is_always_present: row.is_always_present
    }));

    const { error } = await supabaseClient.from("item_fixed_properties").insert(payload);
    if (error) throw error;
  }

  for (const group of choiceGroups) {
    const { data: insertedGroup, error: groupError } = await supabaseClient
      .from("item_choice_groups")
      .insert({
        item_id: itemId,
        group_code: group.group_code,
        display_label: group.display_label || group.group_code,
        property_category: group.property_category,
        choose_count: group.choose_count,
        display_order: group.display_order
      })
      .select("id")
      .single();

    if (groupError) throw groupError;

    if (group.options.length > 0) {
      const optionPayload = group.options.map(opt => ({
        choice_group_id: insertedGroup.id,
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
      }));

      const { error: optionError } = await supabaseClient
        .from("item_choice_group_options")
        .insert(optionPayload);

      if (optionError) throw optionError;
    }
  }

  return itemId;
}

async function replaceItemChildren(itemId, fixedRows, choiceGroups) {
  // choice options -> groups -> fixed -> then reinsert
  const { data: oldGroups, error: oldGroupsError } = await supabaseClient
    .from("item_choice_groups")
    .select("id")
    .eq("item_id", itemId);

  if (oldGroupsError) throw oldGroupsError;

  const oldGroupIds = (oldGroups || []).map(g => g.id);

  if (oldGroupIds.length > 0) {
    const { error: deleteOptionsError } = await supabaseClient
      .from("item_choice_group_options")
      .delete()
      .in("choice_group_id", oldGroupIds);

    if (deleteOptionsError) throw deleteOptionsError;
  }

  const { error: deleteGroupsError } = await supabaseClient
    .from("item_choice_groups")
    .delete()
    .eq("item_id", itemId);

  if (deleteGroupsError) throw deleteGroupsError;

  const { error: deleteFixedError } = await supabaseClient
    .from("item_fixed_properties")
    .delete()
    .eq("item_id", itemId);

  if (deleteFixedError) throw deleteFixedError;

  if (fixedRows.length > 0) {
    const payload = fixedRows.map(row => ({
      item_id: itemId,
      property_code: row.property_code,
      property_category: row.property_category,
      stat_name: row.stat_name,
      mod_type: row.mod_type,
      value_min: row.value_min,
      value_max: row.value_max,
      value2_min: row.value2_min,
      value2_max: row.value2_max,
      description_template: row.description_template,
      display_order: row.display_order,
      is_always_present: row.is_always_present
    }));

    const { error } = await supabaseClient.from("item_fixed_properties").insert(payload);
    if (error) throw error;
  }

  for (const group of choiceGroups) {
    const { data: insertedGroup, error: groupError } = await supabaseClient
      .from("item_choice_groups")
      .insert({
        item_id: itemId,
        group_code: group.group_code,
        display_label: group.display_label || group.group_code,
        property_category: group.property_category,
        choose_count: group.choose_count,
        display_order: group.display_order
      })
      .select("id")
      .single();

    if (groupError) throw groupError;

    if (group.options.length > 0) {
      const optionPayload = group.options.map(opt => ({
        choice_group_id: insertedGroup.id,
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
      }));

      const { error: optionError } = await supabaseClient
        .from("item_choice_group_options")
        .insert(optionPayload);

      if (optionError) throw optionError;
    }
  }
}

async function createItem() {
  clearStatus();
  try {
    if (!isAllowedUser()) {
      throw new Error("Du bist nicht für dieses Tool freigeschaltet.");
    }

    const displayName = $("create_display_name").value.trim();
    const itemType = $("create_item_type").value;

    if (!displayName) throw new Error("Display Name fehlt.");
    if (!itemType) throw new Error("Item Type fehlt.");

    const itemCode = $("create_item_code_preview").value.trim() || await generateUniqueItemCode(displayName, itemType);

    const baseItem = collectBaseItemFromCreateForm(itemCode);
    const fixedRows = collectFixedProperties("createFixedList");
    const choiceGroups = collectChoiceGroups("createChoiceGroupList");

    await insertItemWithChildren(baseItem, fixedRows, choiceGroups);
    await loadItemsForList();
    resetCreateForm();

    showStatus(`Item erfolgreich angelegt:\n${itemCode}`, "ok");
    setTab("tab-list");
  } catch (err) {
    showStatus(`Item anlegen fehlgeschlagen:\n${err.message}`, "error");
  }
}

async function updateItem() {
  clearStatus();
  try {
    if (!isAllowedUser()) {
      throw new Error("Du bist nicht für dieses Tool freigeschaltet.");
    }

    const itemId = parseInt($("edit_item_id").value, 10);
    if (!itemId) throw new Error("Keine Item-ID geladen.");

    const baseItem = collectBaseItemFromEditForm();
    if (!baseItem.display_name) throw new Error("Display Name fehlt.");
    if (!baseItem.item_code) throw new Error("Item Code fehlt.");
    if (!baseItem.item_type) throw new Error("Item Type fehlt.");

    const fixedRows = collectFixedProperties("editFixedList");
    const choiceGroups = collectChoiceGroups("editChoiceGroupList");

    const { error: updateError } = await supabaseClient
      .from("items")
      .update(baseItem)
      .eq("id", itemId);

    if (updateError) throw updateError;

    await replaceItemChildren(itemId, fixedRows, choiceGroups);
    await loadItemsForList();
    await openEditItem(itemId);

    showStatus(`Item erfolgreich aktualisiert:\n${baseItem.item_code}`, "ok");
  } catch (err) {
    showStatus(`Item aktualisieren fehlgeschlagen:\n${err.message}`, "error");
  }
}

async function deleteCurrentItem() {
  clearStatus();
  try {
    if (!isAllowedUser()) {
      throw new Error("Du bist nicht für dieses Tool freigeschaltet.");
    }

    const itemId = parseInt($("edit_item_id").value, 10);
    const itemCode = $("edit_item_code").value.trim();

    if (!itemId) throw new Error("Keine Item-ID geladen.");

    const ok = confirm(`Willst du dieses Item wirklich löschen?\n\n${itemCode}`);
    if (!ok) return;

    const { data: oldGroups, error: oldGroupsError } = await supabaseClient
      .from("item_choice_groups")
      .select("id")
      .eq("item_id", itemId);

    if (oldGroupsError) throw oldGroupsError;

    const oldGroupIds = (oldGroups || []).map(g => g.id);

    if (oldGroupIds.length > 0) {
      const { error: deleteOptionsError } = await supabaseClient
        .from("item_choice_group_options")
        .delete()
        .in("choice_group_id", oldGroupIds);

      if (deleteOptionsError) throw deleteOptionsError;
    }

    const { error: deleteGroupsError } = await supabaseClient
      .from("item_choice_groups")
      .delete()
      .eq("item_id", itemId);

    if (deleteGroupsError) throw deleteGroupsError;

    const { error: deleteFixedError } = await supabaseClient
      .from("item_fixed_properties")
      .delete()
      .eq("item_id", itemId);

    if (deleteFixedError) throw deleteFixedError;

    const { error: deleteItemError } = await supabaseClient
      .from("items")
      .delete()
      .eq("id", itemId);

    if (deleteItemError) throw deleteItemError;

    $("editForm").classList.add("hidden");
    $("editHint").textContent = "Wähle links ein Item aus.";
    state.currentEditItem = null;

    await loadItemsForList();
    showStatus(`Item gelöscht:\n${itemCode}`, "ok");
  } catch (err) {
    showStatus(`Item löschen fehlgeschlagen:\n${err.message}`, "error");
  }
}

// ---------- fill / reset ----------
function resetCreateForm() {
  $("createForm").reset();
  $("create_binding_mode").value = "tradable";
  $("create_source_type").value = "drop";
  $("create_min_sockets").value = 0;
  $("create_max_sockets").value = 0;
  $("create_random_primary_min").value = 0;
  $("create_random_primary_max").value = 0;
  $("create_random_secondary_min").value = 0;
  $("create_random_secondary_max").value = 0;
  $("create_item_code_preview").value = "";
  $("create_internal_name").value = "";
  $("create_equip_slot").value = "";
  $("createFixedList").innerHTML = "";
  $("createChoiceGroupList").innerHTML = "";
}

function fillEditForm(payload) {
  const item = payload.item;

  $("edit_item_id").value = item.id;
  $("edit_display_name").value = item.display_name || "";
  $("edit_rarity").value = item.rarity || "normal";
  $("edit_item_type").value = item.item_type || "";
  $("edit_item_code").value = item.item_code || "";
  $("edit_internal_name").value = item.internal_name || "";
  $("edit_equip_slot").value = item.equip_slot || "";
  $("edit_tooltip_archetype").value = item.tooltip_archetype || "";
  $("edit_level_requirement").value = item.level_requirement ?? 1;
  $("edit_binding_mode").value = item.binding_mode || "tradable";
  $("edit_source_type").value = item.source_type || "drop";
  $("edit_crafted_tier").value = item.crafted_tier ?? "";
  $("edit_damage_min").value = item.damage_min ?? "";
  $("edit_damage_max").value = item.damage_max ?? "";
  $("edit_attacks_per_second").value = item.attacks_per_second ?? "";
  $("edit_armor_base").value = item.armor_base ?? "";
  $("edit_block_base").value = item.block_base ?? "";
  $("edit_min_sockets").value = item.min_sockets ?? 0;
  $("edit_max_sockets").value = item.max_sockets ?? 0;
  $("edit_rarity_label").value = item.rarity_label || "";
  $("edit_random_primary_min").value = item.random_primary_min ?? 0;
  $("edit_random_primary_max").value = item.random_primary_max ?? 0;
  $("edit_random_secondary_min").value = item.random_secondary_min ?? 0;
  $("edit_random_secondary_max").value = item.random_secondary_max ?? 0;
  $("edit_item_set_code").value = item.item_set_code || "";
  $("edit_appearance_code").value = item.appearance_code || "";
  $("edit_description").value = item.description || "";
  $("edit_flavor_text").value = item.flavor_text || "";

  setCheckbox("edit_is_unique_equipped", item.is_unique_equipped);
  setCheckbox("edit_can_have_gems", item.can_have_gems);
  setCheckbox("edit_can_roll_primary_affixes", item.can_roll_primary_affixes);
  setCheckbox("edit_can_roll_secondary_affixes", item.can_roll_secondary_affixes);

  $("editFixedList").innerHTML = "";
  payload.fixedRows.forEach(row => {
    $("editFixedList").insertAdjacentHTML("beforeend", createFixedPropertyHtml("e", row));
  });

  $("editChoiceGroupList").innerHTML = "";
  payload.groups.forEach(group => {
    const groupOptions = payload.options.filter(opt => opt.choice_group_id === group.id);
    $("editChoiceGroupList").insertAdjacentHTML("beforeend", createChoiceGroupHtml("e", group, groupOptions));
  });

  bindRepeaterEvents($("editFixedList"));
  bindRepeaterEvents($("editChoiceGroupList"));
}

// ---------- event wiring ----------
function wireUi() {
  $("btnLogin").addEventListener("click", login);
  $("btnLogout").addEventListener("click", logout);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  const debouncedCreateAuto = debounce(refreshCreateAutoFields, 250);

  $("create_display_name").addEventListener("input", debouncedCreateAuto);
  $("create_item_type").addEventListener("change", debouncedCreateAuto);

  $("edit_item_type").addEventListener("change", refreshEditDerivedFields);

  $("btnAddCreateFixed").addEventListener("click", () => {
    $("createFixedList").insertAdjacentHTML("beforeend", createFixedPropertyHtml("c"));
    bindRepeaterEvents($("createFixedList"));
  });

  $("btnAddCreateChoiceGroup").addEventListener("click", () => {
    $("createChoiceGroupList").insertAdjacentHTML("beforeend", createChoiceGroupHtml("c"));
    bindRepeaterEvents($("createChoiceGroupList"));
  });

  $("btnAddEditFixed").addEventListener("click", () => {
    $("editFixedList").insertAdjacentHTML("beforeend", createFixedPropertyHtml("e"));
    bindRepeaterEvents($("editFixedList"));
  });

  $("btnAddEditChoiceGroup").addEventListener("click", () => {
    $("editChoiceGroupList").insertAdjacentHTML("beforeend", createChoiceGroupHtml("e"));
    bindRepeaterEvents($("editChoiceGroupList"));
  });

  $("btnCreateReset").addEventListener("click", resetCreateForm);

  $("createForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await createItem();
  });

  $("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateItem();
  });

  $("btnDeleteItem").addEventListener("click", deleteCurrentItem);

  $("list_search").addEventListener("input", renderItemList);
  $("list_filter_rarity").addEventListener("change", renderItemList);
  $("list_filter_type").addEventListener("change", renderItemList);
  $("btnReloadList").addEventListener("click", loadItemsForList);

  $("edit_search").addEventListener("input", debounce(renderEditItemList, 150));
}

// ---------- app init ----------
async function initAppAfterAuth() {
  await getSessionAndProfile();

  if (!state.user) {
    $("authCard").classList.remove("hidden");
    $("appShell").classList.add("hidden");
    return;
  }

  if (!state.profile) {
    $("authCard").classList.remove("hidden");
    $("appShell").classList.add("hidden");
    throw new Error("Kein Profil für diesen Benutzer gefunden.");
  }

  if (!isAllowedUser()) {
    $("authCard").classList.add("hidden");
    $("appShell").classList.add("hidden");
    throw new Error(`Dieser Benutzer darf das Tool nicht verwenden.\n\nErlaubt ist nur Profil-ID:\n${ALLOWED_PROFILE_ID}`);
  }

  $("authCard").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  $("whoami").textContent = state.user.email || state.user.id;
  $("profileInfo").textContent = `${state.profile.display_name} (${state.profile.id})`;

  await loadReferenceData();
  await loadItemsForList();
  await refreshCreateAutoFields();
}

async function init() {
  wireUi();

  supabaseClient.auth.onAuthStateChange(async () => {
    try {
      await initAppAfterAuth();
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  try {
    await initAppAfterAuth();
  } catch (err) {
    if (state.user) {
      showStatus(err.message, "error");
    }
  }
}

init();
