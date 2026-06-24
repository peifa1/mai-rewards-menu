import type { VercelRequest, VercelResponse } from "@vercel/node";
import { del } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { urls } = req.body as { urls?: string[] };
  if (urls?.length) await del(urls);
  return res.json({ ok: true });
}
