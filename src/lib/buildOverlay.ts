// Take the master overlay HTML template (a fully self-contained single file)
// and apply user customisations via targeted text replacement + script/style injection.
// The template's own animations / fonts / images remain untouched — we only
// override values that the editor exposes (tier names, per-slot images,
// audio-card on/off per tier, and a few colors).

export type OverlayConfig = {
  tierNames: string[]; // length 5
  // tierImages[tier][slot 0|1|2] = data URL or empty string ("" = keep original)
  tierImages: string[][];
  // audioTiers[t] = true means the center card on that tier shows the audio effect
  audioTiers: boolean[];
  cardBackColor: string;
  audioCardColor: string;
  textColor: string;
  audioWaveColor: string;
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
  cardBackColor: "#4a0c22",
  audioCardColor: "#2a0712",
  textColor: "#ffffff",
  audioWaveColor: "#f8b8cc",
};

function jsonStringSafe(s: string) {
  // Escape for embedding inside a JS string literal in injected <script>
  return JSON.stringify(s);
}

export function buildOverlayHtml(template: string, cfg: OverlayConfig): string {
  // 1) Inject a script EARLY (at start of body) that exposes the user config on window.
  const configScript = `<script>window.__OVERLAY_CONFIG__=${JSON.stringify({
    tierNames: cfg.tierNames,
    tierImages: cfg.tierImages,
    audioTiers: cfg.audioTiers,
  })};</script>\n`;

  let out = template.replace("<body>", "<body>\n" + configScript);

  // 2) Inject override code INSIDE the original script, after the const TIERS/
  //    TIER_NAMES/AUDIO_TIERS declarations and BEFORE the init code that pushes
  //    initial images & names into the DOM. The init begins with
  //    `const CARD_BACK=CARD_BACKS[0];` — insert immediately before that.
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

  // 3) Inject color CSS overrides just before </body>
  const colorCss = `
<style id="user-color-overrides">
  .face.back { background: ${cfg.cardBackColor} !important; }
  .face.back img { display: none !important; }
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

void jsonStringSafe; // keep for future use, avoid unused warning
