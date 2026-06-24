import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Token endpoint for Vercel Blob client-side uploads.
// The browser calls upload() from @vercel/blob/client, which hits this route
// to get a short-lived upload token, then uploads the file directly to Vercel CDN.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = await new Promise<HandleUploadBody>((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
    req.on("end", () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    req.on("error", reject);
  });

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req as unknown as Request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ["audio/*", "image/*", "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "image/webp", "image/jpeg", "image/png"],
        tokenPayload: pathname,
      }),
      onUploadCompleted: async () => {
        // Nothing to do — the URL is returned to the browser directly
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
}
