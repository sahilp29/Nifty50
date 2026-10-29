// Vercel function: /api/impact15  (logic lives in lib/fn/impact15.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/impact15.js").handler);
