import { CONFIG } from "./config.js";

export const cleanTitle = (name) =>
  name.replace(/\.[^.]+$/, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim();

// "01_Accounting" -> "Accounting", "my_notes" -> "my notes" (sorting still uses the real name)
export const pretty = (s) => {
  const t = s.replace(/_+/g, " ").replace(/^\s*\d{1,3}\s*[-.):]+\s*/, "").replace(/^\s*\d{1,3}\s+(?=\D)/, "").replace(/\s+/g, " ").trim();
  return t || s;
};
export const normText = (s) => s.toLowerCase().replace(/[_\-./()\[\]]+/g, " ").replace(/\s+/g, " ").trim();

const norm = (f) => ({
  path: f.path,
  name: f.path.split("/").pop(),
  rawTitle: f.title || cleanTitle(f.path.split("/").pop()),
  title: "",
  size: Number(f.size) || 0,
  subject: f.subject || null,
});

async function fromIndex() {
  const r = await fetch(`${CONFIG.indexUrl}?v=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("no index");
  const j = await r.json();
  if (!j.files || !j.files.length) throw new Error("empty index");
  return { files: j.files.map(norm), source: "index", generated: j.generated };
}

async function fromHub() {
  let url = `https://huggingface.co/api/datasets/${CONFIG.repo}/tree/${CONFIG.branch}?recursive=true`;
  const out = [];
  for (let i = 0; url && i < 50; i++) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Hugging Face API returned ${r.status}`);
    out.push(...(await r.json()));
    const m = (r.headers.get("Link") || "").match(/<([^>]+)>;\s*rel="next"/);
    url = m ? m[1] : null;
  }
  return { files: out.filter((x) => x.type === "file").map(norm), source: "live", generated: null };
}

export async function loadLibrary() {
  let res;
  try { res = await fromIndex(); } catch { res = await fromHub(); }
  res.files = res.files.filter((f) => !f.path.split("/").some((p) => p.startsWith(".")) &&
    (!CONFIG.onlyPdf || /\.pdf$/i.test(f.path)));
  return res;
}

export const fileUrl = (path) =>
  `https://huggingface.co/datasets/${CONFIG.repo}/resolve/${CONFIG.branch}/` +
  path.split("/").map(encodeURIComponent).join("/");

export function fmtSize(b) {
  if (!b) return "";
  const u = ["B", "KB", "MB", "GB"]; let i = 0;
  while (b >= 1024 && i < 3) { b /= 1024; i++; }
  return `${b.toFixed(i ? 1 : 0)} ${u[i]}`;
}
