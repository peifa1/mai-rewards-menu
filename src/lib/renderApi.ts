'use server';
import { createServerFn } from "@tanstack/react-start";
import { list, del } from "@vercel/blob";

const COMPOSITION: Record<string, string> = {
  waveform: "Waveform",
  nowplaying: "NowPlaying",
  soundorb: "SoundOrb",
};

export type DispatchInput = {
  jobId: string;
  style: string;
  config: {
    title: string; eyebrow: string; genre: string; badge: string;
    minutes: string; asmrLabel: string; cardLabel: string; timeStart: string;
  };
  audioPath: string;  // Vercel Blob public URL
  imagePath: string;  // Vercel Blob public URL (or empty)
  durationSeconds: number;
};

export const dispatchRenderJob = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as DispatchInput)
  .handler(async ({ data }) => {
    const PAT   = process.env.GITHUB_PAT!;
    const OWNER = process.env.GITHUB_OWNER ?? "peifa1";
    const REPO  = process.env.GITHUB_REPO  ?? "mai-rewards-menu";
    if (!PAT) throw new Error("Missing GITHUB_PAT server env var");

    const host = process.env.APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (!host) throw new Error("Missing APP_URL env var");
    const callbackUrl = `${host}/api/render-complete`;

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
            // Blob public URLs — GitHub Actions downloads them directly
            audio_url: data.audioPath,
            image_url: data.imagePath,
            duration_seconds: String(Math.ceil(data.durationSeconds)),
            callback_url: callbackUrl,
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
    const { blobs: errBlobs } = await list({ prefix: `output/${data.jobId}.error` });
    if (errBlobs.length > 0) {
      return { status: "error" as const, downloadUrl: "" };
    }

    const { blobs: outBlobs } = await list({ prefix: `output/${data.jobId}.mp4` });
    if (outBlobs.length > 0) {
      return { status: "done" as const, downloadUrl: outBlobs[0].downloadUrl };
    }

    return { status: "pending" as const, downloadUrl: "" };
  });

export const cleanupRenderFiles = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { urls: string[] })
  .handler(async ({ data }) => {
    if (data.urls.length > 0) await del(data.urls);
    return { ok: true };
  });
