// Vercel function: /api/candles  (logic lives in lib/fn/candles.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/candles.js").handler);
