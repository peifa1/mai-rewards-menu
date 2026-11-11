// Fill the Hear-me-out cake overlay template (public/hear_me_out_cake.html) with the cake image and the
// pictures (in draft order). The template holds a single `/*__CONFIG__*/const DATA = {...};/*__END_CONFIG__*/` block.

export type HearMeOutPic = { id: string; src: string }; // src: a site path ("/hear-me-out/01.webp") or a data: URL
export type HearMeOutConfig = { cake: string; pics: HearMeOutPic[] };

export const HMO_DEFAULT_CAKE = "/hear-me-out/cake.webp";
export const HMO_DEFAULT_CONFIG: HearMeOutConfig = {
  cake: HMO_DEFAULT_CAKE,
  pics: Array.from({ length: 19 }, (_, k) => {
    const n = String(k + 1).padStart(2, "0");
    return { id: "d" + n, src: `/hear-me-out/${n}.webp` };
  }),
};
export const HMO_TUTORIAL_VIDEO = "/videos/hear-me-out-tutorial.mp4";

export const newHmoPicId = () => `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function normalizeHearMeOutConfig(raw: Partial<HearMeOutConfig> | null | undefined): HearMeOutConfig {
  const ok = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  const seen = new Set<string>();
  const pics = (Array.isArray(raw?.pics) ? raw!.pics : HMO_DEFAULT_CONFIG.pics)
    .filter((p) => p && ok(p.src))
    .map((p) => {
      let id = ok(p.id) ? p.id : newHmoPicId();
      while (seen.has(id)) id = newHmoPicId();
      seen.add(id);
      return { id, src: p.src };
    });
  return { cake: ok(raw?.cake) ? raw!.cake : HMO_DEFAULT_CAKE, pics };
}

// Turn a site path into a data: URL so the downloaded file works on its own in OBS.
async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Couldn't load ${src}: ${res.status}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function fill(template: string, data: HearMeOutConfig): string {
  const BS = String.fromCharCode(92);
  const json = JSON.stringify(data).split("<").join(BS + "u003c");
  return template.replace(/\/\*__CONFIG__\*\/[\s\S]*?\/\*__END_CONFIG__\*\//, () => `/*__CONFIG__*/const DATA = ${json};/*__END_CONFIG__*/`);
}

// Preview (inside a blob: iframe): site paths must be absolute.
export function buildHearMeOutPreviewHtml(template: string, cfg: HearMeOutConfig, origin: string): string {
  const abs = (s: string) => (s.startsWith("/") ? origin + s : s);
  return fill(template, { cake: abs(cfg.cake), pics: cfg.pics.map((p) => ({ id: p.id, src: abs(p.src) })) });
}

// Download: every image embedded, so it's one self-contained file.
export async function buildHearMeOutDownloadHtml(template: string, cfg: HearMeOutConfig): Promise<string> {
  const [cake, ...pics] = await Promise.all([toDataUrl(cfg.cake), ...cfg.pics.map((p) => toDataUrl(p.src))]);
  return fill(template, { cake, pics: cfg.pics.map((p, k) => ({ id: p.id, src: pics[k] })) });
}

let cached: string | null = null;
let pending: Promise<string> | null = null;
export function loadHearMeOutTemplate(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetch("/hear_me_out_cake.html")
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load the cake template: ${res.status}`);
      return (cached = await res.text());
    })
    .finally(() => { pending = null; });
  return pending;
}

// Shrink an uploaded picture so the builder's saved list stays small (keeps transparency).
export function shrinkImageFile(file: File, max = 620): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * s);
      c.height = Math.round(im.naturalHeight * s);
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/webp", 0.82));
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Couldn't read ${file.name}`)); };
    im.src = url;
  });
}
