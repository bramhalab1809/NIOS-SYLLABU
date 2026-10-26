const KEY = "cal.prefs.v2", LKEY = "cal.lists.v2", BG = "cal.bg.v1";
export const PROMPT = "Create a calm, minimal wallpaper for a study app. Soft warm colours (cream, terracotta and a hint of sage), gentle abstract shapes, subtle paper texture, lots of empty space, no text, no people. Widescreen 16:9, high resolution.";
export const DEFAULTS = {
  theme: "system", accent: "#d97757", font: "claude", fontScale: 1, pageColor: "#f4f6f3", textColor: "#17231d", headerColor: "#f4f6f3",
  showSize: true, showCount: true, compact: false, cleanNames: true, rememberOpen: true, newTab: true, sidePanel: false,
  bgUrl: "", bgDim: 0.5, bgBlur: 4, matchAccent: false, imgAccent: "", prompt: PROMPT,
};
const load = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || "{}") }; } catch { return { ...d }; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const prefs = load(KEY, DEFAULTS);
export const lists = load(LKEY, { stars: [], folderStars: [], recent: [], open: [] });
const prefSubs = new Set(), listSubs = new Set();
export const onPref = (f) => prefSubs.add(f);
export const onLists = (f) => listSubs.add(f);

export function setPref(k, v) { prefs[k] = v; save(KEY, prefs); prefSubs.forEach((f) => f(k)); }
export function resetPrefs() { Object.assign(prefs, DEFAULTS); save(KEY, prefs); clearBg(); prefSubs.forEach((f) => f("*")); }

let timer;
export function saveLists() { clearTimeout(timer); timer = setTimeout(() => save(LKEY, lists), 250); }
const emit = () => { saveLists(); listSubs.forEach((f) => f()); };
export function toggleStar(p) { const i = lists.stars.indexOf(p); if (i < 0) lists.stars.unshift(p); else lists.stars.splice(i, 1); emit(); }
export function toggleFolderStar(p) { if (!lists.folderStars) lists.folderStars = []; const i = lists.folderStars.indexOf(p); if (i < 0) lists.folderStars.unshift(p); else lists.folderStars.splice(i, 1); emit(); }
export function addRecent(p) { lists.recent = [p, ...lists.recent.filter((x) => x !== p)].slice(0, 15); emit(); }
export function clearList(name) { if (name === "stars") lists.folderStars = []; lists[name] = []; emit(); }

export const getBg = () => { try { return localStorage.getItem(BG) || ""; } catch { return ""; } };
export function setBg(d) { try { localStorage.setItem(BG, d); return true; } catch { return false; } }
export function clearBg() { try { localStorage.removeItem(BG); } catch {} }
