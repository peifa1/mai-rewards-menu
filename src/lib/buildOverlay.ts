// Take the master overlay HTML template (a fully self-contained single file)
// and apply user customisations via targeted text replacement + script/style injection.

export type AudioText = { top: string; sub: string };

export type OverlayConfig = {
  tierNames: string[]; // dynamic length (min 1)
  tierImages: string[][]; // [tier][slot 0|1|2]
  audioTiers: boolean[];
  audioColors: string[];
  audioTexts: AudioText[];
  cardShine: boolean[];
  cardShineColor: string[];
  cardBlur: boolean[][]; // [tier][slot] — per-card blur
  cardBlurAmount: number;
  textColor: string;
  holdMs: number;
  breakMs: number;
  startDelayMs: number;
};

const DEFAULT_TIERS = ["Yokan", "Sensu", "Tomo", "Okami", "Danna", "Kami"];

const fill = <T,>(n: number, v: T): T[] => Array.from({ length: n }, () => v);

export const DEFAULT_CONFIG: OverlayConfig = {
  tierNames: [...DEFAULT_TIERS],
  tierImages: DEFAULT_TIERS.map(() => ["", "", ""]),
  audioTiers: [false, false, true, true, true, true],
  audioColors: fill(DEFAULT_TIERS.length, "#f8b8cc"),
  audioTexts: DEFAULT_TIERS.map(() => ({ top: "RP AUDIO", sub: "ASMR" })),
  cardShine: fill(DEFAULT_TIERS.length, false),
  cardShineColor: fill(DEFAULT_TIERS.length, "#ffb8cc"),
  cardBlur: DEFAULT_TIERS.map(() => [false, false, false]),
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
  const n = Math.max(1, (cfg.tierNames ?? DEFAULT_TIERS).length);
  // Migrate legacy boolean[] blur -> boolean[][]
  let blurInput: any = cfg.cardBlur;
  if (Array.isArray(blurInput) && blurInput.length && typeof blurInput[0] === "boolean") {
    blurInput = blurInput.map((b: boolean) => [b, b, b]);
  }
  return {
    ...cfg,
    tierNames: pad(cfg.tierNames, n, ""),
    tierImages: pad(cfg.tierImages, n, ["", "", ""]).map((r) => pad(r, 3, "")),
    audioTiers: pad(cfg.audioTiers, n, false),
    audioColors: pad(cfg.audioColors, n, "#f8b8cc"),
    audioTexts: pad(cfg.audioTexts, n, { top: "RP AUDIO", sub: "ASMR" }),
    cardShine: pad(cfg.cardShine, n, false),
    cardShineColor: pad(cfg.cardShineColor, n, "#ffb8cc"),
    cardBlur: pad(blurInput as boolean[][], n, [false, false, false]).map((r) =>
      pad(r, 3, false),
    ),
    cardBlurAmount: cfg.cardBlurAmount ?? 8,
  };
}

export function buildOverlayHtml(template: string, rawCfg: OverlayConfig): string {
  const cfg = normalizeConfig(rawCfg);
  const N = cfg.tierNames.length;

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
    tierCount: N,
    holdMs: cfg.holdMs,
    breakMs: cfg.breakMs,
    startDelayMs: cfg.startDelayMs,
  })};</script>\n`;

  // Invisible body kills the pre-script flicker.
  let out = template.replace("<body>", `<body style="opacity:0">\n${configScript}`);

  // 1b) Inject a script BEFORE the main <script> to add many more petals
  //     with randomized delays/durations/positions so the fall looks continuous,
  //     not "chunky". Runs before the main script's origDelay snapshot.
  const petalGen = `<script>
(function(){
  try {
    var box = document.getElementById('petals');
    if (!box) return;
    var existing = box.querySelectorAll('.petal');
    if (!existing.length) return;
    // Re-randomize the originals so they don't all share the same hand-picked
    // delays/positions (which causes visible "chunks").
    existing.forEach(function(p){
      var dur = 9 + Math.random()*7;
      p.style.setProperty('--dur', dur.toFixed(2)+'s');
      p.style.setProperty('--delay', (Math.random()*dur).toFixed(2)+'s');
      p.style.setProperty('--x', (Math.random()*100).toFixed(1)+'%');
    });
    var TOTAL = 32; // total petals on screen
    var tpl = existing[0];
    for (var i = existing.length; i < TOTAL; i++) {
      var p = tpl.cloneNode();
      var size = 16 + Math.random()*18;
      var dur  = 9 + Math.random()*7;          // 9–16s
      var delay = Math.random()*dur;            // uniformly spread across cycle
      var r0 = (Math.random()*120 - 60);
      var r1 = r0 + 160 + Math.random()*140;
      var dx = (Math.random()*44 - 22);
      p.style.setProperty('--x', (Math.random()*100).toFixed(1)+'%');
      p.style.setProperty('--size', size.toFixed(1)+'px');
      p.style.setProperty('--dur', dur.toFixed(2)+'s');
      p.style.setProperty('--delay', delay.toFixed(2)+'s');
      p.style.setProperty('--r0', r0.toFixed(1)+'deg');
      p.style.setProperty('--r1', r1.toFixed(1)+'deg');
      p.style.setProperty('--dx', dx.toFixed(1)+'px');
      box.appendChild(p);
    }
  } catch(e) { console.warn('petal seeding failed', e); }
})();
</script>
<script>`;
  out = out.replace("<script>", petalGen);

  // 2) Inject overrides for names/images/audio just before the init line.
  //    Dynamically size TIER_NAMES / TIERS / AUDIO_TIERS to the user's tier count.
  const initMarker = "const CARD_BACK=CARD_BACKS[0];";
  const overrideBlock = `
// ===== user overrides injected by builder =====
try {
  const __o = window.__OVERLAY_CONFIG__ || {};
  const __N = __o.tierCount || TIER_NAMES.length;
  // Grow arrays as needed (clone last tier's slots as visual fallback for new tiers).
  while (TIER_NAMES.length < __N) TIER_NAMES.push('New Tier');
  while (TIERS.length < __N) TIERS.push((TIERS[TIERS.length-1]||['','','']).slice());
  // Shrink if user removed tiers.
  TIER_NAMES.length = __N;
  TIERS.length = __N;

  if (__o.tierNames) __o.tierNames.forEach((n,i)=>{ if (n != null && i < __N) TIER_NAMES[i] = n; });
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

  // 2b) Patch setAudioCard so it ALSO drives per-tier audio visuals + per-card blur.
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

    // Per-tier outline glow (shine) on the audio card
    const ac = document.getElementById('audio-card');
    if (ac) {
      const on = !!(c.cardShine||[])[tierIdx] && AUDIO_TIERS.has(tierIdx);
      const sc = (c.cardShineColor||[])[tierIdx] || '#ffb8cc';
      ac.style.boxShadow = on
        ? ('0 0 18px 2px ' + sc + ', 0 0 36px 6px ' + sc + '88, inset 0 0 0 1.5px ' + sc)
        : '';
      ac.style.borderRadius = on ? '10px' : '';
    }

    // Per-card blur — front face only, so the back stays crisp during flip.
    // After every swap, the engine normalizes curFace back to 'front', so we
    // only need to drive front imgs + their reflection counterparts.
    const blurRow = (c.cardBlur||[])[tierIdx] || [false,false,false];
    const px = (c.cardBlurAmount != null ? c.cardBlurAmount : 8);
    for (var __i=0; __i<3; __i++) {
      var f  = document.getElementById('f'+__i);
      var rf = document.getElementById('rf'+__i);
      var val = blurRow[__i] ? ('blur(' + px + 'px)') : '';
      if (f)  f.style.filter  = val;
      if (rf) rf.style.filter = val;
    }
    // Always keep backs unblurred so flips look clean.
    for (var __j=0; __j<3; __j++) {
      var b  = document.getElementById('b'+__j);
      var rb = document.getElementById('rb'+__j);
      if (b)  b.style.filter  = '';
      if (rb) rb.style.filter = '';
    }
    // Make sure the parent container has no global blur lingering from older builds.
    var cardsEl = document.getElementById('cards');
    if (cardsEl) cardsEl.style.filter = '';
  };
} catch (e) { console.warn('audio/visual patch failed', e); }
// ===== end patch =====
`;
  out = out.replace(audioPatchMarker, audioPatch + audioPatchMarker);

  // 3) Timing patches: per-tier hold, end-of-playthrough break, single playthrough.
  out = out
    .replace(/await sleep\(3400\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.holdMs)||3400)`)
    .replace(/await sleep\(1500\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.breakMs)||1500)`)
    .replace(
      /while\s*\(\s*true\s*\)\s*\{/,
      "for (let __once=0; __once<1; __once++) { await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.startDelayMs)||3000); document.body.style.opacity='1';"
    );

  // 4) Color / sakura overrides + smooth blur transition on faces.
  const colorCss = `
<style id="user-color-overrides">
  body { transition: opacity .35s ease-out; }
  #tier-text, #patreon-text, #ac-txt, #ac-sub { color: ${cfg.textColor} !important; }
  #psakura-r { animation-direction: reverse !important; animation-duration: 14s !important; }
  .face img, #reflection .face img { transition: filter .35s ease; }
</style>
</body>`;
  out = out.replace("</body>", colorCss);

  return out;
}

export function htmlToBlobUrl(html: string): string {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}
