'use server';
import { createServerFn } from "@tanstack/react-start";

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
  audioPath: string;
  imagePath: string;
  durationSeconds: number;
};

export const dispatchRenderJob = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as DispatchInput)
  .handler(async ({ data }) => {
    try {
      const PAT   = process.env.GITHUB_PAT;
      const OWNER = process.env.GITHUB_OWNER ?? "peifa1";
      const REPO  = process.env.GITHUB_REPO  ?? "mai-rewards-menu";
      if (!PAT) return { ok: false as const, error: "Missing GITHUB_PAT env var" };

      const host = process.env.APP_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
      if (!host) return { ok: false as const, error: "Missing APP_URL env var" };
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
        return { ok: false as const, error: `GitHub dispatch failed (${resp.status}): ${body.slice(0, 200)}` };
      }

      return { ok: true as const, error: null };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

export const checkRenderOutput = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { jobId: string })
  .handler(async ({ data }) => {
    try {
      const { list } = await import("@vercel/blob");

      const { blobs: errBlobs } = await list({ prefix: `output/${data.jobId}.error` });
      if (errBlobs.length > 0) return { status: "error" as const, downloadUrl: "" };

      const { blobs: outBlobs } = await list({ prefix: `output/${data.jobId}.mp4` });
      if (outBlobs.length > 0) return { status: "done" as const, downloadUrl: outBlobs[0].downloadUrl };

      return { status: "pending" as const, downloadUrl: "" };
    } catch {
      return { status: "pending" as const, downloadUrl: "" };
    }
  });

export const cleanupRenderFiles = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { urls: string[] })
  .handler(async ({ data }) => {
    try {
      const { del } = await import("@vercel/blob");
      if (data.urls.length > 0) await del(data.urls);
    } catch { /* best-effort */ }
    return { ok: true };
  });
