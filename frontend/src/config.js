/**
 * Backend base URL (FastAPI). Override with REACT_APP_API_URL.
 *
 * Default is direct http://127.0.0.1:8000 so /specs, /auth, etc. work without relying on the dev proxy.
 * Backend CORS already allows http://localhost:3000 and http://127.0.0.1:3000.
 *
 * Optional: set REACT_APP_API_URL= (empty) to use same-origin URLs + src/setupProxy.js (see .env.example).
 */
const explicit = process.env.REACT_APP_API_URL;
export const API_BASE_URL =
  explicit !== undefined && explicit !== ""
    ? explicit
    : "http://127.0.0.1:8000";
