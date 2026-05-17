# LW Dashboard

Live mobile-first dashboard for LaWayra Sales + Marketing numbers.

## Stack

- **Next.js 14** (App Router, JavaScript)
- **Tailwind CSS**
- **Vercel** (auto-deploys on push to `main`)
- **Apps Script Web App** as the data layer (reads three Google Sheets, returns aggregated JSON)

## Sections

| Section | Tabs |
|---|---|
| **Sales**   | Dashboard · Daily · Weekly · Monthly · Reps · Sales Log |
| **Ads**     | Dashboard · Daily · Weekly · Monthly |
| **Sources** | Monthly (Sales by Source aggregation) |

No PII is ever exposed by the API — guest names, recordings, phone numbers, and email addresses stay private inside the sheets. Only aggregates leave.

## Architecture

```
Sales Dashboard Sheet ─┐
Marketing Dashboard ───┼─►  Apps Script Web App ──►  Vercel (Next.js) ──► browser
Sales by Source Sheet ─┘     (apps-script-api.gs)        (this repo)
```

## Updating

**Every push to `main` auto-deploys to Vercel.**

```bash
cd ~/Desktop/lw-sales-dashboard
git add .
git commit -m "describe change"
git push
```

**The Apps Script only needs to be re-deployed when `apps-script-api.gs` changes:**

1. Paste the new contents into the Apps Script editor inside the Sales Dashboard sheet
2. Save (Cmd+S)
3. Deploy → Manage deployments → pencil ✏️ → Version: **New version** → Deploy

URL stays the same.

## Local dev (optional)

```bash
cd ~/Desktop/lw-sales-dashboard
npm install
npm run dev   # http://localhost:3000
```

## Files

```
app/
├── layout.jsx, page.jsx, globals.css
├── components/   Header, Nav, KpiCard, KpiBlock, DataTable
└── sections/     SalesDashboard, SalesDaily, SalesTracker, SalesReps,
                  SalesLog, AdsDashboard, AdsDaily, AdsTracker, Sources
lib/
├── api.js        fetch wrapper + API_URL
└── format.js     fmtNum / fmtPct / fmtMoney / fmtRoas / reformatMonthLabel
apps-script-api.gs    Server-side data layer (deploy in sheet)
```

## Troubleshooting

**"Failed to load: Cannot read properties of undefined…"** — the Apps Script wasn't redeployed after editing. Redeploy with **Version: New version**.

**Empty section** — that source sheet/tab is empty. Check the underlying tab in the corresponding Google Sheet.

**Numbers stale** — hit Refresh in the header, or hard-reload (Cmd+Shift+R).
