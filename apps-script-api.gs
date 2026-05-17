/**
 * Sales Dashboard Web API
 *
 * Deploys as a Google Apps Script Web App that returns the Sales Dashboard
 * numbers as JSON. Only aggregated cells are exposed — guest names,
 * recordings, and other PII stay private inside the sheet.
 *
 * Returns:
 * {
 *   asOf: "2026-05-16T18:32:00.000Z",
 *   daily: {
 *     yesterday: { callsBooked, liveCalls, showRate, offersMade, offerRate,
 *                  sales, closeRateLive, closeRateOffers, cashCollected, revenue },
 *     wtd:       { ... same shape ... },
 *     mtd:       { ... same shape ... }
 *   },
 *   weekly:    [{ label, callsBooked, liveCalls, showRate, sales, closeRate, cash, revenue }, ...],
 *   monthly:   [{ ... same shape ... }, ...],
 *   reps: [
 *     { name, total: { callsBooked, liveCalls, showRate, offersMade, sales,
 *                      closeRate, cash, revenue },
 *       months: [{ label, callsBooked, liveCalls, showRate, offersMade, sales,
 *                  closeRate, cash, revenue }, ...] },
 *     ...
 *   ]
 * }
 *
 * Setup:
 *   1. Open Sales Dashboard sheet → Extensions → Apps Script
 *   2. New script file → paste this → save
 *   3. Deploy → New deployment → Type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. Copy the Web App URL (ends in /exec)
 *   5. Paste it into index.html as API_URL
 *
 * Re-deploy whenever this code changes (Deploy → Manage deployments → edit → "New version").
 */

var SHEET_ID = '1fcBghq6dXp9v_58Lz0b-Fm5iXYlhw4HF00zQUjCSSTU';

function doGet(e) {
  try {
    var payload = buildPayload();
    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildPayload() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return {
    asOf:    new Date().toISOString(),
    dashboard: readDaily(ss.getSheetByName('Daily Report')),  // Yesterday/WTD/MTD KPIs
    daily:     readDailyByDate(ss.getSheetByName('Dashboard'), 30), // 1 row per date, last 30 days
    weekly:    readTracker(ss.getSheetByName('Weekly Tracker')),
    monthly:   readTracker(ss.getSheetByName('Monthly Tracker')),
    reps:      readRepBreakdown(ss.getSheetByName('Rep Monthly Breakdown'))
  };
}

/**
 * Aggregates the Dashboard tab (one row per call) into one row per date.
 * Returns last `limit` dates, newest first.
 *
 * Dashboard tab columns (row 4+):
 *   A=Day name, B=Date, C=Name, D=Sales Rep, E=Outcome,
 *   F=Recording, G=Objection, H=Notes, I=Revenue, J=Cash Collected
 *
 * We only return aggregates — names/recordings/notes never leave the sheet.
 */
function readDailyByDate(sh, limit) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 4) return [];

  // Read B (Date), E (Outcome), I (Revenue), J (Cash) for all data rows.
  var range = sh.getRange(4, 2, lastRow - 3, 9).getValues();
  // range[i] indexes: 0=B(Date), 1=C(Name, skip), 2=D(Rep, skip), 3=E(Outcome),
  //                   4=F, 5=G, 6=H, 7=I(Revenue), 8=J(Cash)

  var tz = 'America/Bogota';
  var byDate = {}; // key = "MM/dd/yyyy" → aggregate

  for (var i = 0; i < range.length; i++) {
    var d = range[i][0];
    if (!(d instanceof Date)) continue;
    var key = Utilities.formatDate(d, tz, 'MM/dd/yyyy');
    var outcome = String(range[i][3] || '');
    var revenue = Number(range[i][7]) || 0;
    var cash = Number(range[i][8]) || 0;

    if (!byDate[key]) {
      byDate[key] = {
        _epoch: d.getTime(),
        label: key,
        dayName: Utilities.formatDate(d, tz, 'EEE'),
        callsBooked: 0,
        apptBooked: 0,
        liveCalls: 0,
        offersMade: 0,
        sales: 0,
        cash: 0,
        revenue: 0
      };
    }
    var row = byDate[key];
    row.callsBooked++;
    if (outcome === 'Appointment Booked') row.apptBooked++;
    if (outcome !== 'No Show' && outcome !== 'Appointment Booked') row.liveCalls++;
    if (outcome === 'Sale' || outcome === 'Offer / Disqualified' || outcome === 'No Sale') row.offersMade++;
    if (outcome === 'Sale') row.sales++;
    row.cash += cash;
    row.revenue += revenue;
  }

  // Convert to array, sort newest first, compute rates, slice to limit.
  var arr = Object.keys(byDate).map(function(k) { return byDate[k]; });
  arr.sort(function(a, b) { return b._epoch - a._epoch; });
  if (limit && arr.length > limit) arr = arr.slice(0, limit);

  for (var i = 0; i < arr.length; i++) {
    var r = arr[i];
    // Show Rate = liveCalls / (callsBooked - apptBooked) — matches sheet
    var showDenom = r.callsBooked - r.apptBooked;
    r.showRate = (showDenom > 0) ? r.liveCalls / showDenom : 0;
    r.closeRate = (r.liveCalls > 0) ? r.sales / r.liveCalls : 0;
    delete r._epoch;
    delete r.apptBooked;
  }
  return arr;
}

/**
 * Daily Report layout (from setup-sales-dashboard.gs):
 *   Yesterday block: rows 5-14 (labels col A, values col B)
 *   WTD block:       rows 17-26
 *   MTD block:       rows 29-38
 * Metrics in order: Calls Booked, Live Calls, Show Rate, Offers Made,
 * Offer Rate, Sales, Close Rate (Live), Close Rate (Offers), Cash, Revenue.
 */
function readDaily(sh) {
  if (!sh) return null;
  var keys = [
    'callsBooked', 'liveCalls', 'showRate', 'offersMade', 'offerRate',
    'sales', 'closeRateLive', 'closeRateOffers', 'cashCollected', 'revenue'
  ];
  return {
    yesterday: readBlock(sh, 5,  keys),
    wtd:       readBlock(sh, 17, keys),
    mtd:       readBlock(sh, 29, keys)
  };
}

function readBlock(sh, startRow, keys) {
  var values = sh.getRange(startRow, 2, keys.length, 1).getValues();
  var out = {};
  for (var i = 0; i < keys.length; i++) {
    out[keys[i]] = values[i][0];
  }
  return out;
}

/**
 * Tracker layout (Weekly + Monthly): row 1 = headers, rows 2+ = data.
 * Columns: A=Label, B=Calls Booked, C=Live Calls, D=Show Rate, E=Sales,
 *          F=Close Rate, G=Cash Collected, H=Revenue.
 *
 * Skips rows where Calls Booked is blank/0 — these are future periods the
 * BYROW formulas leave empty.
 */
function readTracker(sh) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var data = sh.getRange(2, 1, lastRow - 1, 8).getValues();
  var tz = 'America/Bogota';
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;                    // no label → skip
    if (r[1] === '' || r[1] === null) continue; // future period → skip

    // Label can be a Date (Weekly tab) or a string like "May 2026" (Monthly).
    var label = (r[0] instanceof Date)
      ? Utilities.formatDate(r[0], tz, 'MM/dd/yyyy')
      : String(r[0]);

    rows.push({
      label:       label,
      callsBooked: r[1],
      liveCalls:   r[2],
      showRate:    r[3],
      sales:       r[4],
      closeRate:   r[5],
      cash:        r[6],
      revenue:     r[7]
    });
  }
  return rows;
}

/**
 * Rep Monthly Breakdown layout (from add-rep-monthly-breakdown.gs):
 * Per-rep block:
 *   Row N:   Rep name (merged, bold)
 *   Row N+1: Headers: Metric | TOTAL | Jan 2024 | Feb 2024 | ...
 *   Row N+2..N+9: 8 metric rows (Calls Booked, Live Calls, Show Rate,
 *                  Offers Made, Sales, Close Rate, Cash Collected, Revenue)
 *   Row N+10: spacer
 *
 * We scan column A for rep names (matching a known allowlist), then read
 * the 8 metric rows starting 2 rows below.
 */
function readRepBreakdown(sh) {
  if (!sh) return [];
  var reps = ['Nico', 'Aliyah', 'Jacobo', 'Thomas', 'Marcus', 'Sam',
              'Paul', 'Madhu', 'Matt', 'Lukas'];
  var repSet = {};
  reps.forEach(function(r) { repSet[r] = true; });

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 5 || lastCol < 3) return [];

  var colA = sh.getRange(1, 1, lastRow, 1).getValues();
  var metricKeys = [
    'callsBooked', 'liveCalls', 'showRate', 'offersMade',
    'sales', 'closeRate', 'cash', 'revenue'
  ];

  var out = [];
  for (var r = 0; r < colA.length; r++) {
    var name = colA[r][0];
    if (!name || !repSet[name]) continue;

    var headerRow = r + 1;                  // 0-indexed
    var firstMetricRow = r + 2;             // 0-indexed
    if (firstMetricRow + metricKeys.length > lastRow) continue;

    // Read header row to get month labels (col 1 = "Metric", col 2 = "TOTAL", cols 3+ = months)
    var headers = sh.getRange(headerRow + 1, 1, 1, lastCol).getValues()[0];
    // Read 8 metric rows × all columns
    var block = sh.getRange(firstMetricRow + 1, 1, metricKeys.length, lastCol).getValues();

    // Build TOTAL object (col index 1)
    var total = {};
    for (var i = 0; i < metricKeys.length; i++) {
      total[metricKeys[i]] = block[i][1];
    }

    // Build months array (col index 2+)
    var tz = 'America/Bogota';
    var months = [];
    for (var c = 2; c < lastCol; c++) {
      var monthLabel = headers[c];
      if (!monthLabel) continue;

      var callsBookedVal = block[0][c];
      // Skip month if Calls Booked is blank or 0 — empty/future month
      if (callsBookedVal === '' || callsBookedVal === null) continue;
      if (Number(callsBookedVal) === 0) continue;

      // Header cell may be a Date — format as "MMM yyyy"
      var labelStr = (monthLabel instanceof Date)
        ? Utilities.formatDate(monthLabel, tz, 'MMM yyyy')
        : String(monthLabel);

      var monthRow = { label: labelStr };
      for (var i = 0; i < metricKeys.length; i++) {
        monthRow[metricKeys[i]] = block[i][c];
      }
      months.push(monthRow);
    }

    out.push({ name: String(name), total: total, months: months });
  }
  return out;
}
