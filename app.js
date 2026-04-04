const DEFAULT_SUPABASE_URL = "";
const DEFAULT_SUPABASE_ANON_KEY = "";

let supabaseClient = null;
let loadedEditItemId = null;

const ITEM_TYPE_META = {
  sword_1h: { equip_slot: "weapon_main", tooltip_archetype: "weapon" },
  axe_1h: { equip_slot: "weapon_main", tooltip_archetype: "weapon" },
  shield: { equip_slot: "weapon_off", tooltip_archetype: "offhand" },
  crusader_shield: { equip_slot: "weapon_off", tooltip_archetype: "offhand" },
  orb: { equip_slot: "weapon_off", tooltip_archetype: "offhand" },
  quiver: { equip_slot: "weapon_off", tooltip_archetype: "offhand" },
  book: { equip_slot: "weapon_off", tooltip_archetype: "offhand" },
  helmet: { equip_slot: "head", tooltip_archetype: "armor" },
  amulet: { equip_slot: "amulet", tooltip_archetype: "jewelry" },
  ring: { equip_slot: "ring_left", tooltip_archetype: "jewelry" },
  belt: { equip_slot: "belt", tooltip_archetype: "armor" },
  boots: { equip_slot: "feet", tooltip_archetype: "armor" },
  gloves: { equip_slot: "hand", tooltip_archetype: "armor" },
  pants: { equip_slot: "legs", tooltip_archetype: "armor" },
  bracer: { equip_slot: "sleeve", tooltip_archetype: "armor" },
  chest_armor: { equip_slot: "chest", tooltip_archetype: "armor" },
  cloak: { equip_slot: "chest", tooltip_archetype: "armor" },
  shoulder_armor: { equip_slot: "shoulders", tooltip_archetype: "armor" },
  artifact: { equip_slot: "artifact", tooltip_archetype: "artifact" }
};

function initDefaults() {
  if (DEFAULT_SUPABASE_URL) document.getElementById("supabaseUrl").value = DEFAULT_SUPABASE_URL;
  if (DEFAULT_SUPABASE_ANON_KEY) document.getElementById("supabaseAnonKey").value = DEFAULT_SUPABASE_ANON_KEY;
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function buildAutoItemCode(displayName, itemType) {
  const typePart = slugify(itemType || "item");
  const namePart = slugify(displayName || "neu");
  return `${typePart}_${namePart}`;
}

function setMsg(id, text, cls = "muted") {
  const el = document.getElementById(id);
  el.className = `msg ${cls}`;
  el.textContent = text || "";
}

function activateTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function getClient() {
  const url = document.getElementById("supabaseUrl").value.trim();
  const anonKey = document.getElementById("supabaseAnonKey").value.trim();

  if (!url || !anonKey) {
    throw new Error("Bitte Supabase URL und Anon Key eintragen.");
  }

  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(url, anonKey);
  }

  return supabaseClient;
}

function showLoggedIn(user) {
  document.getElementById("loginCard").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");
  document.getElementById("userInfo").textContent = `Eingeloggt als: ${user.email}`;
}

function showLoggedOut() {
  document.getElementById("loginCard").classList.remove("hidden");
  document.getElementById("appShell").classList.add("hidden");
}

function parseValue(key, value) {
  if (value === "" || value === null || value === undefined) return undefined;

  const intFields = [
    "level_requirement",
    "random_primary_min",
    "random_primary_max",
    "random_secondary_min",
    "random_secondary_max",
    "crafted_tier",
    "display_order"
  ];

  const floatFields = [
    "damage_min",
    "damage_max",
    "attacks_per_second",
    "armor_min",
    "armor_max",
    "value_min",
    "value_max",
    "value2_min",
    "value2_max"
  ];

  if (intFields.includes(key)) return Number.parseInt(value, 10);
  if (floatFields.includes(key)) return Number.parseFloat(value);

  if (key === "is_unique_equipped") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  if (key === "extra_data_json") return JSON.parse(value);

  return value;
}

function formToPayload(form) {
  const data = new FormData(form);
  const payload = {};

  for (const [key, value] of data.entries()) {
    if (value === "") continue;
    if (key === "extra_data_json") {
      payload.extra_data = parseValue(key, value);
    } else {
      payload[key] = parseValue(key, value);
    }
  }

  return payload;
}

function fillForm(form, row) {
  for (const el of form.elements) {
    if (!el.name) continue;

    if (el.name === "extra_data_json") {
      el.value = row.extra_data ? JSON.stringify(row.extra_data, null, 2) : "";
      continue;
    }

    const value = row[el.name];

    if (value === undefined || value === null) {
      el.value = "";
    } else if (typeof value === "boolean") {
      el.value = value ? "true" : "false";
    } else {
      el.value = value;
    }
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function updateAutoFields() {
  const displayName = document.getElementById("create_display_name").value.trim();
  const itemType = document.getElementById("create_item_type").value.trim();
  const itemCode = buildAutoItemCode(displayName, itemType);
  document.getElementById("create_item_code_preview").value = itemCode;

  const meta = ITEM_TYPE_META[itemType] || {};
  document.getElementById("create_equip_slot_preview").value = meta.equip_slot || "";
  document.getElementById("create_tooltip_archetype_preview").value = meta.tooltip_archetype || "";

  updateHeaderPreview();
}

function updateHeaderPreview() {
  const itemType = document.getElementById("create_item_type").value.trim();
  const armorMin = document.getElementById("create_armor_min").value.trim();
  const armorMax = document.getElementById("create_armor_max").value.trim();
  const damageMin = document.getElementById("create_damage_min").value.trim();
  const damageMax = document.getElementById("create_damage_max").value.trim();
  const aps = document.getElementById("create_attacks_per_second").value.trim();

  const target = document.getElementById("create_header_value_preview");
  const archetype = (ITEM_TYPE_META[itemType]?.tooltip_archetype || "");

  if (archetype === "armor") {
    if (armorMin || armorMax) {
      target.textContent = `${armorMin || "?"} - ${armorMax || "?"}\nRüstung`;
    } else {
      target.textContent = "Noch keine Rüstungswerte";
    }
    return;
  }

  if (archetype === "weapon") {
    if (damageMin || damageMax || aps) {
      target.textContent = `${damageMin || "?"} - ${damageMax || "?"} Schaden\n${aps || "?"} Angriffe pro Sekunde`;
    } else {
      target.textContent = "Noch keine Waffendaten";
    }
    return;
  }

  target.textContent = "Für diesen Typ kein Header-Basiswert vorgesehen";
}

function createFixedPrimaryRow(data = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "section-box fixed-row";
  wrapper.dataset.id = data.id || "";
  wrapper.innerHTML = `
    <div class="three-col">
      <div>
        <label>property_code</label>
        <input class="fp-property-code" value="${escapeHtml(data.property_code || "")}" placeholder="z. B. shield_block_chance" />
      </div>
      <div>
        <label>property_category</label>
        <select class="fp-property-category">
          <option value="primary">primary</option>
          <option value="secondary">secondary</option>
          <option value="power">power</option>
        </select>
      </div>
      <div>
        <label>display_order</label>
        <input class="fp-display-order" type="number" value="${data.display_order ?? ""}" placeholder="10" />
      </div>

      <div>
        <label>stat_name</label>
        <input class="fp-stat-name" value="${escapeHtml(data.stat_name || "")}" placeholder="z. B. block_chance" />
      </div>
      <div>
        <label>mod_type</label>
        <select class="fp-mod-type">
          <option value="">leer</option>
          <option value="flat">flat</option>
          <option value="percent">percent</option>
          <option value="range">range</option>
          <option value="special">special</option>
        </select>
      </div>
      <div>
        <label>ID</label>
        <input value="${escapeHtml(data.id || "")}" readonly />
      </div>

      <div>
        <label>value_min</label>
        <input class="fp-value-min" type="number" step="0.01" value="${data.value_min ?? ""}" />
      </div>
      <div>
        <label>value_max</label>
        <input class="fp-value-max" type="number" step="0.01" value="${data.value_max ?? ""}" />
      </div>
      <div>
        <label>value2_min</label>
        <input class="fp-value2-min" type="number" step="0.01" value="${data.value2_min ?? ""}" />
      </div>

      <div>
        <label>value2_max</label>
        <input class="fp-value2-max" type="number" step="0.01" value="${data.value2_max ?? ""}" />
      </div>
    </div>

    <div style="margin-top: 12px;">
      <label>description_template</label>
      <textarea class="fp-description-template" placeholder="+{value}% Blockchance">${escapeHtml(data.description_template || "")}</textarea>
    </div>

    <div class="inline-actions" style="margin-top: 12px;">
      <button type="button" class="danger remove-fixed-row-btn">Diesen Block entfernen</button>
    </div>
  `;

  wrapper.querySelector(".fp-property-category").value = data.property_category || "primary";
  wrapper.querySelector(".fp-mod-type").value = data.mod_type || "";

  wrapper.querySelector(".remove-fixed-row-btn").addEventListener("click", () => {
    wrapper.remove();
  });

  return wrapper;
}

function collectFixedRows(containerSelector) {
  return Array.from(document.querySelectorAll(`${containerSelector} .fixed-row`)).map(box => {
    const get = sel => box.querySelector(sel).value.trim();
    const id = box.dataset.id || null;
    const property_code = get(".fp-property-code");
    const property_category = get(".fp-property-category");
    const stat_name = get(".fp-stat-name");
    const mod_type = get(".fp-mod-type");
    const description_template = get(".fp-description-template");
    const display_order = get(".fp-display-order");
    const value_min = get(".fp-value-min");
    const value_max = get(".fp-value-max");
    const value2_min = get(".fp-value2-min");
    const value2_max = get(".fp-value2-max");

    if (!property_code || !property_category || !stat_name || !mod_type || !description_template) return null;

    return {
      id,
      property_code,
      property_category,
      stat_name,
      mod_type,
      value_min: value_min === "" ? null : Number(value_min),
      value_max: value_max === "" ? null : Number(value_max),
      value2_min: value2_min === "" ? null : Number(value2_min),
      value2_max: value2_max === "" ? null : Number(value2_max),
      description_template,
      display_order: display_order === "" ? 10 : Number(display_order)
    };
  }).filter(Boolean);
}

function createChoiceOptionRow(data = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "group-box choice-option-row";
  wrapper.dataset.id = data.id || "";
  wrapper.innerHTML = `
    <div class="three-col">
      <div>
        <label>option_code</label>
        <input class="co-option-code" value="${escapeHtml(data.option_code || "")}" />
      </div>
      <div>
        <label>stat_name</label>
        <input class="co-stat-name" value="${escapeHtml(data.stat_name || "")}" />
      </div>
      <div>
        <label>mod_type</label>
        <select class="co-mod-type">
          <option value="">leer</option>
          <option value="flat">flat</option>
          <option value="percent">percent</option>
          <option value="range">range</option>
          <option value="special">special</option>
        </select>
      </div>

      <div>
        <label>value_min</label>
        <input class="co-value-min" type="number" step="0.01" value="${data.value_min ?? ""}" />
      </div>
      <div>
        <label>value_max</label>
        <input class="co-value-max" type="number" step="0.01" value="${data.value_max ?? ""}" />
      </div>
      <div>
        <label>display_order</label>
        <input class="co-display-order" type="number" value="${data.display_order ?? ""}" />
      </div>

      <div>
        <label>value2_min</label>
        <input class="co-value2-min" type="number" step="0.01" value="${data.value2_min ?? ""}" />
      </div>
      <div>
        <label>value2_max</label>
        <input class="co-value2-max" type="number" step="0.01" value="${data.value2_max ?? ""}" />
      </div>
      <div>
        <label>ID</label>
        <input value="${escapeHtml(data.id || "")}" readonly />
      </div>
    </div>

    <div style="margin-top: 12px;">
      <label>description_template</label>
      <textarea class="co-description-template">${escapeHtml(data.description_template || "")}</textarea>
    </div>

    <div class="inline-actions" style="margin-top: 12px;">
      <button type="button" class="danger remove-choice-option-btn">Option entfernen</button>
    </div>
  `;

  wrapper.querySelector(".co-mod-type").value = data.mod_type || "";

  wrapper.querySelector(".remove-choice-option-btn").addEventListener("click", () => {
    wrapper.remove();
  });

  return wrapper;
}

function createChoiceGroupRow(groupData = {}, optionRows = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "section-box choice-group-row";
  wrapper.dataset.id = groupData.id || "";
  wrapper.innerHTML = `
    <div class="three-col">
      <div>
        <label>group_code</label>
        <input class="cg-group-code" value="${escapeHtml(groupData.group_code || "")}" />
      </div>
      <div>
        <label>property_category</label>
        <select class="cg-property-category">
          <option value="primary">primary</option>
          <option value="secondary">secondary</option>
          <option value="power">power</option>
        </select>
      </div>
      <div>
        <label>display_order</label>
        <input class="cg-display-order" type="number" value="${groupData.display_order ?? ""}" />
      </div>
    </div>

    <div class="subtle" style="margin-top: 12px;">Choice Options</div>
    <div class="choice-options-container"></div>

    <div class="inline-actions" style="margin-top: 12px;">
      <button type="button" class="secondary add-choice-option-btn">Option hinzufügen</button>
      <button type="button" class="danger remove-choice-group-btn">Choice Group entfernen</button>
    </div>
  `;

  wrapper.querySelector(".cg-property-category").value = groupData.property_category || "primary";

  const optionsContainer = wrapper.querySelector(".choice-options-container");
  if (optionRows.length > 0) {
    optionRows.forEach(row => optionsContainer.appendChild(createChoiceOptionRow(row)));
  }

  wrapper.querySelector(".add-choice-option-btn").addEventListener("click", () => {
    optionsContainer.appendChild(createChoiceOptionRow());
  });

  wrapper.querySelector(".remove-choice-group-btn").addEventListener("click", () => {
    wrapper.remove();
  });

  return wrapper;
}

function collectChoiceGroupRows() {
  return Array.from(document.querySelectorAll("#editChoiceGroupRows .choice-group-row")).map(groupBox => {
    const get = sel => groupBox.querySelector(sel).value.trim();
    const groupId = groupBox.dataset.id || null;

    const group_code = get(".cg-group-code");
    const property_category = get(".cg-property-category");
    const display_order = get(".cg-display-order");

    if (!group_code || !property_category) return null;

    const options = Array.from(groupBox.querySelectorAll(".choice-option-row")).map(optionBox => {
      const og = sel => optionBox.querySelector(sel).value.trim();
      const optionId = optionBox.dataset.id || null;

      const option_code = og(".co-option-code");
      const stat_name = og(".co-stat-name");
      const mod_type = og(".co-mod-type");
      const description_template = og(".co-description-template");
      const value_min = og(".co-value-min");
      const value_max = og(".co-value-max");
      const value2_min = og(".co-value2-min");
      const value2_max = og(".co-value2-max");
      const option_display_order = og(".co-display-order");

      if (!option_code || !stat_name || !mod_type || !description_template) return null;

      return {
        id: optionId,
        option_code,
        stat_name,
        mod_type,
        value_min: value_min === "" ? null : Number(value_min),
        value_max: value_max === "" ? null : Number(value_max),
        value2_min: value2_min === "" ? null : Number(value2_min),
        value2_max: value2_max === "" ? null : Number(value2_max),
        description_template,
        display_order: option_display_order === "" ? 10 : Number(option_display_order)
      };
    }).filter(Boolean);

    return {
      id: groupId,
      group_code,
      property_category,
      display_order: display_order === "" ? 10 : Number(display_order),
      options
    };
  }).filter(Boolean);
}

async function login() {
  try {
    const client = getClient();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    showLoggedIn(data.user);
    setMsg("authMsg", "Login erfolgreich.", "success");
    await loadItems();
  } catch (err) {
    setMsg("authMsg", err.message || String(err), "error");
  }
}

async function checkSession() {
  try {
    const client = getClient();
    const { data, error } = await client.auth.getUser();
    if (error) throw error;

    if (data.user) {
      showLoggedIn(data.user);
      setMsg("authMsg", "Session gefunden.", "success");
      await loadItems();
    } else {
      showLoggedOut();
      setMsg("authMsg", "Keine aktive Session gefunden.", "muted");
    }
  } catch (err) {
    setMsg("authMsg", err.message || String(err), "error");
  }
}

async function logout() {
  try {
    const client = getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    showLoggedOut();
    setMsg("authMsg", "Ausgeloggt.", "muted");
  } catch (err) {
    alert(err.message || String(err));
  }
}

async function loadItems() {
  try {
    const client = getClient();
    setMsg("listMsg", "Lade Items ...", "muted");

    let query = client.from("items").select("*").order("id", { ascending: false }).limit(300);

    const itemCode = document.getElementById("filterItemCode").value.trim();
    const displayName = document.getElementById("filterDisplayName").value.trim();
    const rarity = document.getElementById("filterRarity").value.trim();
    const itemType = document.getElementById("filterItemType").value.trim();

    if (itemCode) query = query.ilike("item_code", `%${itemCode}%`);
    if (displayName) query = query.ilike("display_name", `%${displayName}%`);
    if (rarity) query = query.eq("rarity", rarity);
    if (itemType) query = query.ilike("item_type", `%${itemType}%`);

    const { data, error } = await query;
    if (error) throw error;

    const tbody = document.querySelector("#itemsTable tbody");
    tbody.innerHTML = "";

    for (const row of data) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.id ?? ""}</td>
        <td><button type="button" class="item-row-btn" data-id="${row.id}">${escapeHtml(row.item_code ?? "")}</button></td>
        <td>${escapeHtml(row.display_name ?? "")}</td>
        <td>${escapeHtml(row.rarity ?? "")}</td>
        <td>${escapeHtml(row.item_type ?? "")}</td>
        <td>${escapeHtml(row.equip_slot ?? "")}</td>
        <td><button type="button" class="secondary edit-row-btn" data-id="${row.id}">Bearbeiten</button></td>
      `;
      tbody.appendChild(tr);
    }

    document.querySelectorAll(".item-row-btn, .edit-row-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await loadItemById(btn.dataset.id);
        activateTab("tab-edit");
      });
    });

    setMsg("listMsg", `${data.length} Items geladen.`, "success");
  } catch (err) {
    setMsg("listMsg", err.message || String(err), "error");
  }
}

async function createItem(event) {
  event.preventDefault();
  try {
    const client = getClient();
    setMsg("createMsg", "Speichere Item ...", "muted");

    const displayName = document.getElementById("create_display_name").value.trim();
    const itemType = document.getElementById("create_item_type").value.trim();
    const itemCode = buildAutoItemCode(displayName, itemType);
    const meta = ITEM_TYPE_META[itemType] || {};

    if (!displayName) throw new Error("display_name fehlt.");
    if (!itemType) throw new Error("item_type fehlt.");
    if (!itemCode) throw new Error("item_code konnte nicht erzeugt werden.");

    const payload = formToPayload(document.getElementById("createItemForm"));
    payload.item_code = itemCode;
    if (meta.equip_slot) payload.equip_slot = meta.equip_slot;
    if (meta.tooltip_archetype) payload.tooltip_archetype = meta.tooltip_archetype;
    if (!payload.binding_mode) payload.binding_mode = "tradable";

    const { data: insertedItems, error: itemError } = await client
      .from("items")
      .insert([payload])
      .select();

    if (itemError) throw itemError;
    const itemRow = insertedItems[0];
    const itemId = itemRow.id;

    const fixedPrimaryRows = collectFixedRows("#fixedPrimaryRows").map(row => ({
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
      display_order: row.display_order
    }));

    const powerTemplate = document.getElementById("power_description_template").value.trim();
    const powerValueMin = document.getElementById("power_value_min").value.trim();
    const powerValueMax = document.getElementById("power_value_max").value.trim();

    if (powerTemplate) {
      fixedPrimaryRows.push({
        item_id: itemId,
        property_code: `${itemCode}_power`,
        property_category: "power",
        stat_name: "legendary_power",
        mod_type: "special",
        value_min: powerValueMin === "" ? null : Number(powerValueMin),
        value_max: powerValueMax === "" ? null : Number(powerValueMax),
        value2_min: null,
        value2_max: null,
        description_template: powerTemplate,
        display_order: 10
      });
    }

    if (fixedPrimaryRows.length > 0) {
      const { error: fixedError } = await client
        .from("item_fixed_properties")
        .insert(fixedPrimaryRows);
      if (fixedError) throw fixedError;
    }

    const mainstatValueMin = document.getElementById("mainstat_value_min").value.trim();
    const mainstatValueMax = document.getElementById("mainstat_value_max").value.trim();

    if (mainstatValueMin || mainstatValueMax) {
      const groupCode = `${itemCode}_mainstat`;
      const { data: insertedGroups, error: groupError } = await client
        .from("item_choice_groups")
        .insert([{
          item_id: itemId,
          group_code: groupCode,
          property_category: "primary",
          display_order: 100
        }])
        .select();

      if (groupError) throw groupError;
      const choiceGroupId = insertedGroups[0].id;

      const choiceOptions = [
        {
          choice_group_id: choiceGroupId,
          option_code: "mainstat_str",
          stat_name: "strength",
          mod_type: "flat",
          value_min: mainstatValueMin === "" ? null : Number(mainstatValueMin),
          value_max: mainstatValueMax === "" ? null : Number(mainstatValueMax),
          value2_min: null,
          value2_max: null,
          description_template: "+{value} Stärke",
          display_order: 10
        },
        {
          choice_group_id: choiceGroupId,
          option_code: "mainstat_dex",
          stat_name: "dexterity",
          mod_type: "flat",
          value_min: mainstatValueMin === "" ? null : Number(mainstatValueMin),
          value_max: mainstatValueMax === "" ? null : Number(mainstatValueMax),
          value2_min: null,
          value2_max: null,
          description_template: "+{value} Geschicklichkeit",
          display_order: 20
        },
        {
          choice_group_id: choiceGroupId,
          option_code: "mainstat_int",
          stat_name: "intelligence",
          mod_type: "flat",
          value_min: mainstatValueMin === "" ? null : Number(mainstatValueMin),
          value_max: mainstatValueMax === "" ? null : Number(mainstatValueMax),
          value2_min: null,
          value2_max: null,
          description_template: "+{value} Intelligenz",
          display_order: 30
        }
      ];

      const { error: optionError } = await client
        .from("item_choice_group_options")
        .insert(choiceOptions);

      if (optionError) throw optionError;
    }

    setMsg("createMsg", `Item erfolgreich gespeichert.\n\nID: ${itemId}\nitem_code: ${itemCode}`, "success");
    resetCreateForm();
    await loadItems();
    activateTab("tab-list");
  } catch (err) {
    setMsg("createMsg", err.message || String(err), "error");
  }
}

async function loadItemForEdit() {
  try {
    const client = getClient();
    const itemCode = document.getElementById("editLookupItemCode").value.trim();
    if (!itemCode) throw new Error("Bitte item_code eingeben.");

    const { data, error } = await client
      .from("items")
      .select("*")
      .eq("item_code", itemCode)
      .order("id", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Kein Item gefunden.");

    await loadItemById(data[0].id);
  } catch (err) {
    setMsg("editMsg", err.message || String(err), "error");
  }
}

async function loadItemById(id) {
  try {
    const client = getClient();

    const { data, error } = await client
      .from("items")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Kein Item gefunden.");

    const row = data[0];
    loadedEditItemId = row.id;
    fillForm(document.getElementById("editItemForm"), row);

    const { data: fixedProps, error: fixedError } = await client
      .from("item_fixed_properties")
      .select("*")
      .eq("item_id", row.id)
      .order("property_category", { ascending: true })
      .order("display_order", { ascending: true });

    if (fixedError) throw fixedError;

    const { data: choiceGroups, error: groupError } = await client
      .from("item_choice_groups")
      .select("*")
      .eq("item_id", row.id)
      .order("display_order", { ascending: true });

    if (groupError) throw groupError;

    let allOptions = [];
    if (choiceGroups.length > 0) {
      const groupIds = choiceGroups.map(g => g.id);
      const { data: options, error: optionError } = await client
        .from("item_choice_group_options")
        .select("*")
        .in("choice_group_id", groupIds)
        .order("display_order", { ascending: true });

      if (optionError) throw optionError;
      allOptions = options;
    }

    const fixedContainer = document.getElementById("editFixedRows");
    fixedContainer.innerHTML = "";
    fixedProps.forEach(fp => fixedContainer.appendChild(createFixedPrimaryRow(fp)));

    const groupContainer = document.getElementById("editChoiceGroupRows");
    groupContainer.innerHTML = "";
    choiceGroups.forEach(group => {
      const groupOptions = allOptions.filter(o => o.choice_group_id === group.id);
      groupContainer.appendChild(createChoiceGroupRow(group, groupOptions));
    });

    setMsg("editMsg", `Item geladen: ${row.item_code}`, "success");
  } catch (err) {
    setMsg("editMsg", err.message || String(err), "error");
  }
}

async function saveFixedProperties(client, itemId) {
  const rows = collectFixedRows("#editFixedRows");

  const { data: existingRows, error: existingError } = await client
    .from("item_fixed_properties")
    .select("id")
    .eq("item_id", itemId);

  if (existingError) throw existingError;

  const existingIds = new Set(existingRows.map(r => String(r.id)));
  const incomingIds = new Set(rows.filter(r => r.id).map(r => String(r.id)));

  const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await client
      .from("item_fixed_properties")
      .delete()
      .in("id", idsToDelete);
    if (deleteError) throw deleteError;
  }

  for (const row of rows) {
    const payload = {
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
      display_order: row.display_order
    };

    if (row.id) {
      const { error: updateError } = await client
        .from("item_fixed_properties")
        .update(payload)
        .eq("id", row.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client
        .from("item_fixed_properties")
        .insert([payload]);
      if (insertError) throw insertError;
    }
  }
}

async function saveChoiceGroupsAndOptions(client, itemId) {
  const rows = collectChoiceGroupRows();

  const { data: existingGroups, error: groupsFetchError } = await client
    .from("item_choice_groups")
    .select("id")
    .eq("item_id", itemId);

  if (groupsFetchError) throw groupsFetchError;

  const existingGroupIds = new Set(existingGroups.map(g => String(g.id)));
  const incomingGroupIds = new Set(rows.filter(g => g.id).map(g => String(g.id)));
  const groupIdsToDelete = [...existingGroupIds].filter(id => !incomingGroupIds.has(id));

  if (groupIdsToDelete.length > 0) {
    const { error: deleteOptionsError } = await client
      .from("item_choice_group_options")
      .delete()
      .in("choice_group_id", groupIdsToDelete);
    if (deleteOptionsError) throw deleteOptionsError;

    const { error: deleteGroupsError } = await client
      .from("item_choice_groups")
      .delete()
      .in("id", groupIdsToDelete);
    if (deleteGroupsError) throw deleteGroupsError;
  }

  for (const group of rows) {
    const groupPayload = {
      item_id: itemId,
      group_code: group.group_code,
      property_category: group.property_category,
      display_order: group.display_order
    };

    let choiceGroupId = group.id;

    if (group.id) {
      const { error: updateGroupError } = await client
        .from("item_choice_groups")
        .update(groupPayload)
        .eq("id", group.id);
      if (updateGroupError) throw updateGroupError;
    } else {
      const { data: insertedGroup, error: insertGroupError } = await client
        .from("item_choice_groups")
        .insert([groupPayload])
        .select();
      if (insertGroupError) throw insertGroupError;
      choiceGroupId = insertedGroup[0].id;
    }

    const { data: existingOptions, error: optionsFetchError } = await client
      .from("item_choice_group_options")
      .select("id")
      .eq("choice_group_id", choiceGroupId);

    if (optionsFetchError) throw optionsFetchError;

    const existingOptionIds = new Set(existingOptions.map(o => String(o.id)));
    const incomingOptionIds = new Set(group.options.filter(o => o.id).map(o => String(o.id)));
    const optionIdsToDelete = [...existingOptionIds].filter(id => !incomingOptionIds.has(id));

    if (optionIdsToDelete.length > 0) {
      const { error: deleteOptionError } = await client
        .from("item_choice_group_options")
        .delete()
        .in("id", optionIdsToDelete);
      if (deleteOptionError) throw deleteOptionError;
    }

    for (const option of group.options) {
      const optionPayload = {
        choice_group_id: choiceGroupId,
        option_code: option.option_code,
        stat_name: option.stat_name,
        mod_type: option.mod_type,
        value_min: option.value_min,
        value_max: option.value_max,
        value2_min: option.value2_min,
        value2_max: option.value2_max,
        description_template: option.description_template,
        display_order: option.display_order
      };

      if (option.id) {
        const { error: updateOptionError } = await client
          .from("item_choice_group_options")
          .update(optionPayload)
          .eq("id", option.id);
        if (updateOptionError) throw updateOptionError;
      } else {
        const { error: insertOptionError } = await client
          .from("item_choice_group_options")
          .insert([optionPayload]);
        if (insertOptionError) throw insertOptionError;
      }
    }
  }
}

async function updateItem(event) {
  event.preventDefault();
  try {
    const client = getClient();
    if (!loadedEditItemId) throw new Error("Kein Item geladen.");

    const form = document.getElementById("editItemForm");
    const payload = formToPayload(form);
    delete payload.id;

    const { error: itemUpdateError } = await client
      .from("items")
      .update(payload)
      .eq("id", loadedEditItemId);

    if (itemUpdateError) throw itemUpdateError;

    await saveFixedProperties(client, loadedEditItemId);
    await saveChoiceGroupsAndOptions(client, loadedEditItemId);

    setMsg("editMsg", "Item und Kinddaten erfolgreich gespeichert.", "success");
    await loadItems();
    await loadItemById(loadedEditItemId);
  } catch (err) {
    setMsg("editMsg", err.message || String(err), "error");
  }
}

async function deleteItemWithChildren() {
  try {
    const client = getClient();

    if (!loadedEditItemId) throw new Error("Kein Item geladen.");
    const ok = window.confirm("Dieses Item inklusive item_fixed_properties, item_choice_groups und item_choice_group_options wirklich löschen?");
    if (!ok) return;

    const { data: groups, error: groupFetchError } = await client
      .from("item_choice_groups")
      .select("id")
      .eq("item_id", loadedEditItemId);

    if (groupFetchError) throw groupFetchError;

    const groupIds = groups.map(g => g.id);

    if (groupIds.length > 0) {
      const { error: deleteOptionsError } = await client
        .from("item_choice_group_options")
        .delete()
        .in("choice_group_id", groupIds);
      if (deleteOptionsError) throw deleteOptionsError;
    }

    const { error: deleteGroupsError } = await client
      .from("item_choice_groups")
      .delete()
      .eq("item_id", loadedEditItemId);
    if (deleteGroupsError) throw deleteGroupsError;

    const { error: deleteFixedError } = await client
      .from("item_fixed_properties")
      .delete()
      .eq("item_id", loadedEditItemId);
    if (deleteFixedError) throw deleteFixedError;

    const { error: deleteItemError } = await client
      .from("items")
      .delete()
      .eq("id", loadedEditItemId);
    if (deleteItemError) throw deleteItemError;

    loadedEditItemId = null;
    document.getElementById("editItemForm").reset();
    document.getElementById("editFixedRows").innerHTML = "";
    document.getElementById("editChoiceGroupRows").innerHTML = "";

    setMsg("editMsg", "Item inklusive Kinder-Daten gelöscht.", "success");
    await loadItems();
    activateTab("tab-list");
  } catch (err) {
    setMsg("editMsg", err.message || String(err), "error");
  }
}

function wireCreateLivePreview() {
  [
    "create_display_name",
    "create_item_type",
    "create_armor_min",
    "create_armor_max",
    "create_damage_min",
    "create_damage_max",
    "create_attacks_per_second"
  ].forEach(id => {
    document.getElementById(id).addEventListener("input", updateAutoFields);
    document.getElementById(id).addEventListener("change", updateAutoFields);
  });
}

function resetCreateForm() {
  document.getElementById("createItemForm").reset();
  document.getElementById("fixedPrimaryRows").innerHTML = "";
  document.getElementById("create_binding_mode").value = "tradable";
  document.getElementById("mainstat_value_min").value = "626";
  document.getElementById("mainstat_value_max").value = "750";
  updateAutoFields();
  setMsg("createMsg", "", "muted");
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("checkSessionBtn").addEventListener("click", checkSession);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("refreshItemsBtn").addEventListener("click", loadItems);

document.getElementById("createItemForm").addEventListener("submit", createItem);
document.getElementById("resetCreateBtn").addEventListener("click", resetCreateForm);
document.getElementById("addFixedPrimaryBtn").addEventListener("click", () => {
  document.getElementById("fixedPrimaryRows").appendChild(createFixedPrimaryRow({ property_category: "primary", display_order: 10 }));
});

document.getElementById("loadItemForEditBtn").addEventListener("click", loadItemForEdit);
document.getElementById("editItemForm").addEventListener("submit", updateItem);
document.getElementById("deleteItemBtn").addEventListener("click", deleteItemWithChildren);

document.getElementById("addEditFixedBtn").addEventListener("click", () => {
  document.getElementById("editFixedRows").appendChild(createFixedPrimaryRow({ property_category: "primary", display_order: 10 }));
});

document.getElementById("addEditChoiceGroupBtn").addEventListener("click", () => {
  document.getElementById("editChoiceGroupRows").appendChild(createChoiceGroupRow({ property_category: "primary", display_order: 100 }, []));
});

initDefaults();
wireCreateLivePreview();
resetCreateForm();
checkSession();
