import { supabase } from "@/integrations/supabase/client";

// Composition ID map: style key → Remotion composition name
const COMPOSITION: Record<string, string> = {
  waveform: "Waveform",
  nowplaying: "NowPlaying",
  soundorb: "SoundOrb",
};

export type RenderConfig = {
  title: string; eyebrow: string; genre: string; badge: string;
  minutes: string; asmrLabel: string; cardLabel: string; timeStart: string;
};

export async function uploadToStorage(
  path: string,
  file: File | Blob,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from("render-jobs")
    .upload(path, file, { contentType, upsert: false });
  if (error) throw new Error(error.message);
}

export function publicUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/render-jobs/${path}`;
}

export async function dispatchRender(params: {
  jobId: string;
  style: string;
  config: RenderConfig;
  audioPublicUrl: string;
  imagePublicUrl: string;
  durationSeconds: number;
}): Promise<void> {
  const PAT   = import.meta.env.VITE_GITHUB_PAT   as string;
  const OWNER = import.meta.env.VITE_GITHUB_OWNER  as string;
  const REPO  = import.meta.env.VITE_GITHUB_REPO   as string;

  if (!PAT) throw new Error("VITE_GITHUB_PAT is not set — add it in Vercel environment variables");

  const composition = COMPOSITION[params.style] ?? "Waveform";

  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/render-teaser.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          job_id: params.jobId,
          style: composition,
          config_json: JSON.stringify(params.config),
          audio_url: params.audioPublicUrl,
          image_url: params.imagePublicUrl,
          duration_seconds: String(Math.ceil(params.durationSeconds)),
        },
      }),
    },
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GitHub dispatch failed (${resp.status}): ${body}`);
  }
}

export async function cleanupFiles(paths: string[]): Promise<void> {
  await supabase.storage.from("render-jobs").remove(paths);
}
