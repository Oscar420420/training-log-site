# Training Log + Video Vault (static site)

This is a **training log + video vault** (computer + mobile friendly).

Open entries via the sidebar navigation, bookmarks, or shared links. Each link opens the exact:
**training period → block → week → day → exercise** entry on the website.

Each entry supports:
- Video links (YouTube embeds automatically)
- Lifter comments
- Coach feedback

Edits are saved in your browser (LocalStorage) automatically.
Use **Export JSON** as a backup, and **Import JSON** to restore/move to another device.

---

## 1) Folder structure

- `index.html` — the site
- `styles.css` — styling
- `app.js` — logic (routing, editing, local save, export/import)
- `data/data.json` — your training plan/log data
- `tools/` — optional Python scripts to help generate JSON from a normalized Excel table

---

## 2) Run locally (recommended while editing)

### Option A: Python (built-in)
In this folder, run:

```bash
python -m http.server 8000
```

Open:
- http://localhost:8000

> Important: don't open `index.html` by double-clicking.
> Fetching JSON requires a local server.

---

## 3) Link format (bookmarks / sharing)

URLs look like:

```
https://YOURDOMAIN/#/p/serie-1-2026/b/1/w/1/d/1/e/squat
```

Meaning:
- period: `serie-1-2026`
- block: `1`
- week: `1`
- day: `1`
- exercise: `squat`

### Excel clickable link helper

If your URL is in cell A2:

```
=HYPERLINK(A2, "Open")
```

---



---

## Edit structure directly in the website (no Excel needed)

Click **Open manager** in the sidebar. You can:
- Add/remove a training period
- Add/remove a block
- Add/remove a week
- Add/remove a day
- Add/remove exercises

These structural edits are saved as your local "base" dataset in the browser.
Use **Export JSON** to back up or to publish changes.

---

## Media uploads (important limitation)

This site is **static** (GitHub Pages/Netlify). Static sites **cannot upload files to the server**.

So you have two options:

1) **Best for high-quality video from phone (recommended):**
   - Upload the video to YouTube (unlisted) / Google Drive / iCloud / Dropbox
   - Paste the link into the entry
   - YouTube links embed automatically

2) **Quick local review on your phone:**
   - Use **Add local** to attach a small photo/video (small files only)
   - This stores the media **only on that device**

If you need true “upload from phone and coach can view instantly”, you’ll want a backend app.

## 4) Editing weekly

### The simple workflow
1. Click the Excel link for the day/exercise.
2. Paste video links.
3. Write lifter comment / coach feedback.
4. Click **Save**.
5. Occasionally click **Export JSON** (backup).

Your edits persist in your browser automatically.

### If you want the edits to "live on the server"
Static hosting can’t write to the server.
So you do this:
- Export JSON
- Replace `data/data.json` in your hosting repo with the exported file

That makes the edits permanent for everyone.

---

## 5) Hosting (upload to the web)

You have two very easy options.

### Option A: GitHub Pages (recommended)
1. Create a free GitHub account if you don’t have one.
2. Create a new repository, e.g. `training-log-site`
3. Upload **all files** (index.html, app.js, styles.css, data/...)
4. In GitHub:
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: `main` / root
5. Your site goes live at:
   - `https://YOURUSERNAME.github.io/training-log-site/`

### Option B: Netlify (fastest)
1. Go to Netlify
2. Drag-and-drop the folder into the deploy area
3. Netlify gives you a live URL instantly
4. Later you can connect GitHub for auto-deploy.

---

## 6) Updating `data/data.json`

Open `data/data.json` and edit:
- periods
- blocks
- weeks
- days
- exercises

### IDs must be stable
Use simple slugs (lowercase, hyphen):
- period id: `serie-1-2026`
- exercise id: `deadlift`, `bench-press`, `pause-squat`

If you change an ID later, old Excel links will break.

---

## 7) Optional: Generate JSON from Excel

If you want, use `tools/excel_to_json.py` — it expects a normalized sheet named `Entries`
with columns:

- period_id
- period_name
- block
- week
- day
- day_label
- exercise_id
- exercise_name
- work

Then it produces `data.json`.

See `tools/template_entries.xlsx` idea in the script comments.

---

## Troubleshooting

- **Blank page / “failed to load data”**:
  You opened the file directly. Use a local server:
  `python -m http.server`

- **My edits disappeared**:
  LocalStorage is per browser + per device. Export JSON for backups.

- **Excel link opens overview instead of an exercise**:
  Check your URL structure: it must include `/p/.../b/.../w/.../d/.../e/...`

---

Have fun — this is meant to be simple enough that you actually keep using it.


---

## Complete guide: publish to GitHub Pages

### Step 1 — Create a GitHub repository
1. Go to GitHub and log in.
2. Click **New repository**
3. Name it: `training-log-site` (or anything)
4. Set it to **Public**
5. Click **Create repository**

### Step 2 — Upload the site files
Upload:
- `index.html`
- `styles.css`
- `app.js`
- `data/data.json`
- the rest of the folder

**No Git method:**
1. Repo → **Add file → Upload files**
2. Drag all files in
3. **Commit changes**

### Step 3 — Turn on GitHub Pages
1. Repo → **Settings**
2. Left sidebar → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main**
5. Folder: **/ (root)**
6. Save

Your site URL becomes:
- `https://YOURUSERNAME.github.io/training-log-site/`

### Step 4 — Publish changes you made in the browser
Edits in the browser are stored locally.
To publish them:
1. Click **Export JSON**
2. In GitHub, edit `data/data.json`
3. Replace with the exported JSON
4. Commit changes
