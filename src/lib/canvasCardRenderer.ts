import type { AudioTeaserConfig } from "./buildAudioTeaser";

// Output canvas dimensions: 2× card size for crisp video
export const CANVAS_W = 780;
export const CANVAS_H = 976;

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

function drawBottomStrip(ctx: CanvasRenderingContext2D, cfg: AudioTeaserConfig) {
  const W = CANVAS_W, H = CANVAS_H;
  const pad = 56;

  const grad = ctx.createLinearGradient(0, H - 420, 0, H);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.45, "rgba(6,2,4,0.92)");
  grad.addColorStop(1, "rgba(6,2,4,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - 420, W, 420);

  let y = H - 192;

  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "9px";
  ctx.textAlign = "left";
  ctx.fillText((cfg.eyebrow || "NEW DROP").toUpperCase(), pad, y);
  ctx.restore();

  y += 36;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 46px Georgia, "Times New Roman", serif`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.fillText(cfg.title || "Whisper & Rain", pad, y);
  ctx.restore();

  y += 38;

  ctx.save();
  ctx.fillStyle = "#a98a92";
  ctx.font = "22px ui-sans-serif, system-ui, sans-serif";
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "2px";
  ctx.textAlign = "left";
  ctx.fillText(
    `${cfg.minutes || "24"} min · ${cfg.genre || "ASMR Roleplay"} · ${cfg.badge || "Exclusive"}`,
    pad, y
  );
  ctx.restore();
}

// ── Waveform ──────────────────────────────────────────────────────────────

export function drawWaveformCard(
  ctx: CanvasRenderingContext2D,
  cfg: AudioTeaserConfig,
  imgEl: HTMLImageElement | null,
  bands: number[]   // 18 values 0–1
) {
  const W = CANVAS_W;
  drawBg(ctx, imgEl, 56);

  // Portrait card
  const cardAreaH = CANVAS_H - 190;
  const cW = 476, cH = 666;
  const cX = (W - cW) / 2;
  const cY = (cardAreaH - cH) / 2;

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

  ctx.save();
  ctx.strokeStyle = "rgba(200,132,122,0.5)";
  ctx.lineWidth = 3;
  rrp(ctx, cX, cY, cW, cH, 20);
  ctx.stroke();
  ctx.restore();

  // Waveform bars
  const N = 18, bW = 6, bGap = 6;
  const totalBW = N * bW + (N - 1) * bGap;
  const bLeft = cX + (cW - totalBW) / 2;
  const bBottom = cY + cH - 120;

  for (let i = 0; i < N; i++) {
    const amp = bands[Math.floor((i / N) * bands.length)] ?? 0;
    const bH = Math.max(8, amp * 80);
    ctx.save();
    ctx.fillStyle = "#f8b8cc";
    rrp(ctx, bLeft + i * (bW + bGap), bBottom - bH, bW, bH, 4);
    ctx.fill();
    ctx.restore();
  }

  // Card text
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

  drawBottomStrip(ctx, cfg);
}

// ── Now Playing ───────────────────────────────────────────────────────────

export function drawNowPlayingCard(
  ctx: CanvasRenderingContext2D,
  cfg: AudioTeaserConfig,
  imgEl: HTMLImageElement | null,
  bands: number[],
  progress: number   // 0–1 for seek bar position
) {
  const W = CANVAS_W;
  drawBg(ctx, imgEl, 56);

  const cardAreaH = CANVAS_H - 190;
  const cW = 476, cH = 666;
  const cX = (W - cW) / 2;
  const cY = (cardAreaH - cH) / 2;

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

  ctx.save();
  ctx.strokeStyle = "rgba(200,132,122,0.5)";
  ctx.lineWidth = 3;
  rrp(ctx, cX, cY, cW, cH, 20);
  ctx.stroke();
  ctx.restore();

  const ls = ctx as CanvasRenderingContext2D & { letterSpacing: string };

  // "NOW PLAYING"
  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "6px";
  ctx.textAlign = "left";
  ctx.fillText("NOW PLAYING", cX + 32, cY + 36);
  ctx.restore();

  // Title
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `28px Georgia, "Times New Roman", serif`;
  ls.letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.fillText(cfg.title || "Whisper & Rain", cX + 32, cY + cH - 100);
  ctx.restore();

  // Genre
  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  ctx.font = "18px ui-sans-serif, system-ui, sans-serif";
  ls.letterSpacing = "4px";
  ctx.textAlign = "left";
  ctx.fillText(
    `${cfg.asmrLabel || "ASMR"} · ${cfg.minutes || "24"} MIN`,
    cX + 32, cY + cH - 72
  );
  ctx.restore();

  // Mini waveform bars (5 bars beside title)
  const avg = bands.length > 0 ? bands.reduce((a, b) => a + b, 0) / bands.length : 0;
  const t = Date.now() / 1000;
  ctx.save();
  ctx.fillStyle = "#f8b8cc";
  for (let i = 0; i < 5; i++) {
    const h = 3 + (Math.sin(t * 3 + i * 1.2) * 0.5 + 0.5) * avg * 18;
    ctx.fillRect(cX + 32 + 260 + i * 6, cY + cH - 100 - h, 2, h);
  }
  ctx.restore();

  // Seek bar
  const sL = cX + 32, sR = cX + cW - 32, sY = cY + cH - 60, sH = 6;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  rrp(ctx, sL, sY, sR - sL, sH, 3);
  ctx.fill();
  ctx.fillStyle = "#f8b8cc";
  rrp(ctx, sL, sY, Math.max(sH, (sR - sL) * progress), sH, 3);
  ctx.fill();
  ctx.restore();

  // Time labels
  ctx.save();
  ctx.fillStyle = "#a98a92";
  ctx.font = "18px ui-monospace, monospace";
  ls.letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.fillText(cfg.timeStart || "03:12", sL, cY + cH - 30);
  ctx.textAlign = "right";
  ctx.fillText(`${cfg.minutes || "24"}:00`, sR, cY + cH - 30);
  ctx.restore();

  drawBottomStrip(ctx, cfg);
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

  const cardAreaH = CANVAS_H - 190;
  const orbX = W / 2;
  const orbY = cardAreaH / 2;
  const orbR = 150;
  const t = Date.now() / 1000;

  // 3 pulse rings
  for (let i = 0; i < 3; i++) {
    const phase = ((t / 3.2) + i / 3) % 1;
    const r = orbR + phase * (330 - orbR);
    const opacity = (1 - phase) * (0.35 + amp * 0.4);
    ctx.save();
    ctx.strokeStyle = `rgba(248,184,204,${opacity.toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orbX, orbY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Orb portrait
  const scale = 1 + amp * 0.14;
  const r = orbR * scale;

  ctx.save();
  ctx.shadowColor = `rgba(248,184,204,${(0.3 + amp * 0.5).toFixed(2)})`;
  ctx.shadowBlur = Math.round(36 + amp * 70);
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
  ctx.fillText(`· ${cfg.asmrLabel || "ASMR"} ·`, W / 2, cardAreaH - 100);
  ctx.restore();

  drawBottomStrip(ctx, cfg);
}
