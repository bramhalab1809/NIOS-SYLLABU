import { icon } from "./icons.js";
import { fileUrl, fmtSize, pretty } from "./data.js";
import { prefs, lists, saveLists, toggleStar, toggleFolderStar, addRecent, onLists } from "./prefs.js";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const label = (s) => (prefs.cleanNames ? pretty(s) : s.replace(/_+/g, " ").trim());
const openSet = new Set(lists.open);
const persist = () => { if (prefs.rememberOpen) { lists.open = [...openSet]; saveLists(); } };

export function highlight(text, tokens) {
  const frag = document.createDocumentFragment();
  if (!tokens || !tokens.length) { frag.append(text); return frag; }
  const re = new RegExp("(" + tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  text.split(re).forEach((part, i) => { if (part) frag.append(i % 2 ? el("mark", null, part) : part); });
  return frag;
}

function buildTree(files) {
  const root = { dirs: new Map(), files: [] };
  for (const f of files) {
    let n = root;
    for (const p of f.path.split("/").slice(0, -1)) {
      if (!n.dirs.has(p)) n.dirs.set(p, { dirs: new Map(), files: [] });
      n = n.dirs.get(p);
    }
    n.files.push(f);
  }
  return root;
}
const count = (n) => n.files.length + [...n.dirs.values()].reduce((s, d) => s + count(d), 0);

function syncStar(s) {
  const on = lists.stars.includes(s.dataset.path);
  s.setAttribute("aria-pressed", String(on));
  s.title = on ? "Remove star" : "Star this PDF";
  s.setAttribute("aria-label", s.title);
}
onLists(() => { document.querySelectorAll(".star").forEach(syncStar); document.querySelectorAll(".folder-star").forEach(syncFolderStar); });
function syncFolderStar(b) { const on = (lists.folderStars || []).includes(b.dataset.folderPath); b.setAttribute("aria-pressed", String(on)); b.title = on ? "Unstar folder" : "Star folder"; b.setAttribute("aria-label", b.title); }

export function fileRow(f, tokens = [], showPath = false) {
  const row = el("div", "row");
  const a = el("a", "file");
  a.href = fileUrl(f.path); a.rel = "noopener noreferrer"; a.target = prefs.newTab ? "_blank" : "_self";
  const t = el("span", "t"); t.append(highlight(f.title, tokens));
  const txt = el("span", "txt"); txt.append(t);
  const dir = f.path.split("/").slice(0, -1).map(label).join(" › ");
  if (showPath && dir) txt.append(el("span", "p", dir));
  a.append(icon("file", "doc"), txt, el("span", "sz", fmtSize(f.size)));
  a.addEventListener("click", () => addRecent(f.path));
  a.addEventListener("auxclick", (e) => { if (e.button === 1) addRecent(f.path); });
  const s = el("button", "star"); s.type = "button"; s.dataset.path = f.path; s.append(icon("star")); syncStar(s);
  s.addEventListener("click", () => toggleStar(f.path));
  row.append(a, s);
  return row;
}

// a folder's children are created only when it opens, so 1000+ files stay fast
function build(d) {
  if (d._built) return;
  d._built = true;
  const kids = el("div", "kids");
  fill(d._node, kids, d._path);
  d.append(kids);
}

function walk(c) {
  if (!c) return;
  c.querySelectorAll(":scope > details").forEach((d) => { build(d); d.open = true; walk(d.querySelector(":scope > .kids")); });
}

const mini = (name, title) => {
  const b = el("button", "mini"); b.type = "button"; b.title = title; b.setAttribute("aria-label", title); b.append(icon(name)); return b;
};
const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

function folder(name, node, path) {
  const d = el("details"); d._node = node; d._path = path;
  const ex = mini("expand", "Expand everything inside"), co = mini("collapse", "Collapse everything inside");
  ex.onclick = (e) => { stop(e); d.open = true; build(d); walk(d.querySelector(":scope > .kids")); };
  co.onclick = (e) => { stop(e); d.querySelectorAll("details").forEach((x) => (x.open = false)); };
  const fs = mini("star", "Star folder"); fs.classList.add("folder-star"); fs.dataset.folderPath = path; syncFolderStar(fs);
  fs.onclick = (e) => { stop(e); toggleFolderStar(path); };
  const acts = el("span", "acts"); acts.append(fs, ex, co);
  const s = el("summary"); s.dataset.folderPath = path;
  s.append(icon("chevron", "chev"), icon("folder", "fold f-closed"), icon("folder-open", "fold f-open"),
    el("span", "name", label(name)), acts, el("span", "count", String(count(node))));
  d.append(s);
  d.addEventListener("toggle", () => { if (d.open) { build(d); openSet.add(path); } else openSet.delete(path); persist(); });
  if (prefs.rememberOpen && openSet.has(path)) { d.open = true; build(d); }
  return d;
}

function fill(node, parent, prefix) {
  [...node.dirs.keys()].sort(collator.compare).forEach((name) => parent.append(folder(name, node.dirs.get(name), prefix ? prefix + "/" + name : name)));
  node.files.sort((a, b) => collator.compare(a.path, b.path)).forEach((f) => parent.append(fileRow(f)));
}

export function renderTree(files, container) {
  const panel = el("div", "panel");
  fill(buildTree(files), panel, "");
  container.replaceChildren(panel);
  const top = panel.querySelectorAll(":scope > details");
  if (top.length === 1 && !top[0].open) { top[0].open = true; build(top[0]); }
}

export function setAll(root, open) {
  if (!open) { root.querySelectorAll("details").forEach((d) => (d.open = false)); return; }
  walk(root.querySelector(".panel"));
}

export function revealFolder(path) {
  const parts = path.split("/"); let prefix = "";
  for (let i = 0; i < parts.length; i++) {
    prefix = prefix ? prefix + "/" + parts[i] : parts[i];
    let d = [...document.querySelectorAll("details")].find(x => x._path === prefix);
    if (!d) { const parentPath = prefix.split("/").slice(0, -1).join("/"); const parent = parentPath ? [...document.querySelectorAll("details")].find(x => x._path === parentPath) : null; if (parent) { parent.open = true; build(parent); } d = [...document.querySelectorAll("details")].find(x => x._path === prefix); }
    if (d) { d.open = true; build(d); }
  }
  const target = [...document.querySelectorAll("details")].find(x => x._path === path);
  if (target) { target.scrollIntoView({ behavior: "smooth", block: "center" }); target.querySelector("summary")?.focus({ preventScroll: true }); }
}
