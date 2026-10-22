// ── Shared helpers (same behaviour as the original pages) ──

// Base path of the serverless functions (Vercel functions in /api)
const API = '/api';

/** Price: Indian grouping, 2 decimals, '—' when missing */
const fp = (n) =>
  n == null || isNaN(n)
    ? '—'
    : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Volume: Cr / L / K suffixes, '—' when missing */
const fv = (v) =>
  !v ? '—'
    : v >= 1e7 ? (v / 1e7).toFixed(2) + ' Cr'
    : v >= 1e5 ? (v / 1e5).toFixed(2) + ' L'
    : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K'
    : v;

/** "Updated hh:mm:ss" label for the headers */
const updatedLabel = () =>
  'Updated ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Strips Yahoo's ".NS" suffix for display */
const ticker = (sym) => sym.replace('.NS', '');

/** NSE cash session in IST: Mon–Fri, 09:15–15:30 */
function isNseLive() {
  const ist = new Date(Date.now() + (new Date().getTimezoneOffset() + 330) * 60000);
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return day >= 1 && day <= 5 && mins >= 555 && mins <= 930;
}

/** Table sort comparator (numbers or strings), dir = -1 desc / 1 asc */
function sortRows(rows, col, dir) {
  return [...rows].sort((a, b) => {
    const av = a[col] ?? 0, bv = b[col] ?? 0;
    return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir;
  });
}
