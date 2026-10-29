// Vercel function: /api/nifty  (logic lives in lib/fn/nifty.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/nifty.js").handler);
