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
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on server");
  return createClient(url, key);
}

export type TriggerRenderInput = {
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

export const triggerRender = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw as TriggerRenderInput)
  .handler(async ({ data }) => {
    const { jobId, style, config, audioPath, imagePath, durationSeconds } = data;
    const supabase = supabaseAdmin();

    // Create 2-hour signed URLs so GitHub Actions can fetch them
    const audioSignedRes = await supabase.storage
      .from("render-jobs")
      .createSignedUrl(audioPath, 7200);
    if (audioSignedRes.error) throw new Error(`Audio sign failed: ${audioSignedRes.error.message}`);

    let imageSignedUrl = "";
    if (imagePath) {
      const imgRes = await supabase.storage.from("render-jobs").createSignedUrl(imagePath, 7200);
      if (!imgRes.error) imageSignedUrl = imgRes.data.signedUrl;
    }

    const GITHUB_PAT = process.env.GITHUB_PAT;
    const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "peifa1";
    const GITHUB_REPO = process.env.GITHUB_REPO ?? "mai-rewards-menu";

    if (!GITHUB_PAT) throw new Error("Missing GITHUB_PAT server env var");

    const composition = COMPOSITION[style] ?? "Waveform";

    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/render-teaser.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            job_id: jobId,
            style: composition,
            config_json: JSON.stringify(config),
            audio_url: audioSignedRes.data.signedUrl,
            image_url: imageSignedUrl,
            duration_seconds: String(Math.ceil(durationSeconds)),
          },
        }),
      },
    );

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`GitHub dispatch failed ${resp.status}: ${body}`);
    }

    return { jobId };
  });

export type PollRenderInput = { jobId: string };
export type PollRenderResult =
  | { status: "pending" }
  | { status: "done"; downloadUrl: string }
  | { status: "error"; message: string };

export const pollRender = createServerFn({ method: "GET" })
  .validator((raw: unknown) => raw as PollRenderInput)
  .handler(async ({ data }): Promise<PollRenderResult> => {
    const { jobId } = data;
    const supabase = supabaseAdmin();

    // Check for error file first
    const errCheck = await supabase.storage
      .from("render-jobs")
      .createSignedUrl(`output/${jobId}.error`, 10);
    if (!errCheck.error) {
      // Error file exists — read its content
      const errResp = await fetch(errCheck.data.signedUrl);
      const msg = await errResp.text().catch(() => "Render failed");
      return { status: "error", message: msg };
    }

    // Check for output file
    const outCheck = await supabase.storage
      .from("render-jobs")
      .createSignedUrl(`output/${jobId}.mp4`, 3600);
    if (!outCheck.error) {
      return { status: "done", downloadUrl: outCheck.data.signedUrl };
    }

    return { status: "pending" };
  });

export const cleanupRender = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw as { jobId: string; audioPath: string; imagePath: string })
  .handler(async ({ data }) => {
    const { jobId, audioPath, imagePath } = data;
    const supabase = supabaseAdmin();
    const toDelete: string[] = [
      `output/${jobId}.mp4`,
      `output/${jobId}.error`,
      audioPath,
    ];
    if (imagePath) toDelete.push(imagePath);
    await supabase.storage.from("render-jobs").remove(toDelete);
    return { ok: true };
  });
