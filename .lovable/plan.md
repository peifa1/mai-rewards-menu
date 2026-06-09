# Wire up the images you uploaded to public/images

## Goal
Make the page render with the files now sitting in `public/images/`, without renaming any files.

## What I'll change

**Only `src/routes/index.tsx`** — replace the 8 `.asset.json` imports and their usages with URL-encoded paths to your `public/images/` files.

```ts
// Remove these 8 imports (lines 7-14):
import artYokan from "@/assets/art-yokan.jpg.asset.json";
import artSensu from "@/assets/art-sensu.jpg.asset.json";
import artTomo  from "@/assets/art-tomo.jpg.asset.json";
import artOkami from "@/assets/art-okami.jpg.asset.json";
import artDanna from "@/assets/art-danna.jpg.asset.json";
import chibi    from "@/assets/chibi.png.asset.json";
import petal    from "@/assets/petal.png.asset.json";
import thankYou from "@/assets/thankyou.png.asset.json";

// Replace with constants (URL-encoded for spaces):
const chibi    = { url: "/images/Chibi%20art%20thank%20you.png" };
const thankYou = { url: "/images/thank%20%20you!!_text.png" };
const petal    = { url: "/images/petal.png" };

// Art placeholders — rotate the 4 you uploaded across the 5 slots:
const artYokan = { url: "/images/ahri.jpg" };
const artTomo  = { url: "/images/cosplay.jpg" };
const artOkami = { url: "/images/ahri.jpg" };
const artSensu = { url: "/images/ahri-nsfw.jpg" };  // NSFW slot
const artDanna = { url: "/images/cosplay-nsfw.jpg" }; // NSFW slot
```

All the downstream `.url` accesses (`chibi.url`, `petal.url`, `artYokan.url`, etc.) keep working unchanged.

## Cleanup (optional, same change)

Delete the 8 now-unused `.asset.json` files under `src/assets/`. The art-*, chibi, petal, thankyou pointers won't be referenced anymore. Safe — they remain on the CDN if you ever need them back, and revertable from chat history.

## Doesn't touch
Backend, env vars, Vercel config, any other code or styling. Just pointing `<img src>` at the files you already shipped to `public/`.

## After this lands
- Push from Lovable → GitHub auto-syncs → Vercel rebuilds.
- `diablita.xyz` should show all images. If any single image still 404s, it's a filename typo I can fix in seconds by reading the Vercel deploy.

Ready when you switch to build mode.
