// Runs a handler written as  handler(event) → { statusCode, headers, body }
// inside a Vercel serverless function (req, res).
// CDN caching: "Netlify-CDN-Cache-Control" style headers become a normal Cache-Control
// with s-maxage, which Vercel's edge honours (and strips before it reaches the browser).
module.exports.toVercel = (handler) => async (req, res) => {
  try {
    const result = await handler({
      httpMethod: req.method,
      queryStringParameters: req.query || {},
      headers: req.headers,
    });
    const headers = { ...(result.headers || {}) };
    const cdn = headers["Netlify-CDN-Cache-Control"];
    if (cdn) {
      delete headers["Netlify-CDN-Cache-Control"];
      headers["Cache-Control"] = cdn;
    }
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    res.status(result.statusCode || 200);
    return result.body ? res.send(result.body) : res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
