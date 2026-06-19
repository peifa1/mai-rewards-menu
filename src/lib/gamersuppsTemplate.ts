// Loads the self-contained Gamersupps card animation (single image + spinning
// sakura petals). Served from /public so it ships with any deployment.

let cached: string | null = null;
let pending: Promise<string> | null = null;

export async function loadGamersuppsTemplate(): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    const res = await fetch("/gs_card.html");
    if (!res.ok) throw new Error(`Failed to load Gamersupps template: ${res.status}`);
    const html = await res.text();
    cached = html;
    return html;
  })();
  return pending;
}
