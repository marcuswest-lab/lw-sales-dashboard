# LW Sales Dashboard — Web View

Mobile-first dashboard that mirrors the Sales Dashboard Google Sheet. Only aggregate numbers are exposed — no guest names, no recordings.

## Architecture

```
Google Sheet (private)
   │
   ├── Daily Report tab
   ├── Weekly Tracker tab
   ├── Monthly Tracker tab
   └── Rep Monthly Breakdown tab
        │
        ▼
   Apps Script Web App  ──── returns JSON  ────►  Vercel-hosted index.html
   (executes as "Me",
    accessible by Anyone)
```

The Apps Script Web App runs inside the sheet, so it has read access while the sheet itself stays private. Only the aggregated numbers are returned as JSON — no row-level PII.

## Deploy steps

### 1. Deploy the Apps Script Web App

1. Open the Sales Dashboard sheet → **Extensions → Apps Script**.
2. Add a new script file, paste the contents of [`apps-script-api.gs`](./apps-script-api.gs), save.
3. **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me (your Google account)**
   - Who has access: **Anyone**
4. Click **Deploy**, authorize when prompted, copy the **Web app URL** (ends in `/exec`).

### 2. Configure index.html

Open `index.html`, find this line near the bottom:

```js
const API_URL = 'PASTE_WEB_APP_URL_HERE';
```

Replace with the URL from step 1.

### 3. Push to GitHub + Vercel

```bash
# from this folder
git init
git add index.html README.md
git commit -m "Initial sales dashboard"
# create the repo on github.com, then:
git remote add origin git@github.com:<you>/lw-sales-dashboard.git
git push -u origin main
```

Then in Vercel:
1. **New Project → Import** your GitHub repo
2. Framework Preset: **Other** (it's static)
3. Root Directory: `./` (or `sales-dashboard-web/` if the repo includes the parent folder)
4. Deploy

Vercel auto-redeploys on every push to `main`. The dashboard fetches fresh numbers from the sheet on every page load — no rebuild needed when the sheet changes.

## Re-deploying the Apps Script

If you edit `apps-script-api.gs`:
1. Paste new code into the Apps Script editor
2. **Deploy → Manage deployments → Edit (pencil icon) → Version: New version → Deploy**

The Web App URL stays the same — no need to update `index.html`.

## What's exposed

- Daily Report: Yesterday / WTD / MTD aggregates (10 metrics each)
- Weekly Tracker: last 12 weeks (label, calls, live, show%, sales, close%, cash, revenue)
- Monthly Tracker: last 12 months (same shape)
- Rep Monthly Breakdown: per-rep all-time totals + by-month breakdown for Nico/Aliyah/Jacobo/Thomas (only reps with > 0 calls shown)

What is **NOT** exposed: guest names, recording links, objection notes, call dates, or anything from individual call rows.

## Troubleshooting

**"API_URL not configured"** — you skipped step 2 above.

**"HTTP 401" or login redirect** — the Web App is deployed but access is set to "Only myself" or "Anyone with Google account". Re-deploy with **Anyone**.

**Numbers don't match the sheet** — hard refresh the page (Cmd+Shift+R). The fetch uses `cache: 'no-store'`, but your browser may have a stale Vercel asset.

**One of the tabs is empty** — the source tab in the sheet is empty. E.g. if Weekly Tracker rows are blank, the API returns `[]` and the page shows "No data."
