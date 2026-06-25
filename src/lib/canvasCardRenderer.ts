import type { AudioTeaserConfig } from "./buildAudioTeaser";
import { SAKURA_DATA_URL } from "./sakuraDataUrl";

// Logical draw dimensions (all draw functions use these coordinates)
export const CANVAS_W = 780;
export const CANVAS_H = 976;

// Actual output canvas dimensions — 1080p-wide for X/social quality
// The builder scales the context by (OUT_W/CANVAS_W) before drawing
export const OUT_W = 1080;
export const OUT_H = 1352;

// Persistent smoothing state for the Sound Orb (one recording at a time).
let orbAmpSmooth = 0;

const WF_N = 20;

// Waveform bar level state — per-bar attack/decay smoothing across frames
let wfLevel = new Float32Array(20);

// User-tuned constants (tuned at 60fps in sandbox). The canvas render loop
// now also runs at 60fps + analyser smoothing matches the preview, so the
// sandbox constants apply directly — no frame-rate compensation needed.
const WF_GAIN   = 0.5;
const WF_TILT   = 4;
const WF_ATK    = 0.19;
const WF_DEC    = 0.055;
const WF_SMOOTH = 0.9;
const WF_FLOOR  = 0;
const WF_MAX_H  = 35;

// Sakura PNG — loaded from inline data URL so it works in blob-iframe previews
// and in offscreen canvas recording contexts (no network request needed).
const _sakuraImg = (typeof window !== "undefined")
  ? (() => { const i = new Image(); i.src = SAKURA_DATA_URL; return i; })()
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────

function rrp(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBg(
  ctx: CanvasRenderingContext2D,
  imgEl: HTMLImageElement | null,
  blurPx: number
) {
  const W = CANVAS_W, H = CANVAS_H;
  ctx.save();
  if (imgEl?.complete && imgEl.naturalWidth > 0) {
    ctx.filter = `blur(${blurPx}px) saturate(1.3) brightness(0.45)`;
    const pad = blurPx * 2;
    ctx.drawImage(imgEl, -pad, -pad, W + pad * 2, H + pad * 2);
    ctx.filter = "none";
  } else {
    ctx.fillStyle = "#0c0608";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // Radial vignette
  const vRad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  vRad.addColorStop(0.3, "transparent");
  vRad.addColorStop(1, "rgba(6,2,4,0.55)");
  ctx.fillStyle = vRad;
  ctx.fillRect(0, 0, W, H);

  // Top/bottom linear vignette
  const vLin = ctx.createLinearGradient(0, 0, 0, H);
  vLin.addColorStop(0, "rgba(6,2,4,0.3)");
  vLin.addColorStop(0.25, "transparent");
  vLin.addColorStop(0.75, "transparent");
  vLin.addColorStop(1, "rgba(6,2,4,0.3)");
  ctx.fillStyle = vLin;
  ctx.fillRect(0, 0, W, H);
}

// ── Waveform ──────────────────────────────────────────────────────────────

export function drawWaveformCard(
  ctx: CanvasRenderingContext2D,
  cfg: AudioTeaserConfig,
  imgEl: HTMLImageElement | null,
  freqBuf: Uint8Array,     // raw FFT byte array from AnalyserNode
  sampleRate: number       // AudioContext.sampleRate
) {
  const W = CANVAS_W;
  drawBg(ctx, imgEl, 56);

  // Portrait card — centered in full canvas
  const cW = 476, cH = 666;
  const cX = (W - cW) / 2;
  const cY = (CANVAS_H - cH) / 2;

  ctx.save();
  rrp(ctx, cX, cY, cW, cH, 20);
  ctx.clip();
  if (imgEl?.complete && imgEl.naturalWidth > 0) {
    ctx.drawImage(imgEl, cX, cY, cW, cH);
  } else {
    ctx.fillStyle = "#1a0810";
    ctx.fillRect(cX, cY, cW, cH);
  }
  const veil = ctx.createLinearGradient(0, cY, 0, cY + cH);
  veil.addColorStop(0.4, "rgba(8,3,6,0.05)");
  veil.addColorStop(1, "rgba(8,3,6,0.78)");
  ctx.fillStyle = veil;
  ctx.fillRect(cX, cY, cW, cH);
  ctx.restore();

  // 40 symmetric bars — grow from center up AND down, matching reference visualizer
  // 2× scale of HTML: 6px wide, 4px gap
  const bW = 6, bGap = 4;
  const totalBW = WF_N * bW + (WF_N - 1) * bGap;
  const bLeft = cX + (cW - totalBW) / 2;
  const bCenterY = cY + cH / 2 - 60;

  // Per-bar log-spaced FFT with tilt + attack/decay (matches sandbox)
  const binHz   = sampleRate / (freqBuf.length * 2);
  const minHz   = 60, maxHz = 18000;
  const target  = new Float32Array(WF_N);
  for (let i = 0; i < WF_N; i++) {
    const fLo = minHz * Math.pow(maxHz / minHz, i / WF_N);
    const fHi = minHz * Math.pow(maxHz / minHz, (i + 1) / WF_N);
    const bLo = Math.max(0, Math.floor(fLo / binHz));
    const bHi = Math.min(freqBuf.length - 1, Math.ceil(fHi / binHz));
    let sum2 = 0, cnt = Math.max(1, bHi - bLo + 1);
    for (let k = bLo; k <= bHi; k++) { const v = freqBuf[k] / 255; sum2 += v * v; }
    const rms = Math.sqrt(sum2 / cnt);
    const pos = i / (WF_N - 1);
    target[i] = Math.min(1, rms * (1 + WF_TILT * pos) * WF_GAIN);
  }
  // Neighbor smoothing
  const tmp = Float32Array.from(target);
  for (let i = 0; i < WF_N; i++) {
    const l = tmp[Math.max(0, i - 1)], c = tmp[i], r = tmp[Math.min(WF_N - 1, i + 1)];
    target[i] = c * (1 - WF_SMOOTH) + ((l + r) / 2) * WF_SMOOTH;
  }
  // Attack/decay per bar
  for (let i = 0; i < WF_N; i++) {
    const tg = Math.max(WF_FLOOR, target[i]);
    wfLevel[i] += (tg - wfLevel[i]) * (tg > wfLevel[i] ? WF_ATK : WF_DEC);
  }

  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  for (let i = 0; i < WF_N; i++) {
    const halfH = Math.max(3, Math.round(3 + wfLevel[i] * WF_MAX_H));
    const bX = bLeft + i * (bW + bGap);
    rrp(ctx, bX, bCenterY - halfH, bW, halfH * 2, 2);
    ctx.fill();
  }
  ctx.restore();

  // In-card text (matches the HTML template)
  const ls = ctx as CanvasRenderingContext2D & { letterSpacing: string };
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "6.8px";
  ctx.textAlign = "center";
  ctx.fillText(cfg.cardLabel || "RP AUDIO", cX + cW / 2, cY + cH - 56);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "5px";
  ctx.textAlign = "center";
  ctx.fillText(`— ${cfg.asmrLabel || "ASMR"} —`, cX + cW / 2, cY + cH - 26);
  ctx.restore();
}

// Sakura PNG spinner — matches the HTML template's spinning img
function drawSakura(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, rot: number) {
  const img = _sakuraImg;
  if (img?.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.shadowColor = "rgba(248,184,204,0.7)";
    ctx.shadowBlur = 10;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

// ── Now Playing ───────────────────────────────────────────────────────────

export function drawNowPlayingCard(
  ctx: CanvasRenderingContext2D,
  cfg: AudioTeaserConfig,
  imgEl: HTMLImageElement | null,
  bands: number[],
  progress: number,   // 0–1 for seek bar position
  durationSec?: number  // actual audio duration for time labels
) {
  const W = CANVAS_W;
  drawBg(ctx, imgEl, 56);

  const cW = 476, cH = 666;
  const cX = (W - cW) / 2;
  const cY = (CANVAS_H - cH) / 2;

  ctx.save();
  rrp(ctx, cX, cY, cW, cH, 20);
  ctx.clip();
  if (imgEl?.complete && imgEl.naturalWidth > 0) {
    ctx.drawImage(imgEl, cX, cY, cW, cH);
  } else {
    ctx.fillStyle = "#1a0810";
    ctx.fillRect(cX, cY, cW, cH);
  }
  const scrim = ctx.createLinearGradient(0, cY, 0, cY + cH);
  scrim.addColorStop(0, "rgba(8,3,6,0.55)");
  scrim.addColorStop(0.35, "rgba(8,3,6,0.05)");
  scrim.addColorStop(1, "rgba(8,3,6,0.88)");
  ctx.fillStyle = scrim;
  ctx.fillRect(cX, cY, cW, cH);
  ctx.restore();

  const ls = ctx as CanvasRenderingContext2D & { letterSpacing: string };
  const t = Date.now() / 1000;

  // "NOW PLAYING" — top-left
  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "6px";
  ctx.textAlign = "left";
  ctx.fillText("NOW PLAYING", cX + 32, cY + 40);
  ctx.restore();

  // Spinning sakura — top-right (5s period matches CSS animation:spin 5s linear infinite)
  drawSakura(ctx, cX + cW - 48, cY + 48, 52, t * (Math.PI * 2 / 5));

  // Title — bottom-left, with mini waveform bars beside it
  const titleY = cY + cH - 96;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `30px Georgia, "Times New Roman", serif`;
  ls.letterSpacing = "0px";
  ctx.textAlign = "left";
  const title = cfg.title || "Whisper & Rain";
  ctx.fillText(title, cX + 32, titleY);
  const titleW = ctx.measureText(title).width;
  ctx.restore();

  // Mini waveform bars beside the title (9 bars, matching HTML template)
  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  const N_MINI = 9;
  for (let i = 0; i < N_MINI; i++) {
    const v = bands[Math.floor((i / N_MINI) * bands.length)] ?? 0;
    const h = Math.max(2, v * 26);
    ctx.fillRect(cX + 32 + titleW + 12 + i * 6, titleY - h, 3, h);
  }
  ctx.restore();

  // Genre label under title (ASMR · N MIN or N SEC)
  const totalSec = durationSec ?? 0;
  const durationLabel = totalSec > 0
    ? (totalSec < 60
        ? `0:${String(Math.round(totalSec)).padStart(2, "0")} Min`
        : `${Math.max(1, Math.ceil(totalSec / 60))} Min`)
    : `${cfg.minutes || "24"} Min`;
  const mins = durationLabel;
  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "4px";
  ctx.textAlign = "left";
  ctx.fillText(`${cfg.asmrLabel || "ASMR"} · ${mins}`, cX + 32, titleY + 30);
  ctx.restore();

  // Seek bar
  const sL = cX + 32, sR = cX + cW - 32, sY = cY + cH - 52, sH = 5;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  rrp(ctx, sL, sY, sR - sL, sH, 3);
  ctx.fill();
  ctx.fillStyle = "#f8b8cc";
  rrp(ctx, sL, sY, Math.max(sH, (sR - sL) * progress), sH, 3);
  ctx.fill();
  ctx.restore();

  // Time labels — use actual audio duration when available
  function fmtSec(s: number) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }
  const elapsedSec = totalSec * progress;
  ctx.save();
  ctx.fillStyle = "#a98a92";
  ctx.font = "18px ui-monospace, monospace";
  ls.letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.fillText(fmtSec(elapsedSec), sL, cY + cH - 24);
  ctx.textAlign = "right";
  ctx.fillText(fmtSec(totalSec), sR, cY + cH - 24);
  ctx.restore();
}

// ── Sound Orb ─────────────────────────────────────────────────────────────

export function drawSoundOrbCard(
  ctx: CanvasRenderingContext2D,
  cfg: AudioTeaserConfig,
  imgEl: HTMLImageElement | null,
  amp: number   // 0–1
) {
  const W = CANVAS_W;
  drawBg(ctx, imgEl, 20);

  const orbX = W / 2;
  const orbY = CANVAS_H / 2;
  const orbR = 150;
  const t = Date.now() / 1000;

  // Smooth the amplitude across frames so everything moves like water, not a
  // strobe. amp only modulates intensity — never the ring expansion speed.
  orbAmpSmooth += (amp - orbAmpSmooth) * 0.08;
  const a = orbAmpSmooth;

  // Ripple rings — ease-out expansion matching CSS `animation: pulse 3.2s ease-out`
  // Quadratic ease-out: starts fast, decelerates — same feel as the CSS preview.
  const period = 3.2;
  for (let i = 0; i < 3; i++) {
    const phase = (((t / period) + i / 3) % 1 + 1) % 1;
    const eased = 1 - Math.pow(1 - phase, 2); // quadratic ease-out
    const r = orbR + eased * (orbR * 1.2);
    const opacity = (1 - phase) * a * 0.9;
    ctx.save();
    ctx.strokeStyle = `rgba(248,184,204,${opacity.toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(orbX, orbY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Orb portrait — very soft, delicate breathing
  const scale = 1 + a * 0.06;
  const r = orbR * scale;

  ctx.save();
  ctx.shadowColor = `rgba(248,184,204,${(0.3 + a * 0.45).toFixed(2)})`;
  ctx.shadowBlur = Math.round(28 + a * 50);
  ctx.beginPath();
  ctx.arc(orbX, orbY, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.shadowBlur = 0;

  if (imgEl?.complete && imgEl.naturalWidth > 0) {
    ctx.drawImage(imgEl, orbX - r, orbY - r, r * 2, r * 2);
  } else {
    const g = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, r);
    g.addColorStop(0, "#3a0820");
    g.addColorStop(1, "#1a0410");
    ctx.fillStyle = g;
    ctx.fillRect(orbX - r, orbY - r, r * 2, r * 2);
  }
  ctx.restore();

  // Caption
  const ls = ctx as CanvasRenderingContext2D & { letterSpacing: string };
  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  ctx.font = "20px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "6.8px";
  ctx.textAlign = "center";
  ctx.fillText(`· ${cfg.asmrLabel || "ASMR"} ·`, W / 2, orbY + 280);
  ctx.restore();
}
