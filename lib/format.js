const blank = (n) => n === null || n === undefined || n === '' || Number.isNaN(Number(n));

export function fmtNum(n) {
  if (blank(n)) return '–';
  return Math.round(Number(n)).toLocaleString();
}

export function fmtPct(n) {
  if (blank(n)) return '–';
  return (Number(n) * 100).toFixed(1) + '%';
}

export function fmtMoney(n, decimals = 0) {
  if (blank(n)) return '–';
  return '$' + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
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
