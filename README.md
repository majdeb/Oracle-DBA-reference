# DBA-Sheet

A searchable, static reference site built from a personal Oracle DBA / Unix / Exadata cheat-sheet — **1,286 entries across 30 categories** (OS, RAC, ASM, RMAN, Data Guard, GoldenGate, Tuning, Security, and more).

Live layout:
- **Sidebar** — every category, directory-listing style, with entry counts.
- **Search bar** (`grep -i …`) — filters live across the active category, or across the entire sheet when no category is selected. Press `/` anywhere to focus it.
- **Copy buttons** on every command/snippet.

No build step, no framework, no dependencies beyond two Google Fonts — just `index.html` + `style.css` + `app.js` + `data.json`.

## Run it locally

```bash
cd dba-sheet
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish with GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit: DBA-Sheet reference site"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then in the repo on GitHub: **Settings → Pages → Source → Deploy from a branch → `main` / `(root)` → Save**.
Your site will be live at `https://<your-username>.github.io/<your-repo>/` within a minute or two.

## Updating the content

The content lives entirely in `data.json` (one object per category, each row an array of cells). To regenerate it from a fresh copy of the spreadsheet, see `gen_data.py` (not included in this bundle — ask if you'd like it added) — it uses `openpyxl` to read the workbook and dumps `{"sheets": [{"name": ..., "rows": [[...]]}]}`.
