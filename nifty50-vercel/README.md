# Nifty 50 Tracker: React version for Vercel

A React app with no build step and no installs. Data comes from Yahoo Finance through Vercel serverless functions.

## Pages
- **index.html**: Nifty 50 dashboard (heatmap, movers, table, search, stock cards with charts)
- **impact.html**: index impact calculator (sector drill-down, what-if simulator, global cues)
- **indices.html**: 22 Indian indices; sectoral indices, Nifty 50 and Sensex show gainers & losers
- **news.html**: CNBC-TV18 live blog

## Structure
```
api/                        Vercel functions (thin wrappers): nifty, candles, indices, index-movers, liveblog
lib/fn/                     the function logic, one file per endpoint
lib/vercelAdapter.js        runs each handler inside Vercel and sets CDN caching
lib/indexData.js            index list + constituent lists (update after NSE/BSE rebalancing)
public/                     pages, css, React components (js/shared, dashboard, impact, indices, news)
vercel.json, package.json
```

## Deploy
Upload the folder's contents to your GitHub repo (keep the same folder your Vercel project's
Root Directory points to). Vercel redeploys on every commit. Framework preset: Other, no build command.

## Run locally
`npm i -g vercel`, then `vercel dev`, then open http://localhost:3000.

## Keeping it current
- **Constituent lists** (lib/indexData.js): NSE/BSE rebalance every 6 months. NSE's official
  lists are at archives.nseindia.com/content/indices/ind_<index>list.csv
- **Nifty weights** (lib/fn/nifty.js and public/js/shared/weights.jsx): update from NSE's monthly factsheet
