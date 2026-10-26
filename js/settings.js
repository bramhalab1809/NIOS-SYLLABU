import { prefs, setPref, onPref, resetPrefs, clearList, setBg, clearBg, PROMPT } from "./prefs.js";
import { readImage } from "./theme.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3000);
}

export function initSettings({ expandAll, collapseAll }) {
  const drawer = $("#drawer");
  const open = () => { drawer.hidden = false; document.body.classList.add("lock"); $("#closeSettings").focus(); };
  const close = () => { drawer.hidden = true; document.body.classList.remove("lock"); $("#openSettings").focus(); };
  $("#openSettings").onclick = open; $("#closeSettings").onclick = close; $("#scrim").onclick = close;
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) close(); });

  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    $$(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    $$(".pane").forEach((p) => (p.hidden = p.id !== t.dataset.tab));
    $(".panes").scrollTop = 0;
  }));

  $$("[data-accent]").forEach((b) => (b.style.background = b.dataset.accent));
  const sync = () => {
    $$("[data-val]").forEach((e) => {
      const v = Number(prefs[e.dataset.val]);
      e.textContent = e.dataset.val === "bgDim" || e.dataset.val === "fontScale"
        ? Math.round(v * 100) + "%"
        : e.dataset.val === "bgBlur" ? Math.round(v) + " px" : String(prefs[e.dataset.val]);
    });
    $$("[data-pref]").forEach((el) => {
      if (el.type === "range") {
        const raw = Number(prefs[el.dataset.pref]);
        const v = Number.isFinite(raw) ? Math.min(Number(el.max), Math.max(Number(el.min), raw)) : Number(el.min);
        el.style.setProperty("--p", ((v - Number(el.min)) / (Number(el.max) - Number(el.min))) * 100 + "%");
      }
      if (el === document.activeElement && el.type !== "checkbox") return;
      const v = prefs[el.dataset.pref];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v;
    });
    $$("[data-seg]").forEach((g) => $$("button", g).forEach((b) => b.setAttribute("aria-pressed", String(prefs[g.dataset.seg] === b.dataset.v))));
    $$("[data-accent]").forEach((b) => b.setAttribute("aria-pressed", String(!prefs.matchAccent && prefs.accent.toLowerCase() === b.dataset.accent)));
  };
  onPref(sync); sync();

  drawer.addEventListener("input", (e) => {
    const el = e.target.closest("[data-pref]"); if (!el) return;
    const k = el.dataset.pref;
    if (k === "accent") setPref("matchAccent", false);
    setPref(k, el.type === "checkbox" ? el.checked : el.type === "range" ? Number(el.value) : el.value);
  });
  drawer.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const g = b.closest("[data-seg]"); if (g) setPref(g.dataset.seg, b.dataset.v);
    if (b.dataset.accent) { setPref("matchAccent", false); setPref("accent", b.dataset.accent); }
  });

  const act = {
    geminiOpen: () => {
      const p = navigator.clipboard?.writeText(prefs.prompt);
      window.open("https://gemini.google.com/app", "_blank", "noopener");
      p?.then(() => toast("Prompt copied. Paste it in Gemini.")).catch(() => toast("Couldn't copy. Select the prompt and copy it yourself."));
    },
    promptReset: () => setPref("prompt", PROMPT),
    bgRemove: () => { clearBg(); setPref("bgUrl", ""); setPref("imgAccent", ""); setPref("matchAccent", false); },
    bgUrlApply: () => {
      const u = $("#bgUrl").value.trim();
      if (!/^https?:\/\//i.test(u)) return toast("Paste a full image link starting with https://");
      clearBg(); setPref("imgAccent", ""); setPref("bgUrl", u);
    },
    expandAll: () => { expandAll(); close(); },
    collapseAll: () => { collapseAll(); close(); },
    clearRecent: () => clearList("recent"),
    clearStars: () => clearList("stars"),
    resetAll: () => { if (confirm("Reset all settings to default?")) resetPrefs(); },
  };
  $$("[data-act]").forEach((b) => b.addEventListener("click", () => act[b.dataset.act]?.()));

  $("#bgFile").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const { data, accent } = await readImage(f);
      if (!setBg(data)) return toast("That image is too big for browser storage. Try a smaller one.");
      setPref("bgUrl", ""); setPref("imgAccent", accent); toast("Background applied.");
    } catch { toast("Couldn't read that image."); }
  });
}
