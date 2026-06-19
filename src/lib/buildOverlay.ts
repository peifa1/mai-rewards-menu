// Take the master overlay HTML template (a fully self-contained single file)
// and apply user customisations via targeted text replacement + script/style injection.

export type AudioText = { top: string; sub: string };

export type OverlayConfig = {
  tierNames: string[]; // length 6
  tierImages: string[][]; // [tier][slot 0|1|2] data URL or "" (keep original)
  audioTiers: boolean[];
  audioColors: string[];      // per-tier wave/mic color
  audioTexts: AudioText[];    // per-tier "RP AUDIO" / "ASMR" text
  cardShine: boolean[];       // per-tier audio-card outline glow toggle
  cardShineColor: string[];   // per-tier shine color
  cardBlur: boolean[];        // per-tier blur toggle
  cardBlurAmount: number;     // px blur radius applied when on
  textColor: string;
  // Timing
  holdMs: number;
  breakMs: number;
  startDelayMs: number;
};

const TIER_COUNT = 6;

const fill = <T,>(n: number, v: T): T[] => Array.from({ length: n }, () => v);

export const DEFAULT_CONFIG: OverlayConfig = {
  tierNames: ["Yokan", "Sensu", "Tomo", "Okami", "Danna", "Kami"],
  tierImages: Array.from({ length: TIER_COUNT }, () => ["", "", ""]),
  audioTiers: [false, false, true, true, true, true],
  audioColors: fill(TIER_COUNT, "#f8b8cc"),
  audioTexts: Array.from({ length: TIER_COUNT }, () => ({ top: "RP AUDIO", sub: "ASMR" })),
  cardShine: fill(TIER_COUNT, false),
  cardShineColor: fill(TIER_COUNT, "#ffb8cc"),
  cardBlur: fill(TIER_COUNT, false),
  cardBlurAmount: 8,
  textColor: "#ffffff",
  holdMs: 3400,
  breakMs: 1500,
  startDelayMs: 3000,
};

function pad<T>(arr: T[] | undefined, n: number, fallback: T): T[] {
  const out = (arr ?? []).slice(0, n);
  while (out.length < n) out.push(fallback);
  return out;
}

export function normalizeConfig(cfg: OverlayConfig): OverlayConfig {
  return {
    ...cfg,
    tierNames: pad(cfg.tierNames, TIER_COUNT, ""),
    tierImages: pad(cfg.tierImages, TIER_COUNT, ["", "", ""]).map((r) => pad(r, 3, "")),
    audioTiers: pad(cfg.audioTiers, TIER_COUNT, false),
    audioColors: pad(cfg.audioColors, TIER_COUNT, "#f8b8cc"),
    audioTexts: pad(cfg.audioTexts, TIER_COUNT, { top: "RP AUDIO", sub: "ASMR" }),
    cardShine: pad(cfg.cardShine, TIER_COUNT, false),
    cardShineColor: pad(cfg.cardShineColor, TIER_COUNT, "#ffb8cc"),
    cardBlur: pad(cfg.cardBlur, TIER_COUNT, false),
  };
}

export function buildOverlayHtml(template: string, rawCfg: OverlayConfig): string {
  const cfg = normalizeConfig(rawCfg);

  // 1) Inject user config on window early + invisible body to kill initial flash
  const configScript = `<script>window.__OVERLAY_CONFIG__=${JSON.stringify({
    tierNames: cfg.tierNames,
    tierImages: cfg.tierImages,
    audioTiers: cfg.audioTiers,
    audioColors: cfg.audioColors,
    audioTexts: cfg.audioTexts,
    cardShine: cfg.cardShine,
    cardShineColor: cfg.cardShineColor,
    cardBlur: cfg.cardBlur,
    cardBlurAmount: cfg.cardBlurAmount,
    holdMs: cfg.holdMs,
    breakMs: cfg.breakMs,
    startDelayMs: cfg.startDelayMs,
  })};</script>\n`;

  // Inline opacity:0 on <body> so the very first paint is empty — kills the
  // pre-script flicker where cards briefly appear before the start delay hides them.
  let out = template.replace("<body>", `<body style="opacity:0">\n${configScript}`);

  // 2) Inject overrides for names/images/audio just before the init line.
  //    Also push the 6th tier (Kami) into TIER_NAMES / TIERS / AUDIO_TIERS,
  //    reusing Danna's card slots as the visual fallback.
  const initMarker = "const CARD_BACK=CARD_BACKS[0];";
  const overrideBlock = `
// ===== user overrides injected by builder =====
try {
  // Make room for the 6th tier (Kami) using Danna's cards as a visual fallback.
  while (TIER_NAMES.length < 6) TIER_NAMES.push('Kami');
  while (TIERS.length < 6) TIERS.push(TIERS[TIERS.length-1].slice());

  const __o = window.__OVERLAY_CONFIG__ || {};
  if (__o.tierNames) __o.tierNames.forEach((n,i)=>{ if (n != null && TIER_NAMES[i] !== undefined) TIER_NAMES[i] = n; });
  if (__o.tierImages) __o.tierImages.forEach((row,t)=>{
    if (!TIERS[t]) return;
    row.forEach((src,s)=>{ if (src) TIERS[t][s] = src; });
  });
  if (__o.audioTiers) {
    AUDIO_TIERS.clear();
    __o.audioTiers.forEach((on,t)=>{ if (on) AUDIO_TIERS.add(t); });
  }
} catch (e) { console.warn('overlay overrides failed', e); }
// ===== end overrides =====
`;
  out = out.replace(initMarker, overrideBlock + initMarker);

  // 2b) Patch setAudioCard so it ALSO drives:
  //     - audio card bg = user-uploaded center image (darkened by #ac-overlay)
  //     - per-tier wave/mic color
  //     - per-tier "RP AUDIO" / "ASMR" text
  //     - per-tier outline glow (shine)
  //     - per-tier blur of all cards
  const audioPatchMarker = "const slots =[0,1,2].map";
  const audioPatch = `
// ===== per-tier audio/visual patch =====
try {
  const __cfg = () => (window.__OVERLAY_CONFIG__ || {});
  const __origSetAudio = setAudioCard;
  setAudioCard = function(tierIdx){
    __origSetAudio(tierIdx);
    const c = __cfg();

    // Audio-card background image override (user image)
    const bg = document.getElementById('ac-bg');
    if (bg && AUDIO_TIERS.has(tierIdx)) {
      const img = (TIERS[tierIdx]||[])[1];
      if (img) bg.style.backgroundImage = "url('"+img+"')";
    }

    // Per-tier wave/mic color
    const wf = document.getElementById('ac-wf');
    const ic = document.getElementById('ac-icon');
    const color = (c.audioColors||[])[tierIdx];
    if (color) {
      if (wf) wf.querySelectorAll('span').forEach(s => { s.style.background = color; });
      if (ic) {
        ic.style.stroke = color;
        ic.querySelectorAll('rect').forEach(r => { r.style.fill = color + '33'; });
      }
    }

    // Per-tier audio text
    const t = (c.audioTexts||[])[tierIdx];
    if (t) {
      const top = document.getElementById('ac-txt');
      const sub = document.getElementById('ac-sub');
      if (top && typeof t.top === 'string') top.textContent = t.top;
      if (sub && typeof t.sub === 'string') sub.textContent = t.sub;
    }

    // Per-tier outline glow (shine) on the audio card — outline only, no fill
    const ac = document.getElementById('audio-card');
    if (ac) {
      const on = !!(c.cardShine||[])[tierIdx] && AUDIO_TIERS.has(tierIdx);
      const sc = (c.cardShineColor||[])[tierIdx] || '#ffb8cc';
      ac.style.boxShadow = on
        ? ('0 0 18px 2px ' + sc + ', 0 0 36px 6px ' + sc + '88, inset 0 0 0 1.5px ' + sc)
        : '';
      ac.style.borderRadius = on ? '10px' : '';
    }

    // Per-tier blur of every card (front + back)
    const blurOn = !!(c.cardBlur||[])[tierIdx];
    const px = (c.cardBlurAmount != null ? c.cardBlurAmount : 8);
    const cardsEl = document.getElementById('cards');
    if (cardsEl) cardsEl.style.filter = blurOn ? ('blur(' + px + 'px)') : '';
  };
} catch (e) { console.warn('audio/visual patch failed', e); }
// ===== end patch =====
`;
  out = out.replace(audioPatchMarker, audioPatch + audioPatchMarker);

  // 3) Timing patches: per-tier hold, end-of-playthrough break, single playthrough,
  //    + reveal body after the start delay.
  out = out
    .replace(/await sleep\(3400\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.holdMs)||3400)`)
    .replace(/await sleep\(1500\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.breakMs)||1500)`)
    .replace(
      /while\s*\(\s*true\s*\)\s*\{/,
      "for (let __once=0; __once<1; __once++) { await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.startDelayMs)||3000); document.body.style.opacity='1';"
    );

  // 4) Color / sakura overrides. The right sakura now spins the SAME speed as
  //    the left (14s), just in the opposite direction.
  const colorCss = `
<style id="user-color-overrides">
  body { transition: opacity .35s ease-out; }
  #tier-text, #patreon-text, #ac-txt, #ac-sub { color: ${cfg.textColor} !important; }
  #psakura-r { animation-direction: reverse !important; animation-duration: 14s !important; }
</style>
</body>`;
  out = out.replace("</body>", colorCss);

  return out;
}

export function htmlToBlobUrl(html: string): string {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}
