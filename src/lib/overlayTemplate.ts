import JSZip from "jszip";
import zipAsset from "@/assets/iomaya_overlay.zip.asset.json";

let cached: string | null = null;
let pending: Promise<string> | null = null;

export async function loadOverlayTemplate(): Promise<string> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    const res = await fetch(zipAsset.url);
    if (!res.ok) throw new Error(`Failed to load overlay template: ${res.status}`);
    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    // Find the html/txt file inside the archive
    const fileName = Object.keys(zip.files).find((n) => !zip.files[n].dir) ?? "iomaya_overlay.txt";
    const html = await zip.file(fileName)!.async("string");
    cached = html;
    return html;
  })();
  return pending;
}
