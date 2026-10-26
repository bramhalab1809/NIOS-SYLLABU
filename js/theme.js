import { prefs, onPref, getBg } from "./prefs.js";

const mq = matchMedia("(prefers-color-scheme: dark)");
const root = document.documentElement;

export function applyTheme() {
  const dark = prefs.theme === "dark" || (prefs.theme === "system" && mq.matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.font = prefs.font;
  root.style.setProperty("--accent", prefs.matchAccent && prefs.imgAccent ? prefs.imgAccent : prefs.accent);
  root.style.setProperty("--bg", prefs.pageColor || (dark ? "#141b17" : "#f4f6f3"));
  root.style.setProperty("--text", prefs.textColor || (dark ? "#eef5ef" : "#17231d"));
  if (prefs.headerColor) root.style.setProperty("--user-header", prefs.headerColor);
  else root.style.removeProperty("--user-header");
  root.style.setProperty("--font-scale", String(prefs.fontScale || 1));
  root.classList.toggle("compact", prefs.compact);
  root.classList.toggle("hide-size", !prefs.showSize);
  root.classList.toggle("hide-count", !prefs.showCount);
  const src = getBg() || prefs.bgUrl;
  document.getElementById("bg").style.backgroundImage = src ? `url("${src.replace(/"/g, "%22")}")` : "none";
  root.classList.toggle("has-bg", !!src);
  root.style.setProperty("--dim", prefs.bgDim);
  root.style.setProperty("--blur", prefs.bgBlur + "px");
}
mq.addEventListener("change", applyTheme);
onPref(applyTheme);

// shrinks the picture so it fits browser storage, and picks a colour from it
export function readImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1920 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const s = document.createElement("canvas"); s.width = s.height = 24;
      const x = s.getContext("2d"); x.drawImage(img, 0, 0, 24, 24);
      const px = x.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < px.length; i += 4) {
        const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
        const v = mx / 255, sat = mx ? (mx - mn) / mx : 0;
        if (v < 0.25 || v > 0.95) continue;
        const wt = sat * sat + 0.01; r += px[i] * wt; g += px[i + 1] * wt; b += px[i + 2] * wt; w += wt;
      }
      const accent = w ? "#" + [r, g, b].map((n) => Math.round((n / w) * 0.85).toString(16).padStart(2, "0")).join("") : "";
      URL.revokeObjectURL(url);
      resolve({ data: c.toDataURL("image/jpeg", 0.82), accent });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
    img.src = url;
  });
}
