// Vercel function: /api/events  (logic lives in lib/fn/events.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/events.js").handler);
