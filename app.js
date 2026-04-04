let supabaseClient = null;

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

function setMsg(id, text, cls = "muted") {
  const el = document.getElementById(id);
  el.className = `msg ${cls}`;
  el.textContent = text;
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

function activateTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function parseValue(key, value) {
  if (value === "") return undefined;

  const intFields = [
    "level_requirement",
    "random_primary_min",
    "random_primary_max",
    "random_secondary_min",
    "random_secondary_max",
    "crafted_tier"
  ];

  const floatFields = [
    "damage_min",
    "damage_max",
    "attacks_per_second",
    "armor_min",
    "armor_max"
  ];

  if (intFields.includes(key)) return Number.parseInt(value, 10);
  if (floatFields.includes(key)) return Number.parseFloat(value);

  if (key === "is_unique_equipped") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  if (key === "extra_data_json") {
    return JSON.parse(value);
  }

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

    if (value === null || value === undefined) {
      el.value = "";
    } else if (typeof value === "boolean") {
      el.value = value ? "true" : "false";
    } else {
      el.value = value;
    }
  }
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
    setMsg("listMsg", "Lade Items...", "muted");

    const filterCode = document.getElementById("filterItemCode").value.trim();
    const filterRarity = document.getElementById("filterRarity").value.trim();
    const filterItemType = document.getElementById("filterItemType").value.trim();

    let query = client
      .from("items")
      .select("*")
      .order("id", { ascending: false })
      .limit(200);

    if (filterCode) query = query.ilike("item_code", `%${filterCode}%`);
    if (filterRarity) query = query.eq("rarity", filterRarity);
    if (filterItemType) query = query.ilike("item_type", `%${filterItemType}%`);

    const { data, error } = await query;
    if (error) throw error;

    const tbody = document.querySelector("#itemsTable tbody");
    tbody.innerHTML = "";

    for (const row of data) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.id ?? ""}</td>
        <td>${row.item_code ?? ""}</td>
        <td>${row.display_name ?? ""}</td>
        <td>${row.rarity ?? ""}</td>
        <td>${row.item_type ?? ""}</td>
        <td>${row.equip_slot ?? ""}</td>
        <td><button type="button" class="secondary edit-row-btn" data-id="${row.id}">Bearbeiten</button></td>
      `;
      tbody.appendChild(tr);
    }

    document.querySelectorAll(".edit-row-btn").forEach(btn => {
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
    const form = document.getElementById("createItemForm");
    const payload = formToPayload(form);

    if (!payload.item_code || !payload.display_name) {
      throw new Error("item_code und display_name sind Pflichtfelder.");
    }

    const { data, error } = await client
      .from("items")
      .insert([payload])
      .select();

    if (error) throw error;

    setMsg("createMsg", `Item gespeichert:\n${JSON.stringify(data, null, 2)}`, "success");
    form.reset();
    await loadItems();
    activateTab("tab-list");
  } catch (err) {
    setMsg("createMsg", err.message || String(err), "error");
  }
}

async function loadItemForEdit() {
  try {
    const code = document.getElementById("editLookupItemCode").value.trim();
    if (!code) throw new Error("Bitte item_code eingeben.");

    const client = getClient();
    const { data, error } = await client
      .from("items")
      .select("*")
      .eq("item_code", code)
      .order("id", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Kein Item gefunden.");

    fillForm(document.getElementById("editItemForm"), data[0]);
    setMsg("editMsg", `Item geladen: ${data[0].item_code}`, "success");
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

    fillForm(document.getElementById("editItemForm"), data[0]);
    setMsg("editMsg", `Item geladen: ${data[0].item_code}`, "success");
  } catch (err) {
    setMsg("editMsg", err.message || String(err), "error");
  }
}

async function updateItem(event) {
  event.preventDefault();
  try {
    const client = getClient();
    const form = document.getElementById("editItemForm");
    const payload = formToPayload(form);
    const id = payload.id;

    if (!id) throw new Error("Kein Item geladen.");

    delete payload.id;

    const { data, error } = await client
      .from("items")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) throw error;

    setMsg("editMsg", `Item aktualisiert:\n${JSON.stringify(data, null, 2)}`, "success");
    await loadItems();
    activateTab("tab-list");
  } catch (err) {
    setMsg("editMsg", err.message || String(err), "error");
  }
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("checkSessionBtn").addEventListener("click", checkSession);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("refreshItemsBtn").addEventListener("click", loadItems);
document.getElementById("createItemForm").addEventListener("submit", createItem);
document.getElementById("resetCreateBtn").addEventListener("click", () => {
  document.getElementById("createItemForm").reset();
  setMsg("createMsg", "", "muted");
});
document.getElementById("loadItemForEditBtn").addEventListener("click", loadItemForEdit);
document.getElementById("editItemForm").addEventListener("submit", updateItem);

// optional:
checkSession();
