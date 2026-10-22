// Vercel function: /api/index-movers  (logic lives in lib/fn/index-movers.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/index-movers.js").handler);
