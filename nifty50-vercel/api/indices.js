// Vercel function: /api/indices  (logic lives in lib/fn/indices.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/indices.js").handler);
