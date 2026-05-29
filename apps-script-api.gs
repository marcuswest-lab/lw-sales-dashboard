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

    // Ads section — computed per-platform from each daily tab.
    // Tabs: GG Daily (Google), FB Daily (Facebook), TT Daily (TikTok).
    // Each function handles missing tabs gracefully (returns null/[]).
    // `all` is computed in-API by summing the three platforms day-by-day so
    // it does not depend on an All Ads Daily tab being populated with rows.
    ads: {
      google: {
        dashboard: readAdsDashboardFromRaw(mktSS.getSheetByName('GG Daily')),
        daily:     readAdsByDate(mktSS.getSheetByName('GG Daily'), 30),
        weekly:    readAdsTrackerFromRaw(mktSS.getSheetByName('GG Daily'), 'week'),
        monthly:   readAdsTrackerFromRaw(mktSS.getSheetByName('GG Daily'), 'month')
      },
      facebook: {
        dashboard: readAdsDashboardFromRaw(mktSS.getSheetByName('FB Daily')),
        daily:     readAdsByDate(mktSS.getSheetByName('FB Daily'), 30),
        weekly:    readAdsTrackerFromRaw(mktSS.getSheetByName('FB Daily'), 'week'),
        monthly:   readAdsTrackerFromRaw(mktSS.getSheetByName('FB Daily'), 'month')
      },
      tiktok: {
        dashboard: readAdsDashboardFromRaw(mktSS.getSheetByName('TT Daily')),
        daily:     readAdsByDate(mktSS.getSheetByName('TT Daily'), 30),
        weekly:    readAdsTrackerFromRaw(mktSS.getSheetByName('TT Daily'), 'week'),
        monthly:   readAdsTrackerFromRaw(mktSS.getSheetByName('TT Daily'), 'month')
      },
      all: buildAllAdsAggregate_(mktSS),

      // Legacy alias — points at Google so old clients don't break
      dashboard: readAdsDashboardFromRaw(mktSS.getSheetByName('GG Daily')),
      daily:     readAdsByDate(mktSS.getSheetByName('GG Daily'), 30),
      weekly:    readAdsTrackerFromRaw(mktSS.getSheetByName('GG Daily'), 'week'),
      monthly:   readAdsTrackerFromRaw(mktSS.getSheetByName('GG Daily'), 'month')
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
// ADS — Compute Yesterday / WTD / MTD / Pace directly from the Dashboard tab
// (Bypasses the Marketing Daily Report tab whose formulas reference outdated
// column positions.) Uses the same col indices as readAdsByDate.
// ============================================================================
function readAdsDashboardFromRaw(sh) {
  if (!sh) return null;
  var lastRow = sh.getLastRow();
  if (lastRow < 4) return null;

  // Read B..Q (16 cols). Indices: 0=B(Date) 1=C(Spend) 7=I(Leads)
  //   10=L(Booked) 12=N(Sales) 14=P(Revenue)
  var data = sh.getRange(4, 2, lastRow - 3, 16).getValues();

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var yesterday = new Date(today.getTime() - 86400000);
  var weekStart = startOfWeek_(today);          // Monday this week (rolling 7d on Mon)
  var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // For Monday rollover: if today IS Monday, use last 7 complete days
  if (today.getDay() === 1) {
    weekStart = new Date(today.getTime() - 7 * 86400000);
  }

  var blocks = {
    yesterday: emptyBlock_(),
    wtd:       emptyBlock_(),
    mtd:       emptyBlock_(),
    pace:      emptyBlock_()
  };

  for (var i = 0; i < data.length; i++) {
    var d = data[i][0];
    if (!(d instanceof Date)) {
      if (typeof d === 'string' && d) {
        var p = new Date(d);
        if (!isNaN(p.getTime())) d = p; else continue;
      } else continue;
    }
    var dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var spend       = Number(data[i][1])  || 0;
    var leads       = Number(data[i][7])  || 0;
    var bookedCalls = Number(data[i][10]) || 0;
    var sales       = Number(data[i][12]) || 0;
    var revenue     = Number(data[i][14]) || 0;

    if (dDay.getTime() === yesterday.getTime()) addToBlock_(blocks.yesterday, spend, leads, bookedCalls, sales, revenue);
    if (dDay >= weekStart && dDay <= (today.getDay() === 1 ? yesterday : today))
      addToBlock_(blocks.wtd, spend, leads, bookedCalls, sales, revenue);
    if (dDay >= monthStart && dDay <= today)
      addToBlock_(blocks.mtd, spend, leads, bookedCalls, sales, revenue);
  }

  finalizeBlock_(blocks.yesterday);
  finalizeBlock_(blocks.wtd);
  finalizeBlock_(blocks.mtd);

  // Pace = MTD linearly extrapolated to month-end
  var daysElapsed = today.getDate() - 1; // exclude today (incomplete)
  if (daysElapsed > 0) {
    var daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    var mult = daysInMonth / daysElapsed;
    blocks.pace = {
      spend:       blocks.mtd.spend       * mult,
      leads:       Math.round(blocks.mtd.leads       * mult),
      bookedCalls: Math.round(blocks.mtd.bookedCalls * mult),
      sales:       Math.round(blocks.mtd.sales       * mult),
      revenue:     blocks.mtd.revenue     * mult
    };
    finalizeBlock_(blocks.pace);
  } else {
    blocks.pace = null;
  }

  return blocks;
}

function emptyBlock_() {
  return { spend: 0, leads: 0, bookedCalls: 0, sales: 0, revenue: 0 };
}

function addToBlock_(b, spend, leads, booked, sales, revenue) {
  b.spend       += spend;
  b.leads       += leads;
  b.bookedCalls += booked;
  b.sales       += sales;
  b.revenue     += revenue;
}

function finalizeBlock_(b) {
  b.cpl       = (b.leads > 0)       ? b.spend / b.leads       : 0;
  b.costPerBC = (b.bookedCalls > 0) ? b.spend / b.bookedCalls : 0;
  b.cpa       = (b.sales > 0)       ? b.spend / b.sales       : 0;
  b.roas      = (b.spend > 0)       ? b.revenue / b.spend     : 0;
}

function startOfWeek_(d) {
  // Monday as start of week. JS Sun=0..Sat=6
  var day = d.getDay();
  var diff = (day === 0) ? -6 : (1 - day); // back to Monday
  return new Date(d.getTime() + diff * 86400000);
}

// ============================================================================
// ADS — Marketing Dashboard tab aggregated 1 row per date
// Dashboard cols (confirmed from sheet, May 2026):
//   A=Timeline B=Date C=Spend D=Impressions E=CPM F=Clicks G=CTR H=CPC
//   I=Leads(LF) J=CPL(LF) K=Opt-in Rate L=Booked Calls M=Cost/BC
//   N=Sales O=CPA P=Revenue Q=ROAS
// We read B..Q (col 2..17) = 16 cols. Indices relative to that slice:
//   0=B(Date) 1=C(Spend) 7=I(Leads) 10=L(Booked) 12=N(Sales) 14=P(Revenue)
// ============================================================================
function readAdsByDate(sh, limit) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 4) return [];

  var data = sh.getRange(4, 2, lastRow - 3, 16).getValues();

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
    r.spend       += Number(data[i][1])  || 0;  // C
    r.leads       += Number(data[i][7])  || 0;  // I
    r.bookedCalls += Number(data[i][10]) || 0;  // L
    r.sales       += Number(data[i][12]) || 0;  // N
    r.revenue     += Number(data[i][14]) || 0;  // P
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
// ADS — Compute Weekly / Monthly tracker from the raw Dashboard tab.
// Same col mapping as readAdsByDate:
//   0=B(Date) 1=C(Spend) 7=I(Leads) 10=L(Booked) 12=N(Sales) 14=P(Revenue)
// Returns rows newest-first, only periods with actual spend.
// ============================================================================
function readAdsTrackerFromRaw(sh, grouping) {
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 4) return [];

  var data = sh.getRange(4, 2, lastRow - 3, 16).getValues();
  var byKey = {};

  for (var i = 0; i < data.length; i++) {
    var d = data[i][0];
    if (!(d instanceof Date)) {
      if (typeof d === 'string' && d) {
        var p = new Date(d);
        if (!isNaN(p.getTime())) d = p; else continue;
      } else continue;
    }

    var key, label, sortDate;
    if (grouping === 'month') {
      sortDate = new Date(d.getFullYear(), d.getMonth(), 1);
      key = Utilities.formatDate(sortDate, TZ, 'yyyy-MM');
      label = Utilities.formatDate(sortDate, TZ, 'MM/dd/yyyy');
    } else { // week — Monday start
      var weekStart = startOfWeek_(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      sortDate = weekStart;
      key = Utilities.formatDate(weekStart, TZ, 'yyyy-MM-dd');
      label = Utilities.formatDate(weekStart, TZ, 'MM/dd/yyyy');
    }

    if (!byKey[key]) {
      byKey[key] = {
        _epoch: sortDate.getTime(),
        label: label,
        spend: 0, leads: 0, bookedCalls: 0, sales: 0, revenue: 0
      };
    }
    var r = byKey[key];
    r.spend       += Number(data[i][1])  || 0;
    r.leads       += Number(data[i][7])  || 0;
    r.bookedCalls += Number(data[i][10]) || 0;
    r.sales       += Number(data[i][12]) || 0;
    r.revenue     += Number(data[i][14]) || 0;
  }

  var arr = Object.keys(byKey).map(function(k) { return byKey[k]; });
  arr.sort(function(a, b) { return b._epoch - a._epoch; });

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

// Legacy: kept for fallback. Reads pre-built Marketing tracker tabs.
// Not used by default — column references are stale.
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

// ============================================================================
// ADS — AGGREGATE across all platforms (Google + Facebook + TikTok)
// Sums each platform's per-date data day-by-day, then re-runs the same
// dashboard/daily/weekly/monthly shape so the Vercel "All Ads" tab can use
// the same components as a single-platform tab.
// ============================================================================
function buildAllAdsAggregate_(mktSS) {
  var tabs = ['GG Daily', 'FB Daily', 'TT Daily'];

  // 1. Pull each platform's per-date rows. readAdsByDate returns
  //    [{date,label,dayName,spend,leads,bookedCalls,sales,revenue,cpl,...}, ...]
  //    (sorted recent first, limit 30 — we override limit for aggregation).
  var perDate = {}; // key = yyyy-MM-dd, value = {spend, leads, bookedCalls, sales, revenue, _date}
  for (var t = 0; t < tabs.length; t++) {
    var sh = mktSS.getSheetByName(tabs[t]);
    if (!sh) continue;
    var lastRow = sh.getLastRow();
    if (lastRow < 4) continue;
    var data = sh.getRange(4, 2, lastRow - 3, 16).getValues();
    for (var i = 0; i < data.length; i++) {
      var d = data[i][0];
      if (!(d instanceof Date)) {
        if (typeof d === 'string' && d) {
          var p = new Date(d);
          if (!isNaN(p.getTime())) d = p; else continue;
        } else continue;
      }
      var key = Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
      if (!perDate[key]) {
        perDate[key] = {
          _date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          spend: 0, leads: 0, bookedCalls: 0, sales: 0, revenue: 0,
          // bookedCallsSet: whether ANY tab contributed booked calls — used to
          // dedupe (booked calls are shared across platform tabs by V8 backfill)
          bookedCallsMax: 0
        };
      }
      perDate[key].spend       += Number(data[i][1])  || 0;
      perDate[key].leads       += Number(data[i][7])  || 0;
      var bc = Number(data[i][10]) || 0;
      // Booked Calls are mirrored across all 3 platform tabs by V8. Take MAX
      // not SUM to avoid triple-counting.
      if (bc > perDate[key].bookedCallsMax) perDate[key].bookedCallsMax = bc;
      perDate[key].sales       += Number(data[i][12]) || 0;
      perDate[key].revenue     += Number(data[i][14]) || 0;
    }
  }

  // Resolve bookedCalls = max
  Object.keys(perDate).forEach(function(k) { perDate[k].bookedCalls = perDate[k].bookedCallsMax; });

  // 2. Build the four output shapes from perDate

  // ----- daily (last 30 days, recent first) -----
  var dailyArr = Object.keys(perDate).map(function(k) {
    var pd = perDate[k];
    return {
      _epoch: pd._date.getTime(),
      label:  Utilities.formatDate(pd._date, TZ, 'MM/dd/yyyy'),
      dayName: Utilities.formatDate(pd._date, TZ, 'EEE'),
      spend: pd.spend,
      leads: pd.leads,
      bookedCalls: pd.bookedCalls,
      sales: pd.sales,
      revenue: pd.revenue,
      cpl:       pd.leads > 0 ? pd.spend / pd.leads : 0,
      costPerBC: pd.bookedCalls > 0 ? pd.spend / pd.bookedCalls : 0,
      cpa:       pd.sales > 0 ? pd.spend / pd.sales : 0,
      roas:      pd.spend > 0 ? pd.revenue / pd.spend : 0
    };
  });
  dailyArr.sort(function(a, b) { return b._epoch - a._epoch; });
  var daily = dailyArr.slice(0, 30).map(function(r) { delete r._epoch; return r; });

  // ----- dashboard (yesterday / wtd / mtd / pace) -----
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var yesterday = new Date(today.getTime() - 86400000);
  var weekStart = startOfWeek_(today);
  if (today.getDay() === 1) weekStart = new Date(today.getTime() - 7 * 86400000);
  var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  var blocks = {
    yesterday: emptyBlock_(),
    wtd:       emptyBlock_(),
    mtd:       emptyBlock_(),
    pace:      emptyBlock_()
  };

  Object.keys(perDate).forEach(function(k) {
    var pd = perDate[k];
    var dDay = pd._date;
    if (dDay.getTime() === yesterday.getTime()) addToBlock_(blocks.yesterday, pd.spend, pd.leads, pd.bookedCalls, pd.sales, pd.revenue);
    if (dDay >= weekStart && dDay <= (today.getDay() === 1 ? yesterday : today))
      addToBlock_(blocks.wtd, pd.spend, pd.leads, pd.bookedCalls, pd.sales, pd.revenue);
    if (dDay >= monthStart && dDay <= today)
      addToBlock_(blocks.mtd, pd.spend, pd.leads, pd.bookedCalls, pd.sales, pd.revenue);
  });

  finalizeBlock_(blocks.yesterday);
  finalizeBlock_(blocks.wtd);
  finalizeBlock_(blocks.mtd);

  var daysElapsed = today.getDate() - 1;
  if (daysElapsed > 0) {
    var daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    var mult = daysInMonth / daysElapsed;
    blocks.pace = {
      spend:       blocks.mtd.spend       * mult,
      leads:       Math.round(blocks.mtd.leads       * mult),
      bookedCalls: Math.round(blocks.mtd.bookedCalls * mult),
      sales:       Math.round(blocks.mtd.sales       * mult),
      revenue:     blocks.mtd.revenue     * mult
    };
    finalizeBlock_(blocks.pace);
  } else {
    blocks.pace = null;
  }

  // ----- weekly + monthly: aggregate dailyArr by week/month -----
  function bucket(grain) {
    var byKey = {};
    Object.keys(perDate).forEach(function(k) {
      var pd = perDate[k];
      var d = pd._date;
      var key, label;
      if (grain === 'week') {
        var ws = startOfWeek_(d);
        key = Utilities.formatDate(ws, TZ, 'yyyy-MM-dd');
        label = 'Week of ' + Utilities.formatDate(ws, TZ, 'MM/dd');
      } else { // month
        key = Utilities.formatDate(d, TZ, 'yyyy-MM');
        label = Utilities.formatDate(d, TZ, 'MMM yyyy');
      }
      if (!byKey[key]) {
        byKey[key] = { _key: key, label: label, spend: 0, leads: 0, bookedCalls: 0, sales: 0, revenue: 0 };
      }
      byKey[key].spend       += pd.spend;
      byKey[key].leads       += pd.leads;
      byKey[key].bookedCalls += pd.bookedCalls;
      byKey[key].sales       += pd.sales;
      byKey[key].revenue     += pd.revenue;
    });
    var arr = Object.keys(byKey).map(function(k) {
      var b = byKey[k];
      b.cpl       = b.leads > 0 ? b.spend / b.leads : 0;
      b.costPerBC = b.bookedCalls > 0 ? b.spend / b.bookedCalls : 0;
      b.cpa       = b.sales > 0 ? b.spend / b.sales : 0;
      b.roas      = b.spend > 0 ? b.revenue / b.spend : 0;
      return b;
    });
    arr.sort(function(a, b) { return b._key.localeCompare(a._key); });
    arr.forEach(function(r) { delete r._key; });
    return arr;
  }

  return {
    dashboard: blocks,
    daily:     daily,
    weekly:    bucket('week'),
    monthly:   bucket('month')
  };
}
