import { loadLibrary, normText, fileUrl, pretty } from "./data.js";
import { renderTree, setAll, fileRow, revealFolder } from "./tree.js";
import { icon } from "./icons.js";
import { prefs, lists, onPref, onLists } from "./prefs.js";
import { applyTheme } from "./theme.js";
import { initSettings } from "./settings.js?v=20261022b";

const $ = (s) => document.querySelector(s);
const view = $("#view"), meta = $("#meta"), q = $("#q"), chips = $("#chips");
const PAGE = 80;
let quickMode = "starred";
const state = { files: [], byPath: new Map(), query: "", subject: "All", shown: PAGE };
let results = [];

function message(iconName, text, retry) {
  const d = document.createElement("div"); d.className = "state";
  const p = document.createElement("div"); p.textContent = text;
  d.append(icon(iconName), p);
  if (retry) { const b = document.createElement("button"); b.textContent = "Try again"; b.onclick = init; d.append(b); }
  view.replaceChildren(d);
}

function skeleton() {
  const p = document.createElement("div"); p.className = "panel";
  for (let i = 0; i < 6; i++) { const s = document.createElement("div"); s.className = "skel"; p.append(s); }
  view.replaceChildren(p);
}

const bySubject = () => state.files.filter((f) => state.subject === "All" || f.subject === state.subject);

function applyNames() {
  for (const f of state.files) {
    f.title = prefs.cleanNames ? pretty(f.rawTitle) : f.rawTitle.trim();
    f._n = normText(f.title); f._p = normText(f.path + " " + f.title);
  }
}

// every word must match (any order); title hits rank above folder hits
function search(list, tokens) {
  const out = [];
  for (const f of list) {
    let score = 0, ok = true;
    for (const t of tokens) {
      if (!f._p.includes(t)) { ok = false; break; }
      score += f._n.includes(t) ? 3 : 1;
      if (f._n.startsWith(t)) score += 2;
    }
    if (ok) out.push([score, f]);
  }
  out.sort((a, b) => b[0] - a[0] || a[1].path.localeCompare(b[1].path, undefined, { numeric: true }));
  return out.map((x) => x[1]);
}

function render() {
  const base = bySubject(), tokens = normText(state.query).split(" ").filter(Boolean);
  $("#clear").hidden = !state.query;
  if (!tokens.length) {
    results = [];
    meta.textContent = `${base.length} PDFs` + (state.subject !== "All" ? ` in ${state.subject}` : "");
    return base.length ? renderTree(base, view) : message("folder", "No PDFs here yet.");
  }
  results = search(base, tokens);
  meta.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
  if (!results.length) return message("search", "Nothing found. Try fewer or shorter words.");
  const p = document.createElement("div"); p.className = "panel";
  results.slice(0, state.shown).forEach((f) => p.append(fileRow(f, tokens, true)));
  if (results.length > state.shown) {
    const b = document.createElement("button"); b.className = "more";
    b.textContent = `Show more (${results.length - state.shown} left)`;
    b.onclick = () => { state.shown += PAGE; render(); };
    p.append(b);
  }
  view.replaceChildren(p);
}

function section(title, ic, paths, emptyText) {
  const box = document.createElement("div"); box.className = "panel";
  const h = document.createElement("div"); h.className = "head"; h.append(icon(ic), title);
  box.append(h);
  const items = paths.map((p) => state.byPath.get(p)).filter(Boolean);
  if (!items.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = emptyText; box.append(e); }
  else items.forEach((f) => box.append(fileRow(f, [], true)));
  return box;
}

function renderQuickAccess(mode) {
  quickMode = mode;
  const overlay = $("#quickAccess"), content = $("#qaContent");
  const starred = mode === "starred";
  $("#qaTitle").textContent = starred ? "Starred items" : "Recently opened";
  $("#qaSubtitle").textContent = starred ? "Your saved folders and PDFs, all in one place" : "Continue where you left off";
  content.replaceChildren();
  if (starred) {
    const folderHead = document.createElement("div"); folderHead.className = "head"; folderHead.append(icon("folder"), "Starred folders"); content.append(folderHead);
    const folders = lists.folderStars || [];
    if (!folders.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "No starred folders yet. Tap the star beside any folder to save it here."; content.append(e); }
    folders.forEach((path) => {
      const b = document.createElement("button"); b.className = "quick-folder"; b.type = "button";
      b.append(icon("folder")); const label = document.createElement("span"); label.textContent = path.split("/").join(" › "); b.append(label, icon("chevron"));
      b.onclick = () => { overlay.hidden = true; if (state.query) { state.query = ""; q.value = ""; state.shown = PAGE; render(); } revealFolder(path); }; content.append(b);
    });
    const pdfHead = document.createElement("div"); pdfHead.className = "head qa-section-head"; pdfHead.append(icon("star"), "Starred PDFs"); content.append(pdfHead);
    const pdfs = lists.stars || [];
    if (!pdfs.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "No starred PDFs yet. Tap the star beside any PDF to save it here."; content.append(e); }
    pdfs.forEach((path) => { const f = state.byPath.get(path); if (f) content.append(fileRow(f, [], true)); });
  } else {
    const recents = lists.recent || [];
    if (!recents.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "PDFs you open will appear here automatically."; content.append(e); }
    recents.forEach((path) => { const f = state.byPath.get(path); if (f) content.append(fileRow(f, [], true)); });
  }
  overlay.hidden = false;
}

function renderSide() {
  const side = $("#side");
  side.hidden = !prefs.sidePanel;
  $(".layout").classList.toggle("solo", !prefs.sidePanel);
  if (!prefs.sidePanel) return;
  const folders = document.createElement("div"); folders.className = "panel";
  const fh = document.createElement("div"); fh.className = "head"; fh.append(icon("folder", ""), "Starred folders"); folders.append(fh);
  const folderStars = lists.folderStars || [];
  if (!folderStars.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "Star important subject or chapter folders to pin them here."; folders.append(e); }
  else folderStars.forEach((path) => { const b = document.createElement("button"); b.className = "quick-folder"; b.type = "button"; b.append(icon("folder", "")); const label = document.createElement("span"); label.textContent = path.split("/").join(" › "); b.append(label, icon("chevron", "")); b.onclick = () => revealFolder(path); folders.append(b); });
  side.replaceChildren(
    folders,
    section("Starred PDFs", "star", lists.stars, "Tap the star on any PDF to pin it here."),
    section("Recently opened", "clock", lists.recent, "Your recently opened PDFs appear here."));
}

function measure() { document.documentElement.style.setProperty("--hh", $(".top").offsetHeight + 16 + "px"); }

function renderChips() {
  const subs = [...new Set(state.files.map((f) => f.subject).filter(Boolean))].sort();
  chips.hidden = subs.length === 0;
  chips.replaceChildren(...["All", ...subs].map((s) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = s; b.setAttribute("aria-pressed", String(s === state.subject));
    b.onclick = () => { state.subject = s; state.shown = PAGE; renderChips(); render(); };
    return b;
  }));
  measure();
}

async function init() {
  skeleton(); meta.textContent = "Loading…";
  try {
    const res = await loadLibrary();
    state.files = res.files; state.subject = "All";
    state.byPath = new Map(state.files.map((f) => [f.path, f]));
    applyNames();
    if (!state.files.length) { meta.textContent = "0 PDFs"; return message("folder", "No PDFs found in the dataset yet."); }
    renderChips(); render(); renderSide();
  } catch (e) {
    meta.textContent = "Could not load";
    message("alert", `Could not load the library (${e.message}). Check that the dataset is public.`, true);
  }
}

const logo = $("#logo");
logo.textContent = "CA";
logo.setAttribute("aria-hidden", "true");
document.querySelectorAll("[data-icon]").forEach((el) => el.append(icon(el.dataset.icon)));
$("#searchIcon").append(icon("search"));
$("#clear").append(icon("x"));
$("#openSettings").append(icon("sliders"));
$("#closeSettings").append(icon("x"));
$("#closeQuickAccess").append(icon("x"));
$("#openStarred").querySelector("[data-icon]").replaceChildren(icon("star"));
$("#openRecent").querySelector("[data-icon]").replaceChildren(icon("clock"));
$("#openStarred").onclick = () => renderQuickAccess("starred");
$("#openRecent").onclick = () => renderQuickAccess("recent");
const closeQuickAccess = () => { $("#quickAccess").hidden = true; };
$("#closeQuickAccess").onclick = closeQuickAccess;
$("#quickAccessScrim").onclick = closeQuickAccess;
addEventListener("keydown", (e) => { if (e.key === "Escape") closeQuickAccess(); });
applyTheme();
initSettings({ expandAll: () => setAll(view, true), collapseAll: () => setAll(view, false) });
onPref((k) => { if (["cleanNames", "newTab", "sidePanel", "*"].includes(k) && state.files.length) { applyNames(); render(); renderSide(); } });
onLists(() => { setTimeout(renderSide, 0); if (!$("#quickAccess").hidden) renderQuickAccess(quickMode); });
addEventListener("resize", measure);

const clear = () => { q.value = ""; state.query = ""; state.shown = PAGE; render(); };
$("#clear").onclick = () => { clear(); q.focus(); };
let timer;
q.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => { state.query = q.value; state.shown = PAGE; render(); }, 90);
});
q.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && results[0]) { e.preventDefault(); window.open(fileUrl(results[0].path), "_blank", "noopener"); }
  if (e.key === "Escape") clear();
});
addEventListener("keydown", (e) => {
  if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); q.focus(); }
});

init();
