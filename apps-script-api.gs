/**
 * LW Sales + Marketing Dashboard Web API
 *
 * Returns aggregated numbers from THREE sheets:
 *   1. LW Sales Dashboard    — sales-team activity
 *   2. LW Marketing Dashboard — Google Ads spend, leads, ROAS
 *   3. Sales by Source       — paid bookings ledger (aggregated by booking source)
 *
 * Only aggregates leave the script. No guest names, no recordings, no PII.
 *
 * Setup (one-time):
 *   1. In Sales Dashboard sheet → Extensions → Apps Script
 *   2. Paste this file, save
 *   3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 *   4. Copy URL ending in /exec into Next.js .env / API_URL
 *
 * Re-deploy after every code change: Deploy → Manage deployments → pencil → Version: New version → Deploy.
 */

var SALES_SHEET_ID     = '1fcBghq6dXp9v_58Lz0b-Fm5iXYlhw4HF00zQUjCSSTU';
var MARKETING_SHEET_ID = '1du8jYw-EPr3Bvkiq-_sMsA8XNtWH-d81AXS48glVzvc';
var SBS_SHEET_ID       = '139G-OUoApI5ksdSMXMe_WE8geaw_mZ3Sv8PYvBDsq5w';
var TZ = 'America/Bogota';

function doGet(e) {
  try {
    return json(buildPayload());
  } catch (err) {
    return json({ error: err.message, stack: err.stack });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPayload() {
  var salesSS = SpreadsheetApp.openById(SALES_SHEET_ID);
  var mktSS   = SpreadsheetApp.openById(MARKETING_SHEET_ID);
  var sbsSS   = SpreadsheetApp.openById(SBS_SHEET_ID);

  return {
    asOf: new Date().toISOString(),

    // Sales section
    sales: {
      dashboard: readSalesDaily(salesSS.getSheetByName('Daily Report')),
      daily:     readSalesByDate(salesSS.getSheetByName('Dashboard'), 30),
      weekly:    readSalesTracker(salesSS.getSheetByName('Weekly Tracker')),
      monthly:   readSalesTracker(salesSS.getSheetByName('Monthly Tracker')),
      reps:      readRepBreakdown(salesSS.getSheetByName('Rep Monthly Breakdown')),
      log:       readSalesLog(salesSS.getSheetByName('Sales'))
    },

    // Ads section
    ads: {
      dashboard: readAdsDaily(mktSS.getSheetByName('Daily Report')),
      daily:     readAdsByDate(mktSS.getSheetByName('Dashboard'), 30),
      weekly:    readAdsTracker(mktSS.getSheetByName('Weekly Tracker')),
      monthly:   readAdsTracker(mktSS.getSheetByName('Monthly Tracker'))
    },

    // Sources section
    sources: {
      monthly: readSalesBySource(sbsSS.getSheetByName('Raw Bookings'))
    }
  };
}

// ============================================================================
// SALES — Daily Report tab (Yesterday / WTD / MTD KPI blocks)
// ============================================================================
function readSalesDaily(sh) {
  if (!sh) return null;
  var keys = ['callsBooked','liveCalls','showRate','offersMade','offerRate',
              'sales','closeRateLive','closeRateOffers','cashCollected','revenue'];
  return {
    yesterday: readBlock(sh, 5,  keys),
    wtd:       readBlock(sh, 17, keys),
    mtd:       readBlock(sh, 29, keys)
  };
}

function readBlock(sh, startRow, keys) {
  var vals = sh.getRange(startRow, 2, keys.length, 1).getValues();
  var out = {};
  for (var i = 0; i < keys.length; i++) out[keys[i]] = vals[i][0];
  return out;
}

// ============================================================================
// SALES — Dashboard tab aggregated 1 row per date
// ============================================================================
function readSalesByDate(sh, limit) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 4) return [];

  var range = sh.getRange(4, 2, lastRow - 3, 9).getValues();
  // 0=B(Date) 1=C(Name skip) 2=D(Rep skip) 3=E(Outcome) ... 7=I(Revenue) 8=J(Cash)
  var byDate = {};

  for (var i = 0; i < range.length; i++) {
    var d = range[i][0];
    if (!(d instanceof Date)) continue;
    var key = Utilities.formatDate(d, TZ, 'MM/dd/yyyy');
    var outcome = String(range[i][3] || '');
    var revenue = Number(range[i][7]) || 0;
    var cash    = Number(range[i][8]) || 0;

    if (!byDate[key]) {
      byDate[key] = {
        _epoch: d.getTime(),
        label: key,
        dayName: Utilities.formatDate(d, TZ, 'EEE'),
        callsBooked: 0, apptBooked: 0, liveCalls: 0,
        offersMade: 0, sales: 0, cash: 0, revenue: 0
      };
    }
    var r = byDate[key];
    r.callsBooked++;
    if (outcome === 'Appointment Booked') r.apptBooked++;
    if (outcome !== 'No Show' && outcome !== 'Appointment Booked') r.liveCalls++;
    if (outcome === 'Sale' || outcome === 'Offer / Disqualified' || outcome === 'No Sale') r.offersMade++;
    if (outcome === 'Sale') r.sales++;
    r.cash    += cash;
    r.revenue += revenue;
  }

  var arr = Object.keys(byDate).map(function(k) { return byDate[k]; });
  arr.sort(function(a, b) { return b._epoch - a._epoch; });
  if (limit && arr.length > limit) arr = arr.slice(0, limit);

  for (var i = 0; i < arr.length; i++) {
    var r = arr[i];
    var denom = r.callsBooked - r.apptBooked;
    r.showRate  = (denom > 0) ? r.liveCalls / denom : 0;
    r.closeRate = (r.liveCalls > 0) ? r.sales / r.liveCalls : 0;
    delete r._epoch;
    delete r.apptBooked;
  }
  return arr;
}

// ============================================================================
// SALES — Weekly / Monthly Tracker (cols A-H)
// ============================================================================
function readSalesTracker(sh) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var data = sh.getRange(2, 1, lastRow - 1, 8).getValues();
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    if (r[1] === '' || r[1] === null) continue;
    rows.push({
      label: (r[0] instanceof Date) ? Utilities.formatDate(r[0], TZ, 'MM/dd/yyyy') : String(r[0]),
      callsBooked: r[1], liveCalls: r[2], showRate: r[3],
      sales: r[4], closeRate: r[5], cash: r[6], revenue: r[7]
    });
  }
  return rows;
}

// ============================================================================
// SALES — Rep Monthly Breakdown
// ============================================================================
function readRepBreakdown(sh) {
  if (!sh) return [];
  var reps = ['Nico','Aliyah','Jacobo','Thomas','Marcus','Sam','Paul','Madhu','Matt','Lukas'];
  var repSet = {}; reps.forEach(function(r) { repSet[r] = true; });

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 5 || lastCol < 3) return [];

  var colA = sh.getRange(1, 1, lastRow, 1).getValues();
  var metricKeys = ['callsBooked','liveCalls','showRate','offersMade','sales','closeRate','cash','revenue'];

  var out = [];
  for (var r = 0; r < colA.length; r++) {
    var name = colA[r][0];
    if (!name || !repSet[name]) continue;
    if (r + 2 + metricKeys.length > lastRow) continue;

    var headers = sh.getRange(r + 2, 1, 1, lastCol).getValues()[0];
    var block   = sh.getRange(r + 3, 1, metricKeys.length, lastCol).getValues();

    var total = {};
    for (var i = 0; i < metricKeys.length; i++) total[metricKeys[i]] = block[i][1];

    var months = [];
    for (var c = 2; c < lastCol; c++) {
      var hLabel = headers[c];
      if (!hLabel) continue;
      var callsVal = block[0][c];
      if (callsVal === '' || callsVal === null) continue;
      if (Number(callsVal) === 0) continue;

      var labelStr = (hLabel instanceof Date)
        ? Utilities.formatDate(hLabel, TZ, 'MMM yyyy')
        : String(hLabel);

      var mr = { label: labelStr };
      for (var i = 0; i < metricKeys.length; i++) mr[metricKeys[i]] = block[i][c];
      months.push(mr);
    }

    out.push({ name: String(name), total: total, months: months });
  }
  return out;
}

// ============================================================================
// SALES — Sales tab (paid bookings ledger)
// Sales tab cols (data starts row 4):
//   A=Timeline, B=Date of Purchase, C=Name, D=Retreat Length, E=Private/Shared,
//   F=Retreat #, G=Amount Closed, H=Amount Collected (DROPPED),
//   I=Source, J=Sales Person, K=Media Buyer, L=Retreat Dates, M=Notes
// Returns rows in the same column order as the sheet (minus Amount Collected).
// ============================================================================
function readSalesLog(sh) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 4) return [];
  var data = sh.getRange(4, 1, lastRow - 3, 13).getValues();

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var dateVal = data[i][1]; // col B
    if (!(dateVal instanceof Date)) continue;

    var closed = Number(data[i][6]) || 0; // G
    if (closed === 0) continue;

    rows.push({
      _epoch:     dateVal.getTime(),
      timeline:   String(data[i][0] || ''),  // A
      date:       Utilities.formatDate(dateVal, TZ, 'MM/dd/yyyy'), // B
      name:       String(data[i][2] || ''),  // C
      length:     String(data[i][3] || ''),  // D
      type:       String(data[i][4] || ''),  // E
      retreatNum: String(data[i][5] || ''),  // F
      closed:     closed,                     // G
      source:     String(data[i][8] || ''),   // I
      rep:        String(data[i][9] || ''),   // J
      mediaBuyer: String(data[i][10] || ''),  // K
      retreatDates: String(data[i][11] || ''),// L
      notes:      String(data[i][12] || '')   // M
    });
  }

  rows.sort(function(a, b) { return b._epoch - a._epoch; });
  rows.forEach(function(r) { delete r._epoch; });
  return rows;
}

// ============================================================================
// ADS — Marketing Daily Report (Yesterday / WTD / MTD / Pace KPI blocks)
// ============================================================================
function readAdsDaily(sh) {
  if (!sh) return null;
  // 9 metrics: Spend, Leads, CPL, BookedCalls, CostPerBC, Sales, CPA, Revenue, ROAS
  var keys = ['spend','leads','cpl','bookedCalls','costPerBC','sales','cpa','revenue','roas'];
  return {
    yesterday: readBlock(sh, 6,  keys),  // rows 6-14
    wtd:       readBlock(sh, 17, keys),  // rows 17-25
    mtd:       readBlock(sh, 28, keys),  // rows 28-36
    pace:      readBlock(sh, 39, keys)   // rows 39-47
  };
}

// ============================================================================
// ADS — Marketing Dashboard tab aggregated 1 row per date
// Dashboard cols (from setup-marketing-dashboard.gs):
//   B=Date, C=Spend, J=Leads, K=Booked Calls, N=Sales, P=Revenue
// ============================================================================
function readAdsByDate(sh, limit) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 4) return [];

  // Read B-P (col 2 through col 16) = 15 cols
  var data = sh.getRange(4, 2, lastRow - 3, 15).getValues();
  // indices: 0=B(Date) 1=C(Spend) 8=J(Leads) 9=K(Booked) 12=N(Sales) 14=P(Revenue)

  var byDate = {};
  for (var i = 0; i < data.length; i++) {
    var d = data[i][0];
    if (!(d instanceof Date)) {
      // Google Ads Script writes col B as string sometimes — try parse
      if (typeof data[i][0] === 'string' && data[i][0]) {
        var parsed = new Date(data[i][0]);
        if (!isNaN(parsed.getTime())) d = parsed; else continue;
      } else continue;
    }
    var key = Utilities.formatDate(d, TZ, 'MM/dd/yyyy');
    if (!byDate[key]) {
      byDate[key] = {
        _epoch: d.getTime(),
        label: key,
        dayName: Utilities.formatDate(d, TZ, 'EEE'),
        spend: 0, leads: 0, bookedCalls: 0, sales: 0, revenue: 0
      };
    }
    var r = byDate[key];
    r.spend       += Number(data[i][1])  || 0;
    r.leads       += Number(data[i][8])  || 0;
    r.bookedCalls += Number(data[i][9])  || 0;
    r.sales       += Number(data[i][12]) || 0;
    r.revenue     += Number(data[i][14]) || 0;
  }

  var arr = Object.keys(byDate).map(function(k) { return byDate[k]; });
  arr.sort(function(a, b) { return b._epoch - a._epoch; });
  if (limit && arr.length > limit) arr = arr.slice(0, limit);

  for (var i = 0; i < arr.length; i++) {
    var r = arr[i];
    r.cpl       = (r.leads > 0)       ? r.spend / r.leads       : 0;
    r.costPerBC = (r.bookedCalls > 0) ? r.spend / r.bookedCalls : 0;
    r.cpa       = (r.sales > 0)       ? r.spend / r.sales       : 0;
    r.roas      = (r.spend > 0)       ? r.revenue / r.spend     : 0;
    delete r._epoch;
  }
  return arr;
}

// ============================================================================
// ADS — Marketing Weekly / Monthly Tracker
// Headers: A=Label, B=Spend, C=Leads, D=CPL, E=Booked Calls, F=Cost/BC,
//          G=Sales, H=CPA, I=Revenue, J=ROAS
// ============================================================================
function readAdsTracker(sh) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var data = sh.getRange(2, 1, lastRow - 1, 10).getValues();
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    if (r[1] === '' || r[1] === null) continue;
    rows.push({
      label: (r[0] instanceof Date) ? Utilities.formatDate(r[0], TZ, 'MM/dd/yyyy') : String(r[0]),
      spend: r[1], leads: r[2], cpl: r[3], bookedCalls: r[4],
      costPerBC: r[5], sales: r[6], cpa: r[7], revenue: r[8], roas: r[9]
    });
  }
  return rows;
}

// ============================================================================
// SOURCES — Sales by Source / Raw Bookings, grouped by month + source category
// Raw Bookings cols: A=Date, D=BookingRef, E=GuestName(skip), H=Amount,
//                    J=Source Category (used here), O=Status, P=Booking Source
// Only returns aggregates: { month, source, bookings, revenue }.
// ============================================================================
function readSalesBySource(sh) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var data = sh.getRange(2, 1, lastRow - 1, 16).getValues();

  // Map "YYYY-MM|source" -> aggregate
  var byKey = {};
  for (var i = 0; i < data.length; i++) {
    var status = String(data[i][14] || '').trim().toLowerCase();
    if (status !== 'paid' && status !== 'deposit_paid') continue;

    var dateVal = data[i][0];
    if (!(dateVal instanceof Date)) {
      if (typeof dateVal === 'string' && dateVal) {
        var p = new Date(dateVal);
        if (!isNaN(p.getTime())) dateVal = p; else continue;
      } else continue;
    }

    var amount = Number(data[i][7]) || 0;
    // Col J = source category (index 9). Falls back to col P if J is blank.
    var source = String(data[i][9] || '').trim();
    if (!source) source = String(data[i][15] || '').trim();
    if (!source) source = '(no source)';

    var ymKey = Utilities.formatDate(dateVal, TZ, 'yyyy-MM');
    var monthLabel = Utilities.formatDate(dateVal, TZ, 'MMM yyyy');
    var key = ymKey + '|' + source;

    if (!byKey[key]) {
      byKey[key] = {
        ym: ymKey,
        month: monthLabel,
        source: source,
        bookings: 0,
        revenue: 0
      };
    }
    byKey[key].bookings++;
    byKey[key].revenue += amount;
  }

  var rows = Object.keys(byKey).map(function(k) { return byKey[k]; });
  // Sort by month desc, then by revenue desc within month
  rows.sort(function(a, b) {
    if (b.ym !== a.ym) return b.ym.localeCompare(a.ym);
    return b.revenue - a.revenue;
  });
  rows.forEach(function(r) { delete r.ym; });
  return rows;
}
