# Fix the Vercel 404 + finish env var setup

## Why the 404 happens

Your project uses **TanStack Start**, which is an SSR framework — not a plain static Vite site. The current `vite.config.ts` builds the server bundle for **Cloudflare Workers** (the default in `@lovable.dev/vite-tanstack-config`).

When Vercel runs the build, it gets a Cloudflare-shaped output and doesn't know how to serve it → every URL returns **404 NOT_FOUND**. That's exactly the screenshot you sent.

I confirmed your app code does **not** actually use any server functions — all data goes browser → Lovable Cloud directly. That's good news: switching the build target is safe and won't break anything.

## Plan

### Step 1 — Change the build target to Vercel (1 file edit)

Update `vite.config.ts` to tell the underlying `nitro` builder to output Vercel's serverless format instead of Cloudflare's:

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
});
```

This produces a `.vercel/output/` directory that Vercel auto-detects and serves correctly — SSR pages, static assets, and routing all work.

### Step 2 — You add the env vars in Vercel (UI, no code)

In Vercel left sidebar → **Environment Variables** → add three, all environments checked:

```
VITE_SUPABASE_URL              = https://aqoxkmxkbsvofhgnszjr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  = <the anon key from your .env>
VITE_SUPABASE_PROJECT_ID       = aqoxkmxkbsvofhgnszjr
```

(I'll paste the full key value in chat once we switch to build mode.)

### Step 3 — Trigger a fresh redeploy

Vercel auto-deploys when Lovable pushes the `vite.config.ts` change to GitHub. But to be safe and pick up the new env vars:
- **Deployments** tab → latest deployment → **⋯** menu → **Redeploy** → **uncheck** "Use existing build cache" → **Redeploy**.

### Step 4 — Verify

- Open `mai-rewards-menu.vercel.app` and `diablita.xyz` — both should load the showcase.
- If anything fails, open DevTools (F12) → Console, and paste me any red error.

## What this changes
- One file: `vite.config.ts` (adds 3 lines)
- That's it. No data, no routes, no UI touched.

## What this does NOT do
- Does not affect Lovable preview (Lovable still builds with its own config).
- Does not change your Lovable Cloud backend.
- Does not fix the **app_state public-write security issue** — that's still pending. After Vercel is working, we'll do the editor passphrase fix (Part 2 from the earlier plan).

## Side note: your Vercel account
The "Action Required: billing address missing" banner in your screenshot is unrelated to deployment — Vercel just wants you to complete your profile because you bought a domain. Hobby plan stays free; complete it when convenient.

Ready to apply? Approve the plan and I'll make the `vite.config.ts` edit + give you the exact env var values to paste.
