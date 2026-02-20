/* 
  app.js — Training Log + Video Vault
  ----------------------------------
  Goal:
  - Excel links open a specific exercise entry.
  - You can paste video links and comments (lifter + coach).
  - Everything is organized: period → block → week → day → exercise
  - Works as a static site (GitHub Pages / Netlify / Cloudflare Pages).

  IMPORTANT: Static hosting cannot save files to the server by itself.
  So we do this:
  - Base data lives in data/data.json
  - Your edits are saved in the browser (LocalStorage)
  - You can Export JSON as a backup, and Import JSON to restore/move to another device.

  URL format:
    #/p/<periodId>/b/<blockId>/w/<week>/d/<day>/e/<exerciseId>

  Example:
    https://YOURDOMAIN/#/p/serie-1-2026/b/1/w/3/d/2/e/squat

  Where do IDs come from?
  - periodId and exerciseId are "slugs" (lowercase, no spaces).
  - You can keep the display name separately (e.g. "Serie 1 2026", "Squat").
*/

const DATA_URL = "data/data.json";
const STORAGE_KEY = "trainingLogSite.v1.localEdits";     // local edits (patches)
const STORAGE_BASE_KEY = "trainingLogSite.v1.importBase"; // optional imported full base

// --- Tiny helpers -----------------------------------------------------------

function $(id){ return document.getElementById(id); }

function slugify(str){
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

function nowIso(){
  return new Date().toISOString();
}

function toast(msg){
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2200);
}

function safeJsonParse(str, fallback){
  try{ return JSON.parse(str); }catch{ return fallback; }
}

function downloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// Convert a normal YouTube URL into an embed URL, if possible.
function youtubeEmbedUrl(url){
  try{
    const u = new URL(url);
    if (!/youtube\.com|youtu\.be/.test(u.hostname)) return null;

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")){
      const id = u.pathname.replace("/","");
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    // youtube.com/watch?v=<id>
    if (u.pathname.includes("/watch")){
      const id = u.searchParams.get("v");
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    // youtube.com/shorts/<id>
    if (u.pathname.includes("/shorts/")){
      const parts = u.pathname.split("/");
      const id = parts[parts.indexOf("shorts")+1];
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    return null;
  }catch{
    return null;
  }
}

// --- Data loading strategy --------------------------------------------------
//
// 1) Fetch base data from data/data.json
// 2) If user has imported a "base" JSON before, prefer that (STORAGE_BASE_KEY)
// 3) Apply local edits patch (STORAGE_KEY)

async function fetchBaseData(){
  // If user previously imported a full base, use it instead of the shipped file.
  const imported = localStorage.getItem(STORAGE_BASE_KEY);
  if (imported){
    const obj = safeJsonParse(imported, null);
    if (obj) return obj;
  }

  const res = await fetch(DATA_URL, {cache:"no-store"});
  if (!res.ok) throw new Error("Failed to load base data.json");
  return await res.json();
}

// Local edits are stored as a map from entryKey -> patch object.
function loadEdits(){
  return safeJsonParse(localStorage.getItem(STORAGE_KEY) || "{}", {});
}

function saveEdits(edits){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
}

function clearEdits(){
  localStorage.removeItem(STORAGE_KEY);
}

function setImportedBase(obj){
  localStorage.setItem(STORAGE_BASE_KEY, JSON.stringify(obj));
}

function clearImportedBase(){
  localStorage.removeItem(STORAGE_BASE_KEY);
}

// Unique key for an entry (stable for LocalStorage)
function entryKey(periodId, blockId, week, day, exerciseId){
  return [periodId, blockId, week, day, exerciseId].join("|");
}

// Merge local edits into a live entry object
function applyPatchToEntry(entry, patch){
  if (!patch) return entry;

  const out = {...entry};
  if (typeof patch.work === "string") out.work = patch.work;
  if (Array.isArray(patch.videos)) out.videos = [...patch.videos];
  if (typeof patch.lifterComment === "string") out.lifterComment = patch.lifterComment;
  if (typeof patch.coachComment === "string") out.coachComment = patch.coachComment;
  if (typeof patch.updatedAt === "string") out.updatedAt = patch.updatedAt;
  return out;
}

// --- In-memory state --------------------------------------------------------

let baseData = null;   // object from JSON
let edits = loadEdits();
let currentRole = "lifter"; // or "coach"

// Current selection
let sel = {
  periodId: null,
  blockId: null,
  week: null,
  day: null,
  exerciseId: null
};

// --- UI wiring --------------------------------------------------------------

function setRole(role){
  currentRole = role;
  $("roleLifter").classList.toggle("active", role === "lifter");
  $("roleCoach").classList.toggle("active", role === "coach");
  // Focus the relevant textarea to make role useful
  if (role === "lifter") $("lifterComment").focus();
  else $("coachComment").focus();
}

function showView(name){
  const views = ["overviewView","exerciseView","searchView"];
  for (const v of views) $(v).classList.add("hidden");
  $(name).classList.remove("hidden");
}

// --- Data navigation helpers ------------------------------------------------

// Find the selected objects from baseData.
function getPeriod(periodId){
  return baseData.periods.find(p => p.id === periodId);
}

function getBlock(period, blockId){
  return period.blocks.find(b => String(b.id) === String(blockId));
}

function getWeek(block, week){
  return block.weeks.find(w => Number(w.week) === Number(week));
}

function getDay(weekObj, day){
  return weekObj.days.find(d => Number(d.day) === Number(day));
}

function getExercise(dayObj, exerciseId){
  return dayObj.exercises.find(e => e.id === exerciseId);
}

// Build a fully patched entry for display
function getPatchedEntry(periodId, blockId, week, day, exerciseId){
  const period = getPeriod(periodId);
  if (!period) return null;
  const block = getBlock(period, blockId);
  if (!block) return null;
  const weekObj = getWeek(block, week);
  if (!weekObj) return null;
  const dayObj = getDay(weekObj, day);
  if (!dayObj) return null;
  const ex = getExercise(dayObj, exerciseId);
  if (!ex) return null;

  const key = entryKey(periodId, blockId, week, day, exerciseId);
  const patch = edits[key];

  return applyPatchToEntry({
    periodId,
    periodName: period.name,
    blockId: block.id,
    week: weekObj.week,
    day: dayObj.day,
    exerciseId: ex.id,
    exerciseName: ex.name,
    work: ex.work || "",
    videos: Array.isArray(ex.videos) ? ex.videos : [],
    lifterComment: ex.lifterComment || "",
    coachComment: ex.coachComment || "",
    updatedAt: ex.updatedAt || null
  }, patch);
}

// For drop-downs
function listBlocks(period){
  return period.blocks.map(b => ({id: b.id}));
}
function listWeeks(block){
  return block.weeks.map(w => ({week: w.week}));
}
function listDays(weekObj){
  return weekObj.days.map(d => ({day: d.day, label: d.label || `Day ${d.day}`}));
}
function listExercises(dayObj){
  return dayObj.exercises.map(e => ({id: e.id, name: e.name}));
}

// --- Routing ---------------------------------------------------------------
//
// Read hash on load: #/p/.../b/.../w/.../d/.../e/...
// If no hash: show overview.

function parseHash(){
  const h = (location.hash || "").replace(/^#\/?/, "");
  if (!h) return null;
  const parts = h.split("/").filter(Boolean);
  const out = {};
  for (let i=0; i<parts.length; i+=2){
    out[parts[i]] = parts[i+1];
  }
  if (!out.p) return null;
  return {
    periodId: out.p,
    blockId: out.b,
    week: out.w ? Number(out.w) : null,
    day: out.d ? Number(out.d) : null,
    exerciseId: out.e || null
  };
}

function makeHash(periodId, blockId, week, day, exerciseId){
  return `#/p/${periodId}/b/${blockId}/w/${week}/d/${day}/e/${exerciseId}`;
}

function syncHashFromSelection(){
  if (!sel.periodId) return;
  if (!sel.blockId || !sel.week || !sel.day || !sel.exerciseId) return;
  location.hash = makeHash(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
}

// --- Rendering --------------------------------------------------------------

function renderSelect(selectEl, options, getValue, getLabel){
  selectEl.innerHTML = "";
  for (const opt of options){
    const o = document.createElement("option");
    o.value = getValue(opt);
    o.textContent = getLabel(opt);
    selectEl.appendChild(o);
  }
}

function renderNav(){
  // Period dropdown
  renderSelect($("periodSelect"), baseData.periods, p => p.id, p => p.name);

  // Ensure selection exists
  if (!sel.periodId) sel.periodId = baseData.periods[0]?.id || null;
  $("periodSelect").value = sel.periodId;

  const period = getPeriod(sel.periodId);

  // Blocks
  const blocks = listBlocks(period);
  renderSelect($("blockSelect"), blocks, b => b.id, b => `Block ${b.id}`);
  if (!sel.blockId) sel.blockId = blocks[0]?.id || null;
  $("blockSelect").value = String(sel.blockId);

  const block = getBlock(period, sel.blockId);

  // Weeks
  const weeks = listWeeks(block);
  renderSelect($("weekSelect"), weeks, w => w.week, w => `Week ${w.week}`);
  if (!sel.week) sel.week = weeks[0]?.week || null;
  $("weekSelect").value = String(sel.week);

  const weekObj = getWeek(block, sel.week);

  // Days
  const days = listDays(weekObj);
  renderSelect($("daySelect"), days, d => d.day, d => d.label);
  if (!sel.day) sel.day = days[0]?.day || null;
  $("daySelect").value = String(sel.day);

  const dayObj = getDay(weekObj, sel.day);

  // Exercises
  const exercises = listExercises(dayObj);
  renderSelect($("exerciseSelect"), exercises, e => e.id, e => e.name);
  if (!sel.exerciseId) sel.exerciseId = exercises[0]?.id || null;
  $("exerciseSelect").value = String(sel.exerciseId);

  // Link preview
  const full = location.origin + location.pathname + makeHash(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
  $("linkPreview").textContent = full;
}

function renderOverview(){
  showView("overviewView");

  // KPIs
  const totalPeriods = baseData.periods.length;

  let totalEntries = 0;
  for (const p of baseData.periods){
    for (const b of p.blocks){
      for (const w of b.weeks){
        for (const d of w.days){
          totalEntries += d.exercises.length;
        }
      }
    }
  }

  const editedKeys = Object.keys(edits);
  const totalEdits = editedKeys.length;

  const kpis = $("kpis");
  kpis.innerHTML = "";
  const makeKpi = (num, lab) => {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<div class="num">${num}</div><div class="lab">${lab}</div>`;
    return div;
  };
  kpis.appendChild(makeKpi(totalPeriods, "Training periods"));
  kpis.appendChild(makeKpi(totalEntries, "Exercise entries"));
  kpis.appendChild(makeKpi(totalEdits, "Edited entries (this browser)"));

  // Recent edits list (sorted by updatedAt)
  const recent = editedKeys
    .map(k => ({k, ...edits[k]}))
    .filter(x => x.updatedAt)
    .sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 12);

  const list = $("recentEdits");
  list.innerHTML = "";

  if (recent.length === 0){
    list.innerHTML = `<div class="hint">No edits yet. Click into an exercise and add a video/comment.</div>`;
    return;
  }

  for (const r of recent){
    const [periodId, blockId, week, day, exerciseId] = r.k.split("|");
    const entry = getPatchedEntry(periodId, blockId, Number(week), Number(day), exerciseId);
    if (!entry) continue;

    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item-title">${entry.exerciseName}</div>
      <div class="item-sub">${entry.periodName} • Block ${entry.blockId} • Week ${entry.week} • Day ${entry.day}</div>
      <div class="item-actions">
        <button class="btn secondary" data-go="${makeHash(periodId, blockId, week, day, exerciseId)}">Open</button>
      </div>
    `;
    item.querySelector("button").addEventListener("click", () => {
      location.hash = item.querySelector("button").dataset.go;
    });
    list.appendChild(item);
  }
}

function renderExercise(){
  const entry = getPatchedEntry(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
  if (!entry){
    renderOverview();
    return;
  }

  showView("exerciseView");

  const crumb = `${entry.periodName} → Block ${entry.blockId} → Week ${entry.week} → Day ${entry.day} → ${entry.exerciseName}`;
  $("crumbTitle").textContent = entry.exerciseName;
  $("crumbs").textContent = crumb;

  // Work box
  $("workBox").textContent = entry.work || "(empty)";

  // Comments
  $("lifterComment").value = entry.lifterComment || "";
  $("coachComment").value = entry.coachComment || "";

  // Videos
  renderVideos(entry);

  // Last updated
  $("lastUpdated").textContent = entry.updatedAt ? `Last updated: ${entry.updatedAt}` : "Not updated yet";

  // History list (same exercise name in same period)
  renderExerciseHistory(entry);
}

function renderVideos(entry){
  const list = $("videoList");
  list.innerHTML = "";

  const videos = entry.videos || [];

  if (videos.length === 0){
    list.innerHTML = `<div class="hint">No videos yet. Paste a link and click Add.</div>`;
    return;
  }

  for (let i=0; i<videos.length; i++){
    const url = videos[i];
    const item = document.createElement("div");
    item.className = "item";

    const embed = youtubeEmbedUrl(url);

    // Local media support (Data URLs)
    const isDataImage = /^data:image\//i.test(url);
    const isDataVideo = /^data:video\//i.test(url);

    const embedHtml = embed
      ? `<div class="video-embed"><iframe loading="lazy" src="${embed}" allowfullscreen></iframe></div>`
      : isDataVideo
        ? `<div class="video-embed"><video controls playsinline style="width:100%;display:block" src="${url}"></video></div>`
        : isDataImage
          ? `<div class="video-embed"><img alt="Local media" style="width:100%;display:block" src="${url}" /></div>`
          : "";

    item.innerHTML = `
      <div class="item-title">Video ${i+1}</div>
      <div class="item-sub">${/^data:/.test(url) ? "<span class=\"hint\">Local media</span>" : `<a href=\"${url}\" target=\"_blank\" rel=\"noopener\">Open link</a>`}</div>
      ${embedHtml}
      <div class="item-actions">
        <button class="btn danger" data-remove="${i}">Remove</button>
        <button class="btn secondary" data-copy="${i}">Copy URL</button>
      </div>
    `;

    item.querySelector("[data-remove]").addEventListener("click", () => {
      videos.splice(i,1);
      saveEntryPatch({ videos });
      renderExercise();
      toast("Video removed");
    });

    item.querySelector("[data-copy]").addEventListener("click", async () => {
      await navigator.clipboard.writeText(url);
      toast("Copied");
    });

    list.appendChild(item);
  }
}

function renderExerciseHistory(entry){
  const host = $("exerciseHistory");
  host.innerHTML = "";

  const period = getPeriod(entry.periodId);
  if (!period) return;

  const matches = [];

  for (const b of period.blocks){
    for (const w of b.weeks){
      for (const d of w.days){
        for (const ex of d.exercises){
          if (ex.name.trim().toLowerCase() === entry.exerciseName.trim().toLowerCase()){
            const patched = getPatchedEntry(period.id, b.id, w.week, d.day, ex.id);
            matches.push(patched);
          }
        }
      }
    }
  }

  // Sort chronologically
  matches.sort((a,b) => (a.blockId - b.blockId) || (a.week - b.week) || (a.day - b.day));

  if (matches.length <= 1){
    host.innerHTML = `<div class="hint">No other occurrences of this exercise in this period yet.</div>`;
    return;
  }

  for (const m of matches){
    const item = document.createElement("div");
    item.className = "item";
    const h = makeHash(m.periodId, m.blockId, m.week, m.day, m.exerciseId);
    item.innerHTML = `
      <div class="item-title">Block ${m.blockId} • Week ${m.week} • Day ${m.day}</div>
      <div class="item-sub">${m.work || "(no work text)"} • Videos: ${(m.videos||[]).length}</div>
      <div class="item-actions">
        <button class="btn secondary" data-go="${h}">Open</button>
      </div>
    `;
    item.querySelector("button").addEventListener("click", () => location.hash = h);
    host.appendChild(item);
  }
}

function renderSearchResults(results){
  showView("searchView");
  const host = $("searchResults");
  host.innerHTML = "";

  if (results.length === 0){
    host.innerHTML = `<div class="hint">No matches. Try different keywords.</div>`;
    return;
  }

  for (const r of results.slice(0, 60)){
    const h = makeHash(r.periodId, r.blockId, r.week, r.day, r.exerciseId);
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item-title">${r.exerciseName}</div>
      <div class="item-sub">${r.periodName} • Block ${r.blockId} • Week ${r.week} • Day ${r.day}</div>
      <div class="item-sub">${r.work || ""}</div>
      <div class="item-actions">
        <button class="btn secondary" data-go="${h}">Open</button>
      </div>
    `;
    item.querySelector("button").addEventListener("click", () => location.hash = h);
    host.appendChild(item);
  }
}

// --- Editing / saving -------------------------------------------------------
//
// We save patches only (small), not the whole dataset.

function saveEntryPatch(partialPatch){
  const key = entryKey(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
  const prev = edits[key] || {};
  const next = {...prev, ...partialPatch, updatedAt: nowIso()};
  edits[key] = next;
  saveEdits(edits);
}

function wireExerciseButtons(){
  $("btnAddVideo").addEventListener("click", () => {
    const url = $("videoInput").value.trim();
    if (!url) return;
    // Basic sanity: must look like a URL
    if (!/^https?:\/\//i.test(url)){
      toast("Paste a full URL starting with http(s)://");
      return;
    }
    const entry = getPatchedEntry(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
    const videos = [...(entry.videos || []), url];
    $("videoInput").value = "";
    saveEntryPatch({ videos });
    renderExercise();
    toast("Video added");
  });

  $("btnSave").addEventListener("click", () => {
    saveEntryPatch({
      lifterComment: $("lifterComment").value,
      coachComment: $("coachComment").value,
      // Also allow quick edit of work box by double click (see below)
    });
    toast("Saved");
    renderOverview(); // update overview KPIs/recent edits quickly
    renderExercise();
  });

  $("btnCopyLink").addEventListener("click", async () => {
    const full = location.origin + location.pathname + makeHash(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
    await navigator.clipboard.writeText(full);
    toast("Link copied");
  });

  // Double click the work box to edit quickly (simple prompt)
  $("workBox").addEventListener("dblclick", () => {
    const entry = getPatchedEntry(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
    const next = prompt("Edit work text for this entry:", entry.work || "");
    if (next === null) return;
    saveEntryPatch({ work: next });
    renderExercise();
    toast("Work updated");
  });

  // Add local media (image/video) from device.
  // NOTE: Static sites can\'t upload to a server. We store small files locally.
  // - Images: stored as DataURL (works well).
  // - Videos: can be huge; we only store if small, otherwise ask for a link.
  $("btnAddLocalMedia").addEventListener("click", async () => {
    const file = $("mediaFile").files?.[0];
    if (!file){
      toast("Choose a file first");
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage){
      toast("Unsupported file type");
      return;
    }

    // LocalStorage is small; keep files small.
    const MAX_BYTES = 8 * 1024 * 1024;
    if (file.size > MAX_BYTES){
      toast("File is too large to store locally. Upload it (YouTube/Drive) and paste the link instead.");
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

    const entry = getPatchedEntry(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
    const videos = [...(entry.videos || []), dataUrl];

    $("mediaFile").value = "";
    saveEntryPatch({ videos });
    renderExercise();
    toast("Local media added (this device)");
  });
}


function wireNavHandlers(){
  $("periodSelect").addEventListener("change", (e) => {
    sel.periodId = e.target.value;
    sel.blockId = null; sel.week = null; sel.day = null; sel.exerciseId = null;
    renderNav();
    syncHashFromSelection();
    renderExercise();
  });

  $("blockSelect").addEventListener("change", (e) => {
    sel.blockId = e.target.value;
    sel.week = null; sel.day = null; sel.exerciseId = null;
    renderNav();
    syncHashFromSelection();
    renderExercise();
  });

  $("weekSelect").addEventListener("change", (e) => {
    sel.week = Number(e.target.value);
    sel.day = null; sel.exerciseId = null;
    renderNav();
    syncHashFromSelection();
    renderExercise();
  });

  $("daySelect").addEventListener("change", (e) => {
    sel.day = Number(e.target.value);
    sel.exerciseId = null;
    renderNav();
    syncHashFromSelection();
    renderExercise();
  });

  $("exerciseSelect").addEventListener("change", (e) => {
    sel.exerciseId = e.target.value;
    renderNav();
    syncHashFromSelection();
    renderExercise();
  });

  $("searchInput").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q){
      // If you clear search, show exercise view if selection complete, else overview.
      if (sel.exerciseId) renderExercise();
      else renderOverview();
      return;
    }

    const results = [];
    for (const p of baseData.periods){
      for (const b of p.blocks){
        for (const w of b.weeks){
          for (const d of w.days){
            for (const ex of d.exercises){
              const patched = getPatchedEntry(p.id, b.id, w.week, d.day, ex.id);
              const hay = [
                p.name, p.id,
                String(b.id),
                String(w.week),
                String(d.day),
                ex.name,
                patched.work || "",
                patched.lifterComment || "",
                patched.coachComment || ""
              ].join(" ").toLowerCase();

              if (hay.includes(q)){
                results.push(patched);
              }
            }
          }
        }
      }
    }
    renderSearchResults(results);
  });

  $("btnHome").addEventListener("click", () => {
    location.hash = "";
    renderOverview();
  });
}

function wireTopButtons(){
  $("btnExport").addEventListener("click", async () => {
    // Export combined view: base + local edits applied
    const merged = mergeBaseWithEdits(baseData, edits);
    const name = `training-log-export-${new Date().toISOString().slice(0,10)}.json`;
    downloadJson(name, merged);
    toast("Exported JSON");
  });

  $("fileImport").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const obj = safeJsonParse(text, null);
    if (!obj || !obj.periods){
      toast("That doesn't look like a valid training log JSON.");
      return;
    }

    // Import strategy:
    // - Replace base with imported file (persisted in STORAGE_BASE_KEY)
    // - Clear local edits (optional), because they might conflict
    setImportedBase(obj);
    clearEdits();
    edits = loadEdits();

    baseData = obj;
    sel = { periodId:null, blockId:null, week:null, day:null, exerciseId:null };
    renderNav();
    renderOverview();
    toast("Imported JSON as new base");
    // Reset file input so you can import the same file again if needed
    e.target.value = "";
  });

  $("btnResetLocal").addEventListener("click", () => {
    if (!confirm("Clear local edits for this browser? Base data stays the same.")) return;
    clearEdits();
    edits = loadEdits();
    toast("Local edits cleared");
    renderOverview();
    renderExercise();
  });

  $("roleLifter").addEventListener("click", () => setRole("lifter"));
  $("roleCoach").addEventListener("click", () => setRole("coach"));
}

// Merge base dataset with edits patches into a single JSON (used for exporting)
function mergeBaseWithEdits(base, editsMap){
  const out = JSON.parse(JSON.stringify(base)); // deep clone
  for (const p of out.periods){
    for (const b of p.blocks){
      for (const w of b.weeks){
        for (const d of w.days){
          for (const ex of d.exercises){
            const key = entryKey(p.id, b.id, w.week, d.day, ex.id);
            const patch = editsMap[key];
            if (!patch) continue;
            // Apply patch directly to stored exercise node
            if (typeof patch.work === "string") ex.work = patch.work;
            if (Array.isArray(patch.videos)) ex.videos = patch.videos;
            if (typeof patch.lifterComment === "string") ex.lifterComment = patch.lifterComment;
            if (typeof patch.coachComment === "string") ex.coachComment = patch.coachComment;
            if (typeof patch.updatedAt === "string") ex.updatedAt = patch.updatedAt;
          }
        }
      }
    }
  }
  return out;
}


// --- Structure Manager (add/remove periods/blocks/weeks/days/exercises) ------
//
// These actions mutate the in-memory baseData and then persist it as the "imported base"
// so it survives reloads.
//
// IMPORTANT: Static site limitation:
// - Changes are saved locally (in your browser).
// - Use Export JSON for backups or to publish changes to GitHub Pages.

function persistBaseData(){
  setImportedBase(baseData);
}

function openManager(){
  $("managerModal").classList.remove("hidden");
}
function closeManager(){
  $("managerModal").classList.add("hidden");
}

function ensureSelected(){
  if (!baseData.periods.length){
    baseData.periods.push({id:"period-1", name:"Period 1", blocks:[{id:1,weeks:[{week:1,days:[{day:1,label:"Day 1",exercises:[]}]}]}]});
  }
  if (!sel.periodId || !getPeriod(sel.periodId)){
    sel.periodId = baseData.periods[0].id;
    sel.blockId = null; sel.week=null; sel.day=null; sel.exerciseId=null;
  }
  const p = getPeriod(sel.periodId);
  if (!p.blocks.length) p.blocks.push({id:1,weeks:[]});
  if (!sel.blockId || !getBlock(p, sel.blockId)){
    sel.blockId = p.blocks[0].id;
    sel.week=null; sel.day=null; sel.exerciseId=null;
  }
  const b = getBlock(p, sel.blockId);
  if (!b.weeks.length) b.weeks.push({week:1,days:[]});
  if (!sel.week || !getWeek(b, sel.week)){
    sel.week = b.weeks[0].week;
    sel.day=null; sel.exerciseId=null;
  }
  const w = getWeek(b, sel.week);
  if (!w.days.length) w.days.push({day:1,label:"Day 1",exercises:[]});
  if (!sel.day || !getDay(w, sel.day)){
    sel.day = w.days[0].day;
    sel.exerciseId=null;
  }
  const d = getDay(w, sel.day);
  if (!d.exercises.length){
    d.exercises.push({id:"exercise-1", name:"Exercise 1", work:"", videos:[], lifterComment:"", coachComment:"", updatedAt:null});
  }
  if (!sel.exerciseId || !getExercise(d, sel.exerciseId)){
    sel.exerciseId = d.exercises[0].id;
  }
}

function wireManager(){
  $("btnManage").addEventListener("click", openManager);
  $("mgrCloseBtn").addEventListener("click", closeManager);
  $("mgrCloseBackdrop").addEventListener("click", closeManager);

  $("btnAddPeriod").addEventListener("click", () => {
    const name = $("addPeriodName").value.trim();
    if (!name){ toast("Enter a period name"); return; }
    const id = slugify(name);
    if (baseData.periods.some(p => p.id === id)){
      toast("That period already exists");
      return;
    }
    baseData.periods.push({ id, name, blocks: [] });
    sel.periodId = id;
    sel.blockId=null; sel.week=null; sel.day=null; sel.exerciseId=null;
    $("addPeriodName").value = "";
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    toast("Period added");
  });

  $("btnAddBlock").addEventListener("click", () => {
    const p = getPeriod(sel.periodId);
    const blockId = Number($("addBlockId").value);
    if (!blockId || blockId < 1){ toast("Enter a valid block number"); return; }
    if (p.blocks.some(b => Number(b.id) === blockId)){ toast("Block already exists"); return; }
    p.blocks.push({ id: blockId, weeks: [] });
    p.blocks.sort((a,b)=>Number(a.id)-Number(b.id));
    sel.blockId = blockId;
    sel.week=null; sel.day=null; sel.exerciseId=null;
    $("addBlockId").value = "";
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    toast("Block added");
  });

  $("btnAddWeek").addEventListener("click", () => {
    const p = getPeriod(sel.periodId);
    const b = getBlock(p, sel.blockId);
    const week = Number($("addWeekNum").value);
    if (!week || week < 1){ toast("Enter a valid week number"); return; }
    if (b.weeks.some(w => Number(w.week) === week)){ toast("Week already exists"); return; }
    b.weeks.push({ week, days: [] });
    b.weeks.sort((a,b)=>Number(a.week)-Number(b.week));
    sel.week = week;
    sel.day=null; sel.exerciseId=null;
    $("addWeekNum").value = "";
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    toast("Week added");
  });

  $("btnAddDay").addEventListener("click", () => {
    const p = getPeriod(sel.periodId);
    const b = getBlock(p, sel.blockId);
    const w = getWeek(b, sel.week);
    const day = Number($("addDayNum").value);
    if (!day || day < 1){ toast("Enter a valid day number"); return; }
    if (w.days.some(d => Number(d.day) === day)){ toast("Day already exists"); return; }
    const label = $("addDayLabel").value.trim() || `Day ${day}`;
    w.days.push({ day, label, exercises: [] });
    w.days.sort((a,b)=>Number(a.day)-Number(b.day));
    sel.day = day;
    sel.exerciseId=null;
    $("addDayNum").value = "";
    $("addDayLabel").value = "";
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    toast("Day added");
  });

  $("btnAddExercise").addEventListener("click", () => {
    const p = getPeriod(sel.periodId);
    const b = getBlock(p, sel.blockId);
    const w = getWeek(b, sel.week);
    const d = getDay(w, sel.day);
    const name = $("addExerciseName").value.trim();
    if (!name){ toast("Enter an exercise name"); return; }
    const id = slugify(name);
    if (d.exercises.some(e => e.id === id)){
      toast("Exercise already exists on this day");
      return;
    }
    const work = $("addExerciseWork").value.trim();
    d.exercises.push({ id, name, work, videos: [], lifterComment: "", coachComment: "", updatedAt: null });
    d.exercises.sort((a,b)=>a.name.localeCompare(b.name));
    sel.exerciseId = id;
    $("addExerciseName").value = "";
    $("addExerciseWork").value = "";
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    toast("Exercise added");
  });

  $("btnRemoveExercise").addEventListener("click", () => {
    if (!confirm("Remove this exercise entry?")) return;
    const p = getPeriod(sel.periodId);
    const b = getBlock(p, sel.blockId);
    const w = getWeek(b, sel.week);
    const d = getDay(w, sel.day);
    const idx = d.exercises.findIndex(e => e.id === sel.exerciseId);
    if (idx < 0){ toast("Exercise not found"); return; }
    d.exercises.splice(idx,1);
    const key = entryKey(sel.periodId, sel.blockId, sel.week, sel.day, sel.exerciseId);
    delete edits[key];
    saveEdits(edits);
    sel.exerciseId = null;
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    renderExercise();
    toast("Exercise removed");
  });

  $("btnRemoveDay").addEventListener("click", () => {
    if (!confirm("Remove this day (and all exercises in it)?")) return;
    const p = getPeriod(sel.periodId);
    const b = getBlock(p, sel.blockId);
    const w = getWeek(b, sel.week);
    const idx = w.days.findIndex(d => Number(d.day) === Number(sel.day));
    if (idx < 0){ toast("Day not found"); return; }
    w.days.splice(idx,1);
    sel.day = null;
    sel.exerciseId = null;
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    renderExercise();
    toast("Day removed");
  });

  $("btnRemoveWeek").addEventListener("click", () => {
    if (!confirm("Remove this week (and everything inside it)?")) return;
    const p = getPeriod(sel.periodId);
    const b = getBlock(p, sel.blockId);
    const idx = b.weeks.findIndex(w => Number(w.week) === Number(sel.week));
    if (idx < 0){ toast("Week not found"); return; }
    b.weeks.splice(idx,1);
    sel.week = null;
    sel.day = null;
    sel.exerciseId = null;
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    renderExercise();
    toast("Week removed");
  });

  $("btnRemoveBlock").addEventListener("click", () => {
    if (!confirm("Remove this block (and everything inside it)?")) return;
    const p = getPeriod(sel.periodId);
    const idx = p.blocks.findIndex(b => Number(b.id) === Number(sel.blockId));
    if (idx < 0){ toast("Block not found"); return; }
    p.blocks.splice(idx,1);
    sel.blockId = null;
    sel.week = null;
    sel.day = null;
    sel.exerciseId = null;
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    renderExercise();
    toast("Block removed");
  });

  $("btnRemovePeriod").addEventListener("click", () => {
    if (!confirm("Remove this period (and everything inside it)?")) return;
    const idx = baseData.periods.findIndex(p => p.id === sel.periodId);
    if (idx < 0){ toast("Period not found"); return; }
    baseData.periods.splice(idx,1);
    sel.periodId = null;
    sel.blockId = null;
    sel.week = null;
    sel.day = null;
    sel.exerciseId = null;
    persistBaseData();
    ensureSelected();
    renderNav();
    renderOverview();
    renderExercise();
    toast("Period removed");
  });
}


// --- Initialization ---------------------------------------------------------

function initFromHash(){
  const parsed = parseHash();
  if (!parsed){
    renderNav();
    renderOverview();
    return;
  }

  sel.periodId = parsed.periodId;
  sel.blockId = parsed.blockId;
  sel.week = parsed.week;
  sel.day = parsed.day;
  sel.exerciseId = parsed.exerciseId;

  // If hash is incomplete, still render nav sensibly.
  renderNav();

  // If it is complete and valid, show that entry.
  if (sel.periodId && sel.blockId && sel.week && sel.day && sel.exerciseId){
    renderExercise();
  }else{
    renderOverview();
  }
}

window.addEventListener("hashchange", () => {
  initFromHash();
});

// --- Boot -------------------------------------------------------------------

(async function main(){
  try{
    baseData = await fetchBaseData();
  }catch(err){
    document.body.innerHTML = `<div style="padding:24px;color:white;font-family:system-ui">
      <h2>Failed to load data</h2>
      <p>${String(err)}</p>
      <p>Make sure <code>data/data.json</code> exists and you are running a local server (not opening the file directly).</p>
      <p>Quick fix: run <code>python -m http.server</code> in the site folder and open <code>http://localhost:8000</code>.</p>
    </div>`;
    return;
  }

  wireNavHandlers();
  wireTopButtons();
  wireExerciseButtons();
  wireManager();

  // Default role
  setRole("lifter");

  // Start
  initFromHash();
})();
