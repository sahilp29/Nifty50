# Nifty 50 dashboard — Vercel version

This folder is adapted from the supplied Netlify project for Vercel. The frontend now calls `/api/nifty`, served by `api/nifty.js`; the original Yahoo Finance fetching and impact calculations are preserved.

## Deploy
1. Extract this ZIP.
2. Upload the folder to a new GitHub repository (keep `api/`, `public/`, `vercel.json`, and `package.json` at the repository root).
3. Import the repository at https://vercel.com/new.
4. Use the default settings; no build command is required.
5. After deployment, open `/api/nifty` on the deployed domain to test the serverless endpoint, then open the homepage.

## Notes
- The original `netlify/` directory and `netlify.toml` are retained as reference only; Vercel uses `api/nifty.js` and `vercel.json`.
- Market data comes from Yahoo Finance endpoints and can be delayed, rate-limited, or change without notice.
- This is a static frontend plus a serverless API; no API keys are configured in the project.
