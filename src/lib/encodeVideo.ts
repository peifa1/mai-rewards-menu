/**
 * In-browser MP4 video encoder.
 *
 * Pipeline:
 *   1. Decode audio file → AudioBuffer (offline)
 *   2. Analyse audio buffer → per-frame band/amp data (deterministic, matches live preview)
 *   3. Render each frame to an OffscreenCanvas at 1080×1350
 *   4. Encode frames with WebCodecs VideoEncoder (H.264)
 *   5. Encode audio with WebCodecs AudioEncoder (AAC)
 *   6. Mux into MP4 with mp4-muxer
 *   7. Return the MP4 as a Blob
 *
 * The deterministic analysis in step 2 matches useAudioEngine exactly, so the
 * exported video looks identical to the live preview.
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { analyzeAudioBuffer } from "./analyzeAudio";
import { renderCardFrame, loadImageBitmap } from "./renderCardFrame";
import { loadAudioTeaserTemplate } from "./audioTeaserTemplate";
import type { AudioTeaserConfig, TeaserStyle } from "./buildAudioTeaser";

const FPS       = 30;
const VIDEO_W   = 1080;
const VIDEO_H   = 1350;
const VIDEO_BPS = 4_500_000;   // 4.5 Mbps — good quality for 1080×1350
const AUDIO_BPS = 192_000;     // 192 kbps AAC

export type ProgressCallback = (fraction: number, stage: "video" | "audio" | "mux") => void;

// ── Decode a File into an AudioBuffer ────────────────────────────────────────
async function decodeAudio(file: File): Promise<AudioBuffer> {
  const arrayBuf = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuf);
  } finally {
    await ctx.close();
  }
}

// ── Extract the default cover image from a template ──────────────────────────
async function getDefaultCoverDataUrl(style: TeaserStyle): Promise<string> {
  const html = await loadAudioTeaserTemplate(style);
  const m = html.match(/var IMG = '([^']+)'/);
  return m ? m[1] : "";
}

// ── Encode all video frames ───────────────────────────────────────────────────
async function encodeFrames(
  encoder: VideoEncoder,
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  style: TeaserStyle,
  cfg: AudioTeaserConfig,
  coverImageBitmap: ImageBitmap,
  analysis: ReturnType<typeof analyzeAudioBuffer>,
  onProgress: (f: number) => void,
) {
  const { frameCount, fps, bands, amp, duration } = analysis;
  const assets = { coverImage: coverImageBitmap };

  for (let f = 0; f < frameCount; f++) {
    const bandSlice = Array.from(bands.subarray(f * 32, f * 32 + 32));
    renderCardFrame(ctx, style, cfg, assets, {
      bands:    bandSlice,
      amp:      amp[f],
      time:     f / fps,
      duration: duration,
    });

    const tsUs = Math.round((f / fps) * 1_000_000);
    const durUs = Math.round((1 / fps) * 1_000_000);
    const vf = new VideoFrame(canvas, { timestamp: tsUs, duration: durUs });
    encoder.encode(vf, { keyFrame: f % (fps * 2) === 0 });
    vf.close();

    // Yield every 60 frames so the tab stays responsive and GC can run.
    if (f % 60 === 59) {
      await new Promise<void>(r => setTimeout(r, 0));
      onProgress(f);
    }
  }
}

// ── Encode all audio chunks ───────────────────────────────────────────────────
async function encodeAudio(
  encoder: AudioEncoder,
  audioBuffer: AudioBuffer,
  onProgress: () => void,
) {
  const sr = audioBuffer.sampleRate;
  const nCh = Math.min(audioBuffer.numberOfChannels, 2); // cap at stereo
  const chunkSize = 4096;
  const total = audioBuffer.length;

  for (let start = 0; start < total; start += chunkSize) {
    const end = Math.min(start + chunkSize, total);
    const n   = end - start;

    // Build interleaved float32 PCM (required by AudioData format 'f32-interleaved')
    const pcm = new Float32Array(n * nCh);
    for (let ch = 0; ch < nCh; ch++) {
      const src = audioBuffer.getChannelData(ch);
      for (let i = 0; i < n; i++) pcm[i * nCh + ch] = src[start + i];
    }

    const tsUs = Math.round((start / sr) * 1_000_000);
    const ad = new AudioData({
      format:           "f32" as AudioSampleFormat,
      sampleRate:       sr,
      numberOfFrames:   n,
      numberOfChannels: nCh,
      timestamp:        tsUs,
      data:             pcm,
    });
    encoder.encode(ad);
    ad.close();

    if (start % (chunkSize * 20) === 0) {
      await new Promise<void>(r => setTimeout(r, 0));
      onProgress();
    }
  }
}

// ── Main export function ──────────────────────────────────────────────────────
export async function encodeVideoBlob(
  style: TeaserStyle,
  cfg: AudioTeaserConfig,
  audioFile: File,
  onProgress: ProgressCallback,
): Promise<Blob> {
  // 1. Decode audio
  onProgress(0, "video");
  const audioBuffer = await decodeAudio(audioFile);

  // 2. Offline analysis (deterministic, matches the live preview engine)
  const analysis = analyzeAudioBuffer(audioBuffer, FPS);

  // 3. Load cover image (use user-uploaded or template default)
  let imageDataUrl = cfg.image;
  if (!imageDataUrl) imageDataUrl = await getDefaultCoverDataUrl(style);
  const coverBitmap = await loadImageBitmap(imageDataUrl);

  // 4. Set up muxer
  const target = new ArrayBufferTarget();
  const nCh = Math.min(audioBuffer.numberOfChannels, 2);
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: VIDEO_W, height: VIDEO_H },
    audio: { codec: "aac", numberOfChannels: nCh, sampleRate: audioBuffer.sampleRate },
    firstTimestampBehavior: "offset",
    fastStart: "in-memory",
  });

  // 5. Video encoder
  const canvas = new OffscreenCanvas(VIDEO_W, VIDEO_H);
  const ctx    = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? {}),
    error:  e => { throw e; },
  });
  videoEncoder.configure({
    codec:     "avc1.640028",   // H.264 High Profile Level 4.0
    width:     VIDEO_W,
    height:    VIDEO_H,
    bitrate:   VIDEO_BPS,
    framerate: FPS,
    avc:       { format: "avc" },
  });

  // 6. Audio encoder
  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? {}),
    error:  e => { throw e; },
  });
  audioEncoder.configure({
    codec:            "mp4a.40.2",   // AAC-LC
    numberOfChannels: nCh,
    sampleRate:       audioBuffer.sampleRate,
    bitrate:          AUDIO_BPS,
  });

  // 7. Encode video frames
  const { frameCount } = analysis;
  await encodeFrames(
    videoEncoder, canvas, ctx,
    style, cfg, coverBitmap, analysis,
    f => onProgress(f / frameCount, "video"),
  );
  onProgress(1, "video");

  // 8. Encode audio
  await encodeAudio(
    audioEncoder,
    audioBuffer,
    () => onProgress(0.5, "audio"),
  );
  onProgress(1, "audio");

  // 9. Flush encoders and finalise muxer
  onProgress(0, "mux");
  await videoEncoder.flush();
  await audioEncoder.flush();
  videoEncoder.close();
  audioEncoder.close();
  coverBitmap.close();

  muxer.finalize();
  onProgress(1, "mux");

  return new Blob([target.buffer], { type: "video/mp4" });
}

/** Trigger a browser download of the blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
