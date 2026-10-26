# NIOS Study Library

A simple, free website that lists the NIOS study PDFs hosted on Hugging Face, in a clean folder view with search. Click a PDF and it opens in a new tab.

**Live site:** (deploy your own GitHub Pages site)
**Files are stored here:** https://huggingface.co/datasets/andy180926/NIOS-SYLLABUS

## Why I made this

This project is configured for NIOS study material. My phone doesn't have much storage, and most sites that share study material are full of ads, pop-ups and OTP walls. This library is only a tidy way for me (and other students) to find and read the material without all that.

## Important notice

- **Not affiliated with ICAI.** This project has nothing to do with the National Institute of Open Schooling (NIOS), any coaching institute, publisher or website, and it is not endorsed by any of them.
- **No study material is stored in this repository.** This repo only contains the website code. The PDFs live in the Hugging Face dataset above, and the site just links to them.
- **I don't own the study material.** It belongs to its original authors, publishers and the ICAI.
- **Non-commercial only.** Please don't sell this, put ads on it, or use it in any paid product, course or app. It exists for personal study, nothing else.
- **No guarantee of accuracy.** Material may be old or incomplete. Check the official NIOS website for the latest.

## Takedown

If you own something listed here and want it removed, open an **Issue** in this repository or use the **Community tab** on the Hugging Face dataset, and mention the file name. I'll remove it quickly.

## License

The website code (HTML, CSS, JS, scripts) is released under the MIT License. The MIT License covers **the code only**. It does not apply to any study material, which stays with its respective owners.

## How it works

- `index.html`, `css/`, `js/`: the viewer (folder tree, search, light/dark theme)
- `data/library.json`: file list, refreshed automatically from the dataset every 6 hours
- `scripts/build_index.py`: scans the dataset and writes the index and `reports/health.md`
- `.github/workflows/update-index.yml`: runs that script on a schedule

## Run your own copy

1. Fork or upload this repo to GitHub (public).
2. Settings > Pages > Deploy from branch `main`, folder `/ (root)`.
3. Actions tab > "Update library index" > Run workflow.
4. To point it at a different dataset, edit `js/config.js` and `scripts/build_index.py`.

Only use it with material you are allowed to share.
