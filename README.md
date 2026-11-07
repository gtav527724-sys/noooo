# 🌊 AQUABEAT v12.0 — Unlimited God-Mode Music

A **zero-API-key** music app: **YouTube Direct** (Piped / Invidious rotation +
official YouTube IFrame playback) and **Studio 320kbps** (JioSaavn mirrors).
Unlimited line-by-line YouTube results with infinite scroll, a dual-engine
full-song player, a Web-Audio AI Sound Lab, a local library, and **2000
individually selectable features** across **20 watery-glass themes**.

> No API keys. No `.env`. No quota errors. Just deploy.

---

## 1) Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## 2) Upload to GitHub

### Option A — GitHub website (easiest, no terminal)
1. Go to https://github.com/new and create a new repository (e.g. `aquabeat`).
   Keep it **Public** or **Private** (your choice). Do **not** add a README/gitignore.
2. On the new empty repo page click **“uploading an existing file”**.
3. Open this `aquabeat-v12` folder on your computer, select **all files and
   folders inside it** (including `src`, `scripts`, `public`, `package.json`,
   `package-lock.json`, the config files, `.gitignore`, etc.) and drag them into
   the GitHub upload area.
   > Tip: upload the *contents* of the folder, not the folder itself, so that
   > `package.json` sits at the repository root.
4. Click **Commit changes**.

### Option B — Git command line
```bash
cd aquabeat-v12
git init
git add .
git commit -m "AQUABEAT v12.0 — initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

> `node_modules` and `.next` are intentionally **not** included — they are
> ignored by `.gitignore` and recreated automatically by `npm install`.

## 3) Deploy on Vercel (recommended for Next.js)

1. Go to https://vercel.com/new and sign in with GitHub.
2. Click **Import** next to your `aquabeat` repository.
3. Vercel auto-detects **Next.js**. Leave the defaults:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output: handled automatically
   - **Environment Variables: none needed** ✅
4. Click **Deploy**. In ~1 minute you get a live URL like
   `https://your-app.vercel.app`.

Every future `git push` to `main` redeploys automatically.

### Deploy on Netlify (alternative)
1. https://app.netlify.com → **Add new site → Import an existing project**.
2. Pick the GitHub repo. Build command `npm run build`, publish directory `.next`.
3. Deploy. (Vercel is smoother for Next.js, but Netlify works too.)

## 4) Build / start manually (any Node host)

```bash
npm install
npm run build
npm start          # serves on 0.0.0.0:3000
```

---

## How it stays zero-key & resilient
- **Search / trending / latest**: Piped (`/search`, `/nextpage/search` token
  pagination) and Invidious (`/api/v1/search?page=`) public instances, rotated
  with silent fallback. No YouTube Data API, no quota.
- **Playback**: tries Piped audio streams first, then falls back to the official
  YouTube IFrame Player (full songs, no key). JioSaavn provides direct 320kbps
  studio audio.
- **Studio 320kbps**: JioSaavn mirrors, `limit` pagination (20 → 40 → 60 …).
- Public mirrors change over time; the app rotates several and fails silently,
  so a dead mirror never breaks the UI.

## Project layout
All app logic lives in **`src/app/page.tsx`** (single master script, ~1650 lines).
Support files: `package.json`, `next.config.js`, `src/app/layout.tsx`,
`src/app/globals.css`, plus the Tailwind/PostCSS/TS configs Next.js requires.
`scripts/bundle.mjs` regenerates `public/aquabeat-v12-source.json` (used by the
in-app **Download Source Code** button) automatically before every `dev`/`build`.

## Tech stack
Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS 3 ·
Framer Motion · lucide-react.

## Note
This is a demo / educational project. Respect the terms of service of the
upstream services and copyright law in your jurisdiction. Streams come from
third-party public mirrors and may be unavailable at times.
