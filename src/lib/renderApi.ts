'use server';
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// Composition ID map: style key → Remotion composition name
const COMPOSITION: Record<string, string> = {
  waveform: "Waveform",
  nowplaying: "NowPlaying",
  soundorb: "SoundOrb",
};

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

// ── Upload: returns an upload URL so the browser can PUT the file ──────────
// For private buckets the browser still uploads with the anon key — this
// just validates that the bucket exists and creates signed upload URLs.
// (Supabase anon key can upload if INSERT policy is granted on the bucket.)
// We keep this simple: browser uses anon key directly.

export type DispatchInput = {
  jobId: string;
  style: string;
  config: {
    title: string; eyebrow: string; genre: string; badge: string;
    minutes: string; asmrLabel: string; cardLabel: string; timeStart: string;
  };
  audioPath: string;
  imagePath: string;
  durationSeconds: number;
};

export const dispatchRenderJob = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as DispatchInput)
  .handler(async ({ data }) => {
    const supabase = supabaseAdmin();

    // Create 2-hour signed URLs for GitHub Actions to download audio/image
    const audioSigned = await supabase.storage
      .from("render-jobs")
      .createSignedUrl(data.audioPath, 7200);
    if (audioSigned.error) throw new Error(`Sign audio: ${audioSigned.error.message}`);

    let imageSignedUrl = "";
    if (data.imagePath) {
      const imgSigned = await supabase.storage
        .from("render-jobs")
        .createSignedUrl(data.imagePath, 7200);
      if (!imgSigned.error) imageSignedUrl = imgSigned.data.signedUrl;
    }

    const PAT   = process.env.GITHUB_PAT!;
    const OWNER = process.env.GITHUB_OWNER ?? "peifa1";
    const REPO  = process.env.GITHUB_REPO  ?? "mai-rewards-menu";
    if (!PAT) throw new Error("Missing GITHUB_PAT server env var");

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
            job_id: data.jobId,
            style: COMPOSITION[data.style] ?? "Waveform",
            config_json: JSON.stringify(data.config),
            audio_url: audioSigned.data.signedUrl,
            image_url: imageSignedUrl,
            duration_seconds: String(Math.ceil(data.durationSeconds)),
          },
        }),
      },
    );

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`GitHub dispatch failed (${resp.status}): ${body}`);
    }

    return { ok: true };
  });

export const checkRenderOutput = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { jobId: string })
  .handler(async ({ data }) => {
    const supabase = supabaseAdmin();

    // Check if error file exists
    const { data: errList } = await supabase.storage
      .from("render-jobs")
      .list("output", { search: `${data.jobId}.error` });
    if (errList && errList.length > 0) {
      return { status: "error" as const, downloadUrl: "" };
    }

    // Check if output MP4 exists
    const { data: outList } = await supabase.storage
      .from("render-jobs")
      .list("output", { search: `${data.jobId}.mp4` });
    if (outList && outList.length > 0) {
      const signed = await supabase.storage
        .from("render-jobs")
        .createSignedUrl(`output/${data.jobId}.mp4`, 3600);
      if (signed.data) return { status: "done" as const, downloadUrl: signed.data.signedUrl };
    }

    return { status: "pending" as const, downloadUrl: "" };
  });

export const cleanupRenderFiles = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { paths: string[] })
  .handler(async ({ data }) => {
    const supabase = supabaseAdmin();
    await supabase.storage.from("render-jobs").remove(data.paths);
    return { ok: true };
  });
