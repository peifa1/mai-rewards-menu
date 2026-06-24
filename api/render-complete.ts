import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Vercel Serverless Function — receives the rendered MP4 (or error string)
// from GitHub Actions and writes it into Supabase Storage.
// GitHub Actions authenticates with X-Render-Secret (a shared secret stored
// in both Vercel env vars and GitHub Actions secrets).

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const secret = req.headers["x-render-secret"];
  if (!secret || secret !== process.env.RENDER_CALLBACK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const jobId = req.headers["x-job-id"] as string | undefined;
  if (!jobId) return res.status(400).send("Missing x-job-id");

  const contentType = (req.headers["content-type"] ?? "") as string;

  // Read raw body into a Buffer
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (contentType.includes("video/mp4")) {
    const { error } = await supabase.storage
      .from("render-jobs")
      .upload(`output/${jobId}.mp4`, body, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (error) return res.status(500).send(error.message);
    return res.status(200).send("OK");
  } else {
    // Error notification from GitHub Actions — store as .error so the poller detects it
    const msg = body.toString("utf8") || "Render failed";
    await supabase.storage
      .from("render-jobs")
      .upload(`output/${jobId}.error`, Buffer.from(msg), {
        contentType: "text/plain",
        upsert: true,
      });
    return res.status(200).send("Error recorded");
  }
}

export const config = {
  api: {
    bodyParser: false,    // read raw binary stream
    sizeLimit: "2gb",     // MP4 files can be large
  },
};
