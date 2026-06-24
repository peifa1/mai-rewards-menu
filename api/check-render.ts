import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const jobId = req.query.jobId as string | undefined;
  if (!jobId) return res.status(400).json({ error: "Missing jobId" });

  const { blobs: errBlobs } = await list({ prefix: `output/${jobId}.error` });
  if (errBlobs.length > 0) return res.json({ status: "error", downloadUrl: "" });

  const { blobs: outBlobs } = await list({ prefix: `output/${jobId}.mp4` });
  if (outBlobs.length > 0) return res.json({ status: "done", downloadUrl: outBlobs[0].downloadUrl });

  return res.json({ status: "pending", downloadUrl: "" });
}
