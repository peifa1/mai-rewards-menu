import type { AudioTeaserConfig } from "./buildAudioTeaser";
import { SAKURA_DATA_URL } from "./sakuraDataUrl";

// Logical draw dimensions (all draw functions use these coordinates)
export const CANVAS_W = 780;
export const CANVAS_H = 976;

// Actual output canvas dimensions — 1080p-wide for X/social quality
// The builder scales the context by (OUT_W/CANVAS_W) before drawing
export const OUT_W = 1080;
export const OUT_H = 1352;

// hex color + alpha → "rgba(r,g,b,a)"
function ha(hex: string, alpha: number): string {
  const n = parseInt((hex || "#f8b8cc").replace("#", ""), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Persistent smoothing state for the Sound Orb (one recording at a time).
let orbAmpSmooth = 0;

const WF_N = 20;

// Waveform bar level state — per-bar attack/decay smoothing across frames
let wfLevel = new Float32Array(20);

// Now Playing mini bar level state
const NP_N = 9;
let npLevel = new Float32Array(NP_N);

// User-tuned constants (tuned at 60fps in sandbox). The canvas render loop
// now also runs at 60fps + analyser smoothing matches the preview, so the
// sandbox constants apply directly — no frame-rate compensation needed.
const WF_GAIN   = 0.5;
const WF_TILT   = 6;
const WF_ATK    = 0.5;
const WF_DEC    = 0.24;
const WF_SMOOTH = 0.7;
const WF_FLOOR  = 0;
const WF_MAX_H  = 30;

// Sakura PNG — lazy-loaded so it's created in the browser context even if this
// module was first evaluated on the server (Next.js SSR sets window=undefined).
let _sakuraImg: HTMLImageElement | null = null;

function getSakuraImg(): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (!_sakuraImg) {
    const i = new Image();
    i.src = SAKURA_DATA_URL;
    _sakuraImg = i;
  }
  return _sakuraImg;
}

export function preloadCanvasAssets(): Promise<void> {
  const img = getSakuraImg();
  if (!img) return Promise.resolve();
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  if (typeof img.decode === "function") return img.decode().catch(() => {});
  return new Promise(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); });
}

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
  freqBuf: Uint8Array,          // mono/fallback FFT
  sampleRate: number,
  dt: number = 1 / 60,
  freqL?: Uint8Array,           // left channel FFT (stereo spatial)
  freqR?: Uint8Array            // right channel FFT (stereo spatial)
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
  // Match HTML: bars at bottom:52px, height:56px → center = cH - (52+28)*2 from card top
  const bCenterY = cY + cH - 160;

  // Per-bar log-spaced FFT with stereo spatial blend + tilt + gain
  const binHz   = sampleRate / (freqBuf.length * 2);
  const minHz   = 60, maxHz = 18000;
  const stereo  = !!(freqL && freqR);
  const target  = new Float32Array(WF_N);
  for (let i = 0; i < WF_N; i++) {
    const fLo = minHz * Math.pow(maxHz / minHz, i / WF_N);
    const fHi = minHz * Math.pow(maxHz / minHz, (i + 1) / WF_N);
    const bLo = Math.max(0, Math.floor(fLo / binHz));
    const bHi = Math.min(freqBuf.length - 1, Math.ceil(fHi / binHz));
    const cnt  = Math.max(1, bHi - bLo + 1);
    const pos  = i / (WF_N - 1);
    let rms: number;
    if (stereo) {
      let sumL = 0, sumR = 0;
      for (let k = bLo; k <= bHi; k++) {
        const vL = freqL![k] / 255; sumL += vL * vL;
        const vR = freqR![k] / 255; sumR += vR * vR;
      }
      // Blend: bar 0 = pure left channel, bar N-1 = pure right channel
      rms = Math.sqrt(sumL / cnt) * (1 - pos) + Math.sqrt(sumR / cnt) * pos;
    } else {
      let sum2 = 0;
      for (let k = bLo; k <= bHi; k++) { const v = freqBuf[k] / 255; sum2 += v * v; }
      rms = Math.sqrt(sum2 / cnt);
    }
    target[i] = Math.min(1, rms * (1 + WF_TILT * pos) * WF_GAIN);
  }
  // Neighbor smoothing
  const tmp = Float32Array.from(target);
  for (let i = 0; i < WF_N; i++) {
    const l = tmp[Math.max(0, i - 1)], c = tmp[i], r = tmp[Math.min(WF_N - 1, i + 1)];
    target[i] = c * (1 - WF_SMOOTH) + ((l + r) / 2) * WF_SMOOTH;
  }
  // Attack/decay per bar — time-delta normalized to 60fps so behavior matches
  // preview at any refresh rate (60Hz, 120Hz, etc.)
  const dtN = Math.min(dt * 60, 4); // clamp to avoid huge jumps on tab resume
  const atk = 1 - Math.pow(1 - WF_ATK, dtN);
  const dec = 1 - Math.pow(1 - WF_DEC, dtN);
  for (let i = 0; i < WF_N; i++) {
    const tg = Math.max(WF_FLOOR, target[i]);
    wfLevel[i] += (tg - wfLevel[i]) * (tg > wfLevel[i] ? atk : dec);
  }

  ctx.save();
  ctx.fillStyle = cfg.accentColor || "#f8b8cc";
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
  ctx.fillStyle = cfg.titleColor || "#ffffff";
  ctx.font = "20px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "6.8px";
  ctx.textAlign = "center";
  ctx.fillText(cfg.cardLabel ?? "", cX + cW / 2, cY + cH - 56);
  ctx.restore();

  const wfAsmr = cfg.asmrLabel ?? "";
  if (wfAsmr) {
    ctx.save();
    ctx.fillStyle = cfg.accentColor || "#f8b8cc";
    ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
    ls.letterSpacing = "5px";
    ctx.textAlign = "center";
    ctx.fillText(`— ${wfAsmr} —`, cX + cW / 2, cY + cH - 26);
    ctx.restore();
  }
}

// Sakura PNG spinner — matches the HTML template's spinning img
function drawSakura(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, rot: number) {
  const img = getSakuraImg();
  if (!img) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.shadowColor = "rgba(248,184,204,0.7)";
  ctx.shadowBlur = 10;
  try { ctx.drawImage(img, -size / 2, -size / 2, size, size); } catch { /* not decoded yet */ }
  ctx.restore();
}

// ── Now Playing ───────────────────────────────────────────────────────────

export function drawNowPlayingCard(
  ctx: CanvasRenderingContext2D,
  cfg: AudioTeaserConfig,
  imgEl: HTMLImageElement | null,
  bands: number[],
  progress: number,
  durationSec?: number,
  freqBuf?: Uint8Array,
  sampleRate?: number,
  dt: number = 1 / 60,
  freqL?: Uint8Array,
  freqR?: Uint8Array,
  animSec?: number
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
  const t = animSec ?? (Date.now() / 1000);

  // "NOW PLAYING" — top-left
  ctx.save();
  ctx.fillStyle = cfg.accentColor || "#f8b8cc";
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
  ctx.fillStyle = cfg.titleColor || "#ffffff";
  ctx.font = `30px Georgia, "Times New Roman", serif`;
  ls.letterSpacing = "0px";
  ctx.textAlign = "left";
  const title = cfg.title ?? "";
  ctx.fillText(title, cX + 32, titleY);
  const titleW = ctx.measureText(title).width;
  ctx.restore();

  // Mini waveform bars — same live FFT + stereo logic as waveform card, small scale
  ctx.save();
  ctx.fillStyle = cfg.accentColor || "#f8b8cc";
  if (freqBuf && sampleRate) {
    const binHz  = sampleRate / (freqBuf.length * 2);
    const minHz  = 60, maxHz = 18000;
    const stereo = !!(freqL && freqR);
    const dtN    = Math.min(dt * 60, 4);
    const atk    = 1 - Math.pow(1 - WF_ATK, dtN);
    const dec    = 1 - Math.pow(1 - WF_DEC, dtN);
    for (let i = 0; i < NP_N; i++) {
      const fLo = minHz * Math.pow(maxHz / minHz, i / NP_N);
      const fHi = minHz * Math.pow(maxHz / minHz, (i + 1) / NP_N);
      const bLo = Math.max(0, Math.floor(fLo / binHz));
      const bHi = Math.min(freqBuf.length - 1, Math.ceil(fHi / binHz));
      const cnt  = Math.max(1, bHi - bLo + 1);
      const pos  = i / (NP_N - 1);
      let rms: number;
      if (stereo) {
        let sumL = 0, sumR = 0;
        for (let k = bLo; k <= bHi; k++) {
          const vL = freqL![k] / 255; sumL += vL * vL;
          const vR = freqR![k] / 255; sumR += vR * vR;
        }
        rms = Math.sqrt(sumL / cnt) * (1 - pos) + Math.sqrt(sumR / cnt) * pos;
      } else {
        let sum2 = 0;
        for (let k = bLo; k <= bHi; k++) { const v = freqBuf[k] / 255; sum2 += v * v; }
        rms = Math.sqrt(sum2 / cnt);
      }
      const tg = Math.min(1, rms * (1 + WF_TILT * pos) * WF_GAIN);
      npLevel[i] += (tg - npLevel[i]) * (tg > npLevel[i] ? atk : dec);
      const h = Math.max(2, Math.round(2 + npLevel[i] * 24));
      ctx.fillRect(cX + 32 + titleW + 12 + i * 6, titleY - h + 4, 3, h);
    }
  } else {
    // Fallback to bands when no FFT data
    for (let i = 0; i < NP_N; i++) {
      const v = bands[Math.floor((i / NP_N) * bands.length)] ?? 0;
      const h = Math.max(2, v * 26);
      ctx.fillRect(cX + 32 + titleW + 12 + i * 6, titleY - h, 3, h);
    }
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
  ctx.fillStyle = cfg.accentColor || "#f8b8cc";
  ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "4px";
  ctx.textAlign = "left";
  ctx.fillText(cfg.asmrLabel ? `${cfg.asmrLabel} · ${mins}` : mins, cX + 32, titleY + 30);
  ctx.restore();

  // Seek bar
  const sL = cX + 32, sR = cX + cW - 32, sY = cY + cH - 52, sH = 5;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  rrp(ctx, sL, sY, sR - sL, sH, 3);
  ctx.fill();
  ctx.fillStyle = cfg.accentColor || "#f8b8cc";
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

const ORB_N_BARS  = 80;
const ORB_INNER_R = 158; // just outside portrait edge (orbR=150)
const ORB_MAX_BAR = 90;  // max bar length in px
const orbBars     = new Float32Array(ORB_N_BARS); // per-bar smoothed levels

export function drawSoundOrbCard(
  ctx: CanvasRenderingContext2D,
  cfg: AudioTeaserConfig,
  imgEl: HTMLImageElement | null,
  amp: number,        // 0–1
  freqBuf?: Uint8Array
) {
  const W = CANVAS_W;
  drawBg(ctx, imgEl, 20);

  const orbX = W / 2;
  const orbY = CANVAS_H / 2;
  const orbR = 150;

  orbAmpSmooth += (amp - orbAmpSmooth) * 0.08;
  const a = orbAmpSmooth;

  // ── Radial waveform ────────────────────────────────────────────────────
  // Same constants as iframe preview and Waveform card
  const ORB_GAIN = 0.55, ORB_ATK = 0.5, ORB_DEC = 0.24, ORB_NBSM = 0.7;

  if (freqBuf && freqBuf.length > 0) {
    const len = freqBuf.length;
    const logMin = Math.log(2), logMax = Math.log(len * 0.6);
    for (let i = 0; i < ORB_N_BARS; i++) {
      const fi  = Math.min(Math.round(Math.exp(logMin + (logMax - logMin) * i / ORB_N_BARS)), len - 1);
      const raw = Math.min(1, freqBuf[fi] / 255 * ORB_GAIN);
      orbBars[i] += (raw - orbBars[i]) * (raw > orbBars[i] ? ORB_ATK : ORB_DEC);
    }
  } else {
    for (let i = 0; i < ORB_N_BARS; i++) orbBars[i] *= (1 - ORB_DEC);
  }

  // Neighbor smoothing (circular)
  const dispBars = new Float32Array(ORB_N_BARS);
  for (let i = 0; i < ORB_N_BARS; i++) {
    const l = orbBars[(i - 1 + ORB_N_BARS) % ORB_N_BARS];
    const r = orbBars[(i + 1) % ORB_N_BARS];
    dispBars[i] = orbBars[i] * (1 - ORB_NBSM) + (l + r) / 2 * ORB_NBSM;
  }

  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < ORB_N_BARS; i++) {
    const v      = dispBars[i];
    const barLen = v * ORB_MAX_BAR;
    if (barLen < 0.5) continue;
    const angle   = (i / ORB_N_BARS) * Math.PI * 2 - Math.PI / 2;
    const x1 = orbX + ORB_INNER_R * Math.cos(angle);
    const y1 = orbY + ORB_INNER_R * Math.sin(angle);
    const x2 = orbX + (ORB_INNER_R + barLen) * Math.cos(angle);
    const y2 = orbY + (ORB_INNER_R + barLen) * Math.sin(angle);
    const opacity = 0.35 + v * 0.65;
    ctx.strokeStyle = ha(cfg.accentColor || "#f8b8cc", opacity);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // ── Portrait with glow ─────────────────────────────────────────────────
  const scale = 1 + a * 0.06;
  const r = orbR * scale;

  // Pass 1: draw filled circle with shadow so the glow renders outside the circle.
  // The image drawn in pass 2 will overwrite the fill inside, leaving only the outer glow.
  ctx.save();
  ctx.shadowColor = ha(cfg.accentColor || "#f8b8cc", 0.3 + a * 0.45);
  ctx.shadowBlur = Math.round(60 + a * 50);
  ctx.fillStyle = "#1a0410";
  ctx.beginPath();
  ctx.arc(orbX, orbY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Pass 2: clip to circle and draw the portrait image (no shadow inside).
  ctx.save();
  ctx.beginPath();
  ctx.arc(orbX, orbY, r, 0, Math.PI * 2);
  ctx.clip();

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

  // Caption — ASMR label (title color, 1.8× larger) + smaller sub-label (accent)
  const ls = ctx as CanvasRenderingContext2D & { letterSpacing: string };
  const asmr = cfg.asmrLabel ?? "";
  if (asmr) {
    ctx.save();
    ctx.fillStyle = cfg.titleColor || "#ffffff";
    ctx.font = "46px ui-sans-serif, system-ui, sans-serif";
    ls.letterSpacing = "11px";
    ctx.textAlign = "center";
    ctx.fillText(`· ${asmr} ·`, W / 2, orbY + 300);
    ctx.restore();
  }
  const sub = cfg.orbSubLabel ?? "";
  if (sub) {
    ctx.save();
    ctx.fillStyle = cfg.accentColor || "#f8b8cc";
    ctx.font = "24px ui-sans-serif, system-ui, sans-serif";
    ls.letterSpacing = "5px";
    ctx.textAlign = "center";
    ctx.fillText(sub, W / 2, orbY + 338);
    ctx.restore();
  }
}
