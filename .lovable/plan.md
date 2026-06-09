## Goal
Move the frontend to a free Vercel `.vercel.app` subdomain while keeping the backend (database / persistence) on Lovable Cloud. Then fix the critical security issue so randoms can't overwrite your data.

---

## Part 1 — Deploy frontend to Vercel (free)

You do this yourself in the browser — no code changes needed. The project is already configured to talk to Lovable Cloud from anywhere.

### Step-by-step

1. **Get the code onto GitHub**
   - In Lovable: top-right → **GitHub** → **Connect to GitHub** → authorize → **Create Repository**.
   - This pushes your project to a new GitHub repo (free, private by default).

2. **Create a Vercel account**
   - Go to https://vercel.com/signup → **Continue with GitHub** (easiest).
   - Free "Hobby" plan — no credit card required.

3. **Import the project**
   - Vercel dashboard → **Add New** → **Project** → pick the GitHub repo Lovable just created → **Import**.
   - Framework preset: Vercel should auto-detect **Vite**. Leave build command and output dir as defaults.

4. **Add environment variables** (critical — without these the app can't reach the backend)

   In the Vercel import screen, expand **Environment Variables** and add:

   ```
   VITE_SUPABASE_URL              = https://aqoxkmxkbsvofhgnszjr.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY  = <the anon key from your current .env>
   VITE_SUPABASE_PROJECT_ID       = aqoxkmxkbsvofhgnszjr
   ```

   I'll print the exact values from your `.env` once we're in build mode so you can copy-paste.

5. **Deploy** — click **Deploy**. ~1 minute later you get a free URL like `your-project-name.vercel.app`.

6. **Auto-redeploys**: every time Lovable pushes to GitHub (which happens on every edit), Vercel rebuilds automatically. Nothing else to wire up.

### What stays the same
- Backend (database, persistence) keeps running on Lovable Cloud at no extra setup cost.
- Your data is preserved — same database, same rows.
- You can keep editing in Lovable; changes flow GitHub → Vercel automatically.

### Caveats
- TanStack Start server functions (`createServerFn`) run on Vercel's serverless runtime — they'll work, but they call back to Lovable Cloud for data. Fine for your 1–3 uses/month.
- The Lovable preview URL still works too; you'll just also have the Vercel one.

---

## Part 2 — Fix the critical security issue (after Vercel is live)

The scanner flagged that **anyone on the internet can overwrite your `app_state` table**. For a single-user personal site, the simplest fix is an **editor passphrase**:

- You set a secret passphrase (stored as a server secret, never in the frontend).
- The editor UI asks for it once; it's saved in your browser.
- All writes (image upload, description edits, date edits) go through a server function that checks the passphrase before touching the database.
- Public visitors can still **read** the showcase (no passphrase needed).

This kills findings #1 and #3 (the `always-true` write policies). Finding #2 (Realtime) doesn't apply — we don't use Realtime.

I'll detail the exact implementation plan in a second pass once Vercel is up and running, so we don't conflate the two changes.

---

## What I'll do when you approve and switch to build mode

For **Part 1**, there are basically no code changes — I'll just:
1. Read your `.env` and give you the exact values to paste into Vercel.
2. Confirm `package.json` build script is Vercel-compatible (it already is).
3. Walk you through the GitHub → Vercel flow above as you click through it.

Want me to proceed?
