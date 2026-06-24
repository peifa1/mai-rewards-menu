/**
 * Canvas renderer for all three Audio Teaser card styles.
 * Draws at true 1080×1350 output resolution.
 *
 * All CSS layout values are specified in the 390-wide template coordinate
 * space and scaled by S = 1080/390 for actual canvas pixels.
 */

import type { AudioTeaserConfig, TeaserStyle } from "./buildAudioTeaser";

const S = 1080 / 390;
const W = 1080;
const H = 1350;

const ROSE   = "#f8b8cc";
const MUTED  = "#a98a92";
const DARK   = "rgba(8,3,6,";

type AnyCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export interface RenderFrame {
  /** 32 normalized frequency bands (0..1) matching the live engine */
  bands: number[];
  /** Overall amplitude (0..1) */
  amp: number;
  /** Playback position in seconds */
  time: number;
  /** Total clip duration in seconds */
  duration: number;
}

export interface RenderAssets {
  /** Cover artwork, pre-decoded as ImageBitmap */
  coverImage: ImageBitmap;
}

// ── Cover-fit draw (like CSS object-fit:cover) ────────────────────────────────
function coverDraw(ctx: AnyCtx, bmp: ImageBitmap, x: number, y: number, w: number, h: number) {
  const ir = bmp.width / bmp.height;
  const tr = w / h;
  let dw: number, dh: number;
  if (ir > tr) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  ctx.drawImage(bmp, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ── Blurred background ────────────────────────────────────────────────────────
function drawBG(ctx: AnyCtx, bmp: ImageBitmap, blurPx: number, over: number) {
  ctx.save();
  ctx.filter = `blur(${blurPx}px) brightness(0.45) saturate(1.3)`;
  coverDraw(ctx, bmp, -W * over, -H * over, W * (1 + 2 * over), H * (1 + 2 * over));
  ctx.restore();
}

// ── Shared vignette overlay ───────────────────────────────────────────────────
function drawVignette(ctx: AnyCtx) {
  const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.62);
  rg.addColorStop(0, "rgba(6,2,4,0)");
  rg.addColorStop(1, "rgba(6,2,4,0.55)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  const lg = ctx.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, "rgba(6,2,4,0.3)"); lg.addColorStop(0.25, "rgba(6,2,4,0)");
  lg.addColorStop(0.75, "rgba(6,2,4,0)"); lg.addColorStop(1, "rgba(6,2,4,0.3)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
}

// ── Bottom label strip (shared across all styles) ────────────────────────────
function drawBottomStrip(ctx: AnyCtx, cfg: AudioTeaserConfig) {
  const stripH = 124.6 * S;
  const sg = ctx.createLinearGradient(0, H, 0, H - stripH);
  sg.addColorStop(0, "rgba(6,2,4,0.92)"); sg.addColorStop(0.55, "rgba(6,2,4,0.92)");
  sg.addColorStop(1, "rgba(6,2,4,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, H - stripH, W, stripH);

  const lx = 28 * S;
  let y = H - stripH + 32 * S;
  ctx.textAlign = "left"; ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(248,184,204,0.95)";
  ctx.font = `${9 * S}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${0.55 * 9 * S}px`;
  ctx.fillText((cfg.eyebrow || "New Drop").toUpperCase(), lx, y);
  y += 9 * S + 10 * S;

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${24 * S}px Georgia, "Times New Roman", serif`;
  ctx.letterSpacing = "0px";
  ctx.fillText(cfg.title || "Whisper & Rain", lx, y);
  y += 24 * S * 1.15 + 7 * S;

  ctx.fillStyle = MUTED;
  ctx.font = `${11 * S}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${0.1 * 11 * S}px`;
  ctx.fillText(`${cfg.minutes || "0"} min · ${cfg.genre || ""} · ${cfg.badge || ""}`, lx, y);
  ctx.letterSpacing = "0px";
}

// ── Rounded rect helper ───────────────────────────────────────────────────────
function roundedRect(ctx: AnyCtx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof (ctx as CanvasRenderingContext2D).roundRect === "function") {
    (ctx as CanvasRenderingContext2D).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// ── 5-petal sakura (drawn in canvas for Now Playing) ─────────────────────────
function drawSakura(ctx: AnyCtx, cxPx: number, cyPx: number, radiusPx: number, angle: number) {
  ctx.save();
  ctx.translate(cxPx, cyPx);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.92;
  const r = radiusPx;
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.beginPath();
    // Each petal: a notched heart shape using two bezier curves pointing upward
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.38, -r * 0.22, -r * 0.3, -r * 0.85, 0, -r * 0.78);
    ctx.bezierCurveTo( r * 0.3, -r * 0.85,  r * 0.38, -r * 0.22, 0, 0);
    ctx.fillStyle = ROSE;
    ctx.fill();
    ctx.restore();
  }
  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd0e0";
  ctx.fill();
  ctx.restore();
}

// Format mm:ss
function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Waveform style ────────────────────────────────────────────────────────────
function drawWaveform(ctx: AnyCtx, cfg: AudioTeaserConfig, assets: RenderAssets, frame: RenderFrame) {
  // Inner card dimensions (390-space → pixels)
  const cx = 76 * S, cy = 30 * S, cw = 238 * S, ch = 333 * S, cr = 10 * S;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.70)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  roundedRect(ctx, cx, cy, cw, ch, cr);
  ctx.fillStyle = "#000"; ctx.fill();
  ctx.restore();

  // Clip + cover image
  ctx.save();
  roundedRect(ctx, cx, cy, cw, ch, cr); ctx.clip();
  coverDraw(ctx, assets.coverImage, cx, cy, cw, ch);

  // Card veil
  const veil = ctx.createLinearGradient(0, cy, 0, cy + ch);
  veil.addColorStop(0.40, `${DARK}0.05)`);
  veil.addColorStop(1.00, `${DARK}0.78)`);
  ctx.fillStyle = veil; ctx.fillRect(cx, cy, cw, ch);

  // Waveform bars — driven by frame.bands
  const nBars = 18;
  const bw = 3 * S, gap = 3 * S;
  const totalBarW = nBars * bw + (nBars - 1) * gap;
  const startX = cx + (cw - totalBarW) / 2;
  const barsBottom = cy + ch - 60 * S;
  const maxBarH = 37 * S;

  ctx.fillStyle = ROSE;
  for (let i = 0; i < nBars; i++) {
    const band = frame.bands[Math.floor((i / nBars) * frame.bands.length)] ?? 0;
    const barH = Math.max(3 * S, 3 * S + band * maxBarH);
    const bx = startX + i * (bw + gap);
    roundedRect(ctx, bx, barsBottom - barH, bw, barH, 2 * S);
    ctx.fill();
  }

  // Card label (RP AUDIO / card-specific label)
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  ctx.font = `${10 * S}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${0.34 * 10 * S}px`;
  ctx.fillText(cfg.cardLabel || "RP AUDIO", cx + cw / 2, cy + ch - 28 * S);

  // ASMR sublabel
  ctx.fillStyle = ROSE;
  ctx.font = `${9 * S}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${0.28 * 9 * S}px`;
  ctx.fillText(`— ${cfg.asmrLabel || "ASMR"} —`, cx + cw / 2, cy + ch - 13 * S);
  ctx.letterSpacing = "0px";

  ctx.restore();
}

// ── Now Playing style ─────────────────────────────────────────────────────────
function drawNowPlaying(ctx: AnyCtx, cfg: AudioTeaserConfig, assets: RenderAssets, frame: RenderFrame) {
  const cx = 76 * S, cy = 30 * S, cw = 238 * S, ch = 333 * S, cr = 10 * S;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.70)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  roundedRect(ctx, cx, cy, cw, ch, cr);
  ctx.fillStyle = "#000"; ctx.fill();
  ctx.restore();

  // Clip + cover image
  ctx.save();
  roundedRect(ctx, cx, cy, cw, ch, cr); ctx.clip();
  coverDraw(ctx, assets.coverImage, cx, cy, cw, ch);

  // Card scrim
  const scrim = ctx.createLinearGradient(0, cy, 0, cy + ch);
  scrim.addColorStop(0.00, `${DARK}0.55)`);
  scrim.addColorStop(0.35, `${DARK}0.05)`);
  scrim.addColorStop(1.00, `${DARK}0.88)`);
  ctx.fillStyle = scrim; ctx.fillRect(cx, cy, cw, ch);
  ctx.restore();

  // Sakura icon (top-right, spinning)
  const sakR = 25 * S;  // radius = half of 50px
  const sakCx = cx + cw - 12 * S - sakR;
  const sakCy = cy + 12 * S + sakR;
  const spinAngle = (frame.time / 5) * Math.PI * 2;  // 5-second full rotation
  drawSakura(ctx, sakCx, sakCy, sakR, spinAngle);

  // "NOW PLAYING" label
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillStyle = ROSE;
  ctx.font = `${9 * S}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${0.3 * 9 * S}px`;
  ctx.fillText("NOW PLAYING", cx + 16 * S, cy + 18 * S);

  // Title block (bottom:50px from card)
  const blockBottom = cy + ch - 50 * S;
  const titleH = 15 * S * 1.25;
  const genreH = 9 * S;
  const blockTop = blockBottom - titleH - 4 * S - genreH;

  // Title text
  ctx.fillStyle = "#fff";
  ctx.font = `${15 * S}px Georgia, "Times New Roman", serif`;
  ctx.letterSpacing = "0px";
  ctx.textBaseline = "top";
  ctx.fillText(cfg.title || "Whisper & Rain", cx + 16 * S, blockTop);

  // Mini waveform (inline with title, to the right)
  const titleWidth = ctx.measureText(cfg.title || "Whisper & Rain").width;
  const miniX = cx + 16 * S + titleWidth + 7 * S;
  const miniBottom = blockTop + titleH;
  const nMini = 9;
  const miniBarW = 2 * S, miniGap = 2 * S, miniMaxH = 11 * S;
  ctx.fillStyle = ROSE;
  for (let i = 0; i < nMini; i++) {
    const band = frame.bands[Math.floor((i / nMini) * frame.bands.length)] ?? 0;
    const barH = Math.max(2 * S, 2 * S + band * miniMaxH);
    roundedRect(ctx, miniX + i * (miniBarW + miniGap), miniBottom - barH, miniBarW, barH, 1 * S);
    ctx.fill();
  }

  // Genre label
  ctx.fillStyle = ROSE;
  ctx.font = `${9 * S}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${0.2 * 9 * S}px`;
  ctx.textBaseline = "top";
  const genreY = blockTop + titleH + 4 * S;
  ctx.fillText(`${cfg.asmrLabel || "ASMR"} · ${cfg.minutes || "0"} MIN`, cx + 16 * S, genreY);
  ctx.letterSpacing = "0px";

  // Seek bar
  const seekY = cy + ch - 30 * S - 3 * S;
  const seekW = cw - 32 * S;
  const seekX = cx + 16 * S;
  const progress = frame.duration > 0 ? Math.min(1, frame.time / frame.duration) : 0;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundedRect(ctx, seekX, seekY, seekW, 3 * S, 1.5 * S); ctx.fill();
  if (progress > 0) {
    ctx.fillStyle = ROSE;
    roundedRect(ctx, seekX, seekY, seekW * progress, 3 * S, 1.5 * S); ctx.fill();
  }

  // Time display
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = MUTED;
  ctx.font = `${9 * S}px ui-monospace, monospace`;
  ctx.letterSpacing = "0px";
  const timeY = cy + ch - 15 * S;
  ctx.fillText(cfg.timeStart || fmt(frame.time), cx + 16 * S, timeY);
  ctx.textAlign = "right";
  ctx.fillText(fmt(frame.duration), cx + cw - 16 * S, timeY);
  ctx.textAlign = "left";
}

// ── Sound Orb style ───────────────────────────────────────────────────────────
function drawSoundOrb(ctx: AnyCtx, cfg: AudioTeaserConfig, assets: RenderAssets, frame: RenderFrame) {
  // Orb card is 210×294, centered in card-wrap
  const orbCenterX = (390 / 2) * S;  // horizontal center of showcase
  const wrapH = (488 - 95) * S;      // card-wrap available height
  const orbCenterY = wrapH / 2;      // vertical center of card-wrap

  const orbR = 75 * S;  // orb-portrait radius = 150/2 = 75px
  const amp = frame.amp;

  // Pulse rings (3 rings, staggered by 1.05s in a 3.2s cycle)
  const pulseMinR = 75 * S;   // 150/2
  const pulseMaxR = 165 * S;  // 330/2
  const period = 3.2;
  const delays = [0, 1.05, 2.1];

  for (const delay of delays) {
    const t = frame.time - delay;
    const prog = ((t % period) + period) % period / period;
    const r = pulseMinR + (pulseMaxR - pulseMinR) * prog;
    const baseOpacity = 0.55 * (1 - prog);
    // When audio plays, rings brighten with amplitude
    const opacity = Math.min(1, baseOpacity + amp * 0.4);
    ctx.beginPath();
    ctx.arc(orbCenterX, orbCenterY, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(248,184,204,${opacity.toFixed(3)})`;
    ctx.lineWidth = 1 * S;
    ctx.stroke();
  }

  // Orb portrait (circle)
  const orbScale = 1 + amp * 0.14;
  const orbActualR = orbR * orbScale;

  ctx.save();
  ctx.beginPath();
  ctx.arc(orbCenterX, orbCenterY, orbActualR, 0, Math.PI * 2);
  ctx.clip();
  coverDraw(ctx, assets.coverImage, orbCenterX - orbActualR, orbCenterY - orbActualR, orbActualR * 2, orbActualR * 2);
  ctx.restore();

  // Orb glow
  const glowR = Math.round(24 + amp * 70) * S / 3; // scale down for canvas
  const glowOpacity = (0.3 + amp * 0.5).toFixed(2);
  const glow = ctx.createRadialGradient(orbCenterX, orbCenterY, orbActualR * 0.5, orbCenterX, orbCenterY, orbActualR + glowR);
  glow.addColorStop(0, `rgba(248,184,204,${glowOpacity})`);
  glow.addColorStop(1, "rgba(248,184,204,0)");
  ctx.save();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(orbCenterX, orbCenterY, orbActualR + glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Orb caption "· ASMR ·" (bottom:100px from card bottom in card coords)
  // card-wrap center = orbCenterY, card height = 294*S, card top = orbCenterY - 147*S
  const cardBottom = orbCenterY + 147 * S;
  const captionY = cardBottom - 100 * S;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = `${10 * S}px ui-sans-serif, system-ui, sans-serif`;
  ctx.letterSpacing = `${0.34 * 10 * S}px`;
  ctx.fillStyle = ROSE;
  ctx.fillText(`· ${cfg.asmrLabel || "ASMR"} ·`, orbCenterX, captionY);
  ctx.letterSpacing = "0px";
}

// ── Public API ────────────────────────────────────────────────────────────────
export function renderCardFrame(
  ctx: AnyCtx,
  style: TeaserStyle,
  cfg: AudioTeaserConfig,
  assets: RenderAssets,
  frame: RenderFrame,
) {
  ctx.clearRect(0, 0, W, H);

  // Background (soundorb uses a softer blur)
  const isSoundOrb = style === "soundorb";
  drawBG(ctx, assets.coverImage, isSoundOrb ? 10 * S : 28 * S, isSoundOrb ? 0.08 : 0.12);
  drawVignette(ctx);

  if (style === "waveform") drawWaveform(ctx, cfg, assets, frame);
  else if (style === "nowplaying") drawNowPlaying(ctx, cfg, assets, frame);
  else drawSoundOrb(ctx, cfg, assets, frame);

  drawBottomStrip(ctx, cfg);
}

/** Load a data-URL image into an ImageBitmap suitable for canvas rendering. */
export async function loadImageBitmap(dataUrl: string): Promise<ImageBitmap> {
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  return createImageBitmap(blob);
}
