// Take the master overlay HTML template (a fully self-contained single file)
// and apply user customisations via targeted text replacement + script/style injection.

export type OverlayConfig = {
  tierNames: string[]; // length 5
  tierImages: string[][]; // [tier][slot 0|1|2] data URL or "" (keep original)
  audioTiers: boolean[];
  audioCardColor: string;
  textColor: string;
  audioWaveColor: string;
  // Timing
  holdMs: number;   // how long each tier is shown before flipping to the next
  breakMs: number;  // empty/pause time between full animation loops (ms)
};

export const DEFAULT_CONFIG: OverlayConfig = {
  tierNames: ["Yokan", "Sensu", "Tomo", "Okami", "Danna"],
  tierImages: [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ],
  audioTiers: [false, false, true, true, true],
  audioCardColor: "#2a0712",
  textColor: "#ffffff",
  audioWaveColor: "#f8b8cc",
  holdMs: 3400,
  breakMs: 1500,
};

export function buildOverlayHtml(template: string, cfg: OverlayConfig): string {
  // 1) Inject user config on window early
  const configScript = `<script>window.__OVERLAY_CONFIG__=${JSON.stringify({
    tierNames: cfg.tierNames,
    tierImages: cfg.tierImages,
    audioTiers: cfg.audioTiers,
    holdMs: cfg.holdMs,
    breakMs: cfg.breakMs,
  })};</script>\n`;

  let out = template.replace("<body>", "<body>\n" + configScript);

  // 2) Inject overrides for names/images/audio just before the init line
  const initMarker = "const CARD_BACK=CARD_BACKS[0];";
  const overrideBlock = `
// ===== user overrides injected by builder =====
try {
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

  // 3) Patch timing: hold-per-tier (3400ms) and end-of-loop break (1500ms).
  //    Use global regex replace so both `await sleep(3400)` calls swap.
  out = out
    .replace(/await sleep\(3400\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.holdMs)||3400)`)
    .replace(/await sleep\(1500\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.breakMs)||1500)`);

  // 4) Color overrides — keep the original card-back artwork; only theme the audio card + text.
  const colorCss = `
<style id="user-color-overrides">
  #tier-text, #patreon-text, #ac-txt, #ac-sub { color: ${cfg.textColor} !important; }
  #audio-card { background: ${cfg.audioCardColor} !important; }
  #audio-card #ac-bg { display: none !important; }
  #audio-card #ac-overlay { background: linear-gradient(180deg, rgba(0,0,0,0.30), rgba(0,0,0,0.55)) !important; }
  #ac-wf span { background: ${cfg.audioWaveColor} !important; }
  #ac-icon { stroke: ${cfg.audioWaveColor} !important; }
  #ac-icon rect { fill: ${cfg.audioWaveColor}33 !important; }
</style>
</body>`;
  out = out.replace("</body>", colorCss);

  return out;
}

export function htmlToBlobUrl(html: string): string {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}
