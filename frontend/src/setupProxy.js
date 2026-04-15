const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Only used when REACT_APP_API_URL is empty: browser calls /specs, /api, … on port 3000 and
 * webpack-dev-server forwards to FastAPI. One `app.use(prefix, …)` per path is the most reliable
 * pattern with react-scripts (avoids subtle issues with multi-context HPM).
 */
const BACKEND_PATH_PREFIXES = [
  "/api",
  "/specs",
  "/ai",
  "/runtime",
  "/analytics",
  "/auth",
  "/ontology",
  "/telemetry",
];

module.exports = function setupProxy(app) {
  const target = process.env.REACT_APP_PROXY_TARGET || "http://127.0.0.1:8000";
  const opts = { target, changeOrigin: true };
  BACKEND_PATH_PREFIXES.forEach((prefix) => {
    app.use(prefix, createProxyMiddleware(opts));
  });
};
