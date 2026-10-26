"""Scans the Hugging Face dataset, tags subjects, writes data/library.json and a health report."""
import json, os, re, collections, datetime
from huggingface_hub import HfApi
from huggingface_hub.hf_api import RepoFile

REPO = os.environ.get("HF_REPO", "andy180926/NIOS-SYLLABUS")
SUBJECTS = {
    "English": ["english", "communication", "literature"],
    "Mathematics": ["math", "mathematics", "algebra", "geometry", "statistics"],
    "Science": ["science", "physics", "chemistry", "biology"],
    "Social Science": ["social science", "history", "geography", "political science", "economics", "sociology"],
    "Hindi": ["hindi"],
    "Business Studies": ["business", "accountancy", "commerce", "entrepreneurship"],
}

def subject_of(path):
    p = path.lower()
    score = {s: sum(k in p for k in kws) for s, kws in SUBJECTS.items()}
    best = max(score, key=score.get)
    return best if score[best] else None

def title_of(name):
    return re.sub(r"\s+", " ", re.sub(r"_+", " ", re.sub(r"\.[^.]+$", "", name))).strip()

now = datetime.datetime.now(datetime.timezone.utc)
files = []
for it in HfApi().list_repo_tree(REPO, repo_type="dataset", recursive=True):
    if isinstance(it, RepoFile) and it.path.lower().endswith(".pdf") and not any(p.startswith(".") for p in it.path.split("/")):
        files.append({"path": it.path, "title": title_of(it.path.split("/")[-1]), "size": it.size or 0, "subject": subject_of(it.path)})
files.sort(key=lambda f: f["path"].lower())

os.makedirs("data", exist_ok=True); os.makedirs("reports", exist_ok=True)
with open("data/library.json", "w", encoding="utf-8") as fh:
    json.dump({"generated": now.isoformat(), "repo": REPO, "files": files}, fh, ensure_ascii=False, indent=1)

# self-review: the tool inspects its own data and lists what to improve
loose = [f["path"] for f in files if "/" not in f["path"]]
untagged = [f["path"] for f in files if not f["subject"]]
groups = collections.defaultdict(list)
for f in files: groups[f["title"].lower()].append(f["path"])
dups = [f"{k}: " + ", ".join(v) for k, v in groups.items() if len(v) > 1]
messy = [f["path"] for f in files if re.search(r"\(\d+\)|copy|final_?final|\s{2,}", f["path"], re.I)]
big = [f["path"] for f in files if f["size"] > 100 * 1024 * 1024]
issues = []
def sec(title, items, fix):
    if items:
        issues.append(f"## {title} ({len(items)})\nFix: {fix}\n\n" + "\n".join(f"- `{i}`" for i in items[:50]) + "\n")
sec("Files in the root (no folder)", loose, "move into Subject/Chapter folders so the tree stays organised")
sec("Subject not detected", untagged, "put the subject name in the folder or file name, e.g. Accounting/...")
sec("Possible duplicates", dups, "keep one copy and delete the rest")
sec("Messy file names", messy, "rename without '(1)', 'copy' or double spaces")
sec("Very large files (>100 MB)", big, "compress them, since they load slowly on mobile")
head = f"# Library health report\nUpdated {now:%Y-%m-%d %H:%M} UTC. {len(files)} PDFs, {len(files)-len(untagged)} auto-tagged by subject.\n\n"
with open("reports/health.md", "w", encoding="utf-8") as fh:
    fh.write(head + ("\n".join(issues) if issues else "All good. Nothing to fix.\n"))
print(f"{len(files)} files indexed")
