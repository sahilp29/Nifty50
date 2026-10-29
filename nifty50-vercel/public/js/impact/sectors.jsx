// Colour per sector (the sector of each stock comes from /api/nifty)
const SECTOR_COLORS = {
  'Financials':'#3b82f6','IT':'#8b5cf6','Energy':'#f59e0b','Telecom':'#06b6d4',
  'Auto':'#10b981','FMCG':'#f97316','Retail':'#ec4899','Pharma':'#14b8a6',
  'Infra':'#6366f1','Others':'#94a3b8',
};

const darken = (hex) => hex; // kept from the original (no-op; negative segments are dimmed with a filter)

const signed = (n, d = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(d)}`;
