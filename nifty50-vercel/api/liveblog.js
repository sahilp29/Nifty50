// Vercel function: /api/liveblog  (logic lives in lib/fn/liveblog.js)
const { toVercel } = require("../lib/vercelAdapter.js");
module.exports = toVercel(require("../lib/fn/liveblog.js").handler);
