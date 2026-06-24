import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Token endpoint for Vercel Blob client uploads.
// Called automatically by @vercel/blob/client's upload() in the browser.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body as HandleUploadBody;

  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host  = req.headers["host"] as string;
  const url   = `${proto}://${host}${req.url}`;

  // Flatten headers: Node gives string | string[] | undefined, Web Headers needs string
  const flatHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v !== undefined) flatHeaders[k] = Array.isArray(v) ? v.join(", ") : v;
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: new Request(url, { headers: new Headers(flatHeaders) }),
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac",
          "audio/x-m4a", "audio/flac", "audio/webm",
          "video/x-matroska", "video/webm", "video/mp4",
          "image/webp", "image/jpeg", "image/png",
        ],
      }),
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(jsonResponse);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
}
