'use server';
import { createServerFn } from "@tanstack/react-start";

// NOTE: @vercel/blob cannot be imported here — Nitro bundles as ESM but
// @vercel/blob's transitive dep (@vercel/cli-config) uses require() at module
// load time, which breaks ESM. Blob operations live in api/ instead.

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
              callback_url: `${host}/api/render-complete`,
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
