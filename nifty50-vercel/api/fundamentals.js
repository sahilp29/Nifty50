// Vercel function: /api/fundamentals  (logic lives in lib/fn/fundamentals.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/fundamentals.js").handler);
