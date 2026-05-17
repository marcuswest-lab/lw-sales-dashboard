const blank = (n) => n === null || n === undefined || n === '' || Number.isNaN(Number(n));

export function fmtNum(n) {
  if (blank(n)) return '–';
  return Math.round(Number(n)).toLocaleString();
}

export function fmtPct(n) {
  if (blank(n)) return '–';
  return (Number(n) * 100).toFixed(1) + '%';
}

export function fmtMoney(n, decimals) {
  if (blank(n)) return '–';
  // DataTable passes (value, row) — guard against non-numeric `decimals`.
  const d = (typeof decimals === 'number' && decimals >= 0 && decimals <= 20) ? decimals : 0;
  return '$' + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}

export function fmtRoas(n) {
  if (blank(n)) return '–';
  return Number(n).toFixed(2) + 'x';
}

// MM/dd/yyyy → "May 2025"
export function reformatMonthLabel(label) {
  const m = String(label).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return label;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m[1], 10) - 1] + ' ' + m[3];
}
