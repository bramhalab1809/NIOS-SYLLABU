# NIOS Study Library

A responsive, searchable study library for National Institute of Open Schooling (NIOS) study PDFs. Browse subject folders, search chapters and PDF names, and open available study files from one clean interface.

**Dataset:** https://huggingface.co/datasets/andy180926/NIOS-SYLLABUS/tree/main

## Features

- Responsive layout for phones, tablets, laptops and desktop PCs
- NIOS-specific branding and larger folder icons
- Search across subjects, folders and PDF filenames
- Light/dark themes, starred items and recently opened PDFs
- Optional background, reading and display preferences
- Automatically refreshed file index through GitHub Actions

## Important notice

- This is an independent community project. It is not affiliated with, endorsed by, or an official website of the National Institute of Open Schooling (NIOS).
- This repository contains the website code and file index, not the PDF content itself. PDF files are hosted in the Hugging Face dataset linked above.
- Study materials remain the property of their respective authors or rights holders. Only share or use materials you have permission to distribute.
- Content may be outdated or incomplete. Check official NIOS resources for current syllabus and exam information.

## How it works

- `index.html`, `css/`, `js/`: responsive library interface and interactions
- `data/library.json`: index of PDF files
- `scripts/build_index.py`: builds the index from the configured dataset
- `.github/workflows/update-index.yml`: scheduled and manual index refresh workflow

## Deploy your own copy

1. Upload or fork this repository to GitHub.
2. In **Settings → Pages**, select deployment from the `main` branch and `/ (root)` folder, if using branch-based Pages deployment.
3. Open the **Actions** tab and run **Update library index** to refresh the file list.
4. Confirm `js/config.js` and `scripts/build_index.py` point to the intended NIOS dataset before deployment.

## License

The website code is provided under the MIT License in `LICENSE`. That license does not apply to third-party study materials.
