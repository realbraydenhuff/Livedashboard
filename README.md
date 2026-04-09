# Polymarket Live Copy Dashboard

A static dashboard you can deploy online in a few minutes. It auto-refreshes from Polymarket's public Gamma and Data APIs, so you do **not** need a backend just to get the dashboard online.

## What it does

- tracks watched wallets from the public Data API
- tracks watched markets by slug from the public Gamma API
- auto-refreshes every few seconds
- generates simple in-browser alerts for PnL spikes and watched-market moves
- works on Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host

## Files

- `index.html` — dashboard UI
- `styles.css` — styling
- `config.js` — your wallet list, market slugs, thresholds, refresh interval
- `app.js` — live polling logic
- `vercel.json` — static deployment config for Vercel
- `netlify.toml` — static deployment config for Netlify

## Fastest setup

### Option 1: Vercel

1. Create a new GitHub repo.
2. Upload all files from this folder.
3. In Vercel, import the repo.
4. Deploy with the default settings.

### Option 2: Netlify

1. Zip this folder.
2. Drag the folder or zip into Netlify Drop.
3. The site will publish as a static dashboard.

### Option 3: Cloudflare Pages

1. Push this folder to GitHub.
2. Create a new Pages project.
3. Choose the repo and deploy as a static site.

## Make it yours

Edit `config.js`:

- replace wallet addresses with the wallets you want to follow
- replace market slugs with the markets you want on your watchlist
- set `refreshMs`
- adjust alert thresholds

## Important notes

- This version is **watch-only**. It does not place trades.
- It depends on Polymarket public endpoints remaining accessible from the browser.
- If a specific field changes on Polymarket's side, you may need a small update in `app.js`.
- For more reliable production use, the next step would be a tiny backend proxy plus persistent storage for baselines and alert history.

## Production-ready next upgrades

If you want a stronger hosted version, add:

- Supabase or Firebase for persistent alert history
- a tiny serverless proxy for normalized API responses
- Discord or Telegram webhook alerts
- login-protected per-user watchlists
