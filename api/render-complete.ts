import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const secret = req.headers["x-render-secret"];
  if (!secret || secret !== process.env.RENDER_CALLBACK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const jobId = req.headers["x-job-id"] as string | undefined;
  if (!jobId) return res.status(400).send("Missing x-job-id");

  const contentType = (req.headers["content-type"] ?? "") as string;

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);

  if (contentType.includes("video/mp4")) {
    await put(`output/${jobId}.mp4`, body, {
      access: "public",
      contentType: "video/mp4",
      addRandomSuffix: false,
    });
  } else {
    const msg = body.toString("utf8") || "Render failed";
    await put(`output/${jobId}.error`, msg, {
      access: "public",
      contentType: "text/plain",
      addRandomSuffix: false,
    });
  }

  return res.status(200).send("OK");
}

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "2gb",
  },
};
