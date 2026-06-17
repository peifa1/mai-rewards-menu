import JSZip from "jszip";

let cached: string | null = null;
let pending: Promise<string> | null = null;

export async function loadOverlayTemplate(): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    // Served from /public so it ships with any deployment (incl. GitHub-synced builds).
    const res = await fetch("/iomaya_overlay.zip");
    if (!res.ok) throw new Error(`Failed to load overlay template: ${res.status}`);
    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const fileName = Object.keys(zip.files).find((n) => !zip.files[n].dir) ?? "iomaya_overlay.txt";
    const html = await zip.file(fileName)!.async("string");
    cached = html;
    return html;
  })();
  return pending;
}
