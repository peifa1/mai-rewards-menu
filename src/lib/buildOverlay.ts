// Take the master overlay HTML template (a fully self-contained single file)
// and apply user customisations via targeted text replacement + script/style injection.

export type AudioText = { top: string; sub: string };

const DEFAULT_AUDIO_TEXT: AudioText = { top: "RP AUDIO", sub: "ASMR" };
const DEFAULT_AUDIO_COLOR = "#f8b8cc";

export type OverlayConfig = {
  tierNames: string[]; // dynamic length (min 1)
  tierImages: string[][]; // [tier][slot 0|1|2]
  audioSlots: boolean[][]; // [tier][slot] — which slots show the audio card
  audioColors: string[][]; // [tier][slot] — wave/mic color per slot
  audioTexts: AudioText[][]; // [tier][slot] — top/sub text per slot
  cardShineSlots: boolean[][]; // [tier][slot] — which slots get the outline shine
  cardShineColor: string[];
  cardBlur: boolean[][]; // [tier][slot] — per-card blur
  cardBlurAmount: number;
  textColor: string;
  showPetals: boolean;
  holdMs: number;
  breakMs: number;
  startDelayMs: number;
};

const DEFAULT_TIERS = ["Yokan", "Sensu", "Tomo", "Okami", "Danna", "Kami"];

const fill = <T,>(n: number, v: T): T[] => Array.from({ length: n }, () => v);
const fillSlot = <T,>(n: number, v: T): T[][] => Array.from({ length: n }, () => [v, v, v] as T[]);

export const DEFAULT_CONFIG: OverlayConfig = {
  tierNames: [...DEFAULT_TIERS],
  tierImages: DEFAULT_TIERS.map(() => ["", "", ""]),
  // Center-slot audio on for Tomo/Okami/Danna/Kami (matches the original template).
  audioSlots: [false, false, true, true, true, true].map((v) => [false, v, false]),
  audioColors: fillSlot(DEFAULT_TIERS.length, DEFAULT_AUDIO_COLOR),
  audioTexts: fillSlot(DEFAULT_TIERS.length, DEFAULT_AUDIO_TEXT),
  cardShineSlots: DEFAULT_TIERS.map(() => [false, false, false]),
  cardShineColor: fill(DEFAULT_TIERS.length, "#ffb8cc"),
  cardBlur: DEFAULT_TIERS.map(() => [false, false, false]),
  cardBlurAmount: 8,
  textColor: "#ffffff",
  showPetals: true,
  holdMs: 3400,
  breakMs: 1500,
  startDelayMs: 3000,
};

function pad<T>(arr: T[] | undefined, n: number, fallback: T): T[] {
  const out = (arr ?? []).slice(0, n);
  while (out.length < n) out.push(typeof fallback === "object" ? JSON.parse(JSON.stringify(fallback)) : fallback);
  return out;
}

export function normalizeConfig(cfg: OverlayConfig): OverlayConfig {
  const n = Math.max(1, (cfg.tierNames ?? DEFAULT_TIERS).length);
  const legacy = cfg as any;

  // Migrate legacy boolean[] blur -> boolean[][]
  let blurInput: any = cfg.cardBlur;
  if (Array.isArray(blurInput) && blurInput.length && typeof blurInput[0] === "boolean") {
    blurInput = blurInput.map((b: boolean) => [b, b, b]);
  }

  // Migrate legacy per-tier audio/shine booleans -> per-slot [L,C,R] (were center-only).
  let audioInput: any = cfg.audioSlots;
  if (!audioInput && Array.isArray(legacy.audioTiers)) {
    audioInput = legacy.audioTiers.map((b: boolean) => [false, !!b, false]);
  }
  let shineInput: any = cfg.cardShineSlots;
  if (!shineInput && Array.isArray(legacy.cardShine)) {
    shineInput = legacy.cardShine.map((b: boolean) => [false, !!b, false]);
  }

  // Migrate per-tier string[] audioColors -> per-slot string[][]
  let colorsInput: any = cfg.audioColors;
  if (Array.isArray(colorsInput) && colorsInput.length && typeof colorsInput[0] === "string") {
    colorsInput = colorsInput.map((c: string) => [c, c, c]);
  }

  // Migrate per-tier AudioText[] audioTexts -> per-slot AudioText[][]
  let textsInput: any = cfg.audioTexts;
  if (Array.isArray(textsInput) && textsInput.length && !Array.isArray(textsInput[0])) {
    textsInput = textsInput.map((t: AudioText) => [t, { ...t }, { ...t }]);
  }

  return {
    ...cfg,
    tierNames: pad(cfg.tierNames, n, ""),
    tierImages: pad(cfg.tierImages, n, ["", "", ""]).map((r) => pad(r, 3, "")),
    audioSlots: pad(audioInput as boolean[][], n, [false, false, false]).map((r) =>
      pad(r, 3, false),
    ),
    audioColors: pad(colorsInput as string[][], n, [DEFAULT_AUDIO_COLOR, DEFAULT_AUDIO_COLOR, DEFAULT_AUDIO_COLOR]).map((r) =>
      pad(r, 3, DEFAULT_AUDIO_COLOR),
    ),
    audioTexts: pad(textsInput as AudioText[][], n, [DEFAULT_AUDIO_TEXT, DEFAULT_AUDIO_TEXT, DEFAULT_AUDIO_TEXT]).map((r) =>
      pad(r, 3, DEFAULT_AUDIO_TEXT),
    ),
    cardShineSlots: pad(shineInput as boolean[][], n, [false, false, false]).map((r) =>
      pad(r, 3, false),
    ),
    cardShineColor: pad(cfg.cardShineColor, n, "#ffb8cc"),
    cardBlur: pad(blurInput as boolean[][], n, [false, false, false]).map((r) =>
      pad(r, 3, false),
    ),
    cardBlurAmount: cfg.cardBlurAmount ?? 8,
    showPetals: cfg.showPetals ?? true,
  };
}

export function buildOverlayHtml(template: string, rawCfg: OverlayConfig): string {
  const cfg = normalizeConfig(rawCfg);
  const N = cfg.tierNames.length;

  // 1) Inject user config on window early + invisible body to kill initial flash
  const configScript = `<script>window.__OVERLAY_CONFIG__=${JSON.stringify({
    tierNames: cfg.tierNames,
    tierImages: cfg.tierImages,
    audioSlots: cfg.audioSlots,
    audioColors: cfg.audioColors,
    audioTexts: cfg.audioTexts,
    cardShineSlots: cfg.cardShineSlots,
    cardShineColor: cfg.cardShineColor,
    cardBlur: cfg.cardBlur,
    cardBlurAmount: cfg.cardBlurAmount,
    tierCount: N,
    holdMs: cfg.holdMs,
    breakMs: cfg.breakMs,
    startDelayMs: cfg.startDelayMs,
    showPetals: cfg.showPetals,
  })};</script>\n`;

  // Invisible body kills the pre-script flicker.
  let out = template.replace("<body>", `<body style="opacity:0">\n${configScript}`);

  // 1b) Petal seeding is done inside overrideBlock below (inside the main script,
  //     where the DOM is guaranteed ready). The old approach of replacing the first
  //     "<script>" tag hit the injected configScript, not the template's main script.

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
  // Audio slots are driven entirely by the per-slot patch below (setAudioCard is replaced).
} catch (e) { console.warn('overlay overrides failed', e); }

// ===== petal rain setup =====
if ((window.__OVERLAY_CONFIG__||{}).showPetals !== false) {
// Positive staggered delays: petals start one by one from the top when enter() fires.
// enter() calls animationPlayState='running' — petal i waits (i/TOTAL)*DUR seconds before
// its first fall, so they cascade in sequentially rather than all appearing mid-screen.
// exit() already handles the outro: snapshots each petal's progress, sets iterationCount=1
// so every petal finishes its current fall naturally with no new cycles starting.
try {
  (function(){
    var box = document.getElementById('petals');
    if (!box) return;
    var existing = Array.from(box.querySelectorAll('.petal'));
    if (!existing.length) return;
    var TOTAL = 8;
    var DUR   = 12; // fixed duration keeps spacing perfectly uniform
    var tpl   = existing[0];
    // Grow to TOTAL
    while (existing.length < TOTAL) {
      var c = tpl.cloneNode(false);
      box.appendChild(c);
      existing.push(c);
    }
    // Trim extras (template ships with 6; we want exactly TOTAL)
    while (existing.length > TOTAL) {
      var extra = existing.pop();
      if (extra.parentNode) extra.parentNode.removeChild(extra);
    }
    // Assign each petal a unique evenly-spaced positive delay + random visuals.
    // Positive delay = petal starts from the top after that many seconds, one by one.
    existing.forEach(function(p, i) {
      var dur   = DUR * (0.88 + Math.random() * 0.24); // ~10.6–13.4s slight variation
      var delay = (i / TOTAL) * DUR;                   // 0, 0.8, 1.6 ... 11.2s stagger
      var size  = 16 + Math.random() * 18;
      var r0    = Math.random() * 120 - 60;
      var r1    = r0 + 160 + Math.random() * 140;
      var dx    = Math.random() * 44 - 22;
      p.style.setProperty('--x',    (Math.random() * 100).toFixed(1) + '%');
      p.style.setProperty('--size', size.toFixed(1) + 'px');
      p.style.setProperty('--dur',  dur.toFixed(2)  + 's');
      p.style.setProperty('--delay', delay.toFixed(2) + 's');
      p.style.setProperty('--r0',   r0.toFixed(1)   + 'deg');
      p.style.setProperty('--r1',   r1.toFixed(1)   + 'deg');
      p.style.setProperty('--dx',   dx.toFixed(1)   + 'px');
      // Leave animationPlayState paused — enter() will start them.
    });
  })();
} catch(e) { console.warn('petal seeding failed', e); }
} // end showPetals
// ===== end petal rain =====
// ===== end overrides =====
`;
  out = out.replace(initMarker, overrideBlock + initMarker);

  // 2b) Replace setAudioCard so the audio card + shine can live on ANY slot
  //     (left / center / right), not just the center. The template only ships a
  //     single center audio card, so we clone it into the side slots on demand.
  const audioPatchMarker = "const slots =[0,1,2].map";
  const audioPatch = `
// ===== per-slot audio / shine patch =====
try {
  const __cfg = () => (window.__OVERLAY_CONFIG__ || {});

  // Class-based mirror of all audio-card id-based CSS so cloned cards style up correctly.
  (function(){
    var st = document.createElement('style');
    st.textContent = ''
      + '.audio-card{display:none;position:absolute;inset:0;width:80px;height:112px;overflow:hidden;}'
      + '.audio-card.active{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;}'
      + '.audio-card .ac-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:brightness(0.28) saturate(0.85);z-index:0;}'
      + '.audio-card .ac-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.15) 40%,rgba(0,0,0,0.55) 100%);z-index:1;}'
      + '.audio-card .ac-icon{width:26px;height:26px;position:relative;z-index:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));}'
      + '.audio-card .ac-wf{display:flex;align-items:center;gap:2px;height:22px;position:relative;z-index:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));}'
      + '.audio-card .ac-wf span{width:2px;border-radius:2px;background:linear-gradient(180deg,#f8b8cc,#c8647a);animation:acwave 0.9s ease-in-out infinite;}'
      + '.audio-card .ac-wf span:nth-child(1){animation-delay:0s;height:5px}'
      + '.audio-card .ac-wf span:nth-child(2){animation-delay:.1s;height:11px}'
      + '.audio-card .ac-wf span:nth-child(3){animation-delay:.2s;height:8px}'
      + '.audio-card .ac-wf span:nth-child(4){animation-delay:.3s;height:18px}'
      + '.audio-card .ac-wf span:nth-child(5){animation-delay:.15s;height:13px}'
      + '.audio-card .ac-wf span:nth-child(6){animation-delay:.05s;height:22px}'
      + '.audio-card .ac-wf span:nth-child(7){animation-delay:.25s;height:15px}'
      + '.audio-card .ac-wf span:nth-child(8){animation-delay:.35s;height:9px}'
      + '.audio-card .ac-wf span:nth-child(9){animation-delay:.1s;height:19px}'
      + '.audio-card .ac-wf span:nth-child(10){animation-delay:.2s;height:7px}'
      + '.audio-card .ac-wf span:nth-child(11){animation-delay:.3s;height:14px}'
      + '.audio-card .ac-wf span:nth-child(12){animation-delay:.15s;height:10px}'
      + '.audio-card .ac-txt{font-family:\\'HakkouMincho\\',serif;font-size:8px;color:#fff;letter-spacing:3px;text-transform:uppercase;font-weight:bold;position:relative;z-index:2;text-shadow:0 1px 3px rgba(0,0,0,0.9),0 0 6px rgba(248,150,190,0.5);}'
      + '.audio-card .ac-sub{font-family:\\'HakkouMincho\\',serif;font-size:6px;color:rgba(255,210,225,0.85);letter-spacing:3px;position:relative;z-index:2;text-shadow:0 1px 2px rgba(0,0,0,0.9);}'
      // Prestige glint — diagonal light sweep over the card face.
      // The .face already has overflow:hidden so the sweep is clipped to the card.
      + '.card-glint::after{'
      + 'content:"";position:absolute;inset:0;pointer-events:none;z-index:8;'
      + 'background:linear-gradient(108deg,transparent 30%,rgba(255,255,255,0.06) 42%,rgba(255,255,255,0.28) 50%,rgba(255,255,255,0.06) 58%,transparent 70%);'
      + 'transform:translateX(-160%) skewX(-18deg);'
      + 'animation:cardGlint var(--glint-dur,3.6s) ease-in-out infinite;'
      + 'animation-delay:var(--glint-delay,0s);'
      + '}'
      + '@keyframes cardGlint{'
      + '0%{transform:translateX(-160%) skewX(-18deg)}'
      + '100%{transform:translateX(260%) skewX(-18deg)}'
      + '}';
    document.head.appendChild(st);
  })();

  const __slotFront = (s) => {
    const slot = document.getElementById('s'+s);
    return slot ? slot.querySelector('.face.front') : null;
  };

  // Give the center card classes so selectors work, then clone it into the L/R slots once.
  const __audioNodes = [null,null,null];
  (function(){
    const center = document.getElementById('audio-card');
    if (center) {
      center.classList.add('audio-card');
      ['ac-bg','ac-overlay','ac-icon','ac-wf','ac-txt','ac-sub'].forEach(function(cls){
        const el = center.querySelector('#'+cls);
        if (el) el.classList.add(cls);
      });
      __audioNodes[1] = center;
      [0,2].forEach(function(s){
        const front = __slotFront(s);
        if (!front) return;
        const clone = center.cloneNode(true);
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach(function(el){ el.removeAttribute('id'); });
        clone.classList.remove('active');
        front.appendChild(clone);
        __audioNodes[s] = clone;
      });
    }
  })();

  setAudioCard = function(tierIdx){
    const c = __cfg();
    const audioRow  = (c.audioSlots||[])[tierIdx]  || [false,false,false];
    const shineRow  = (c.cardShineSlots||[])[tierIdx] || [false,false,false];
    const colorRow  = (c.audioColors||[])[tierIdx] || [];
    const txtRow    = (c.audioTexts||[])[tierIdx]  || [];

    for (var s=0; s<3; s++) {
      const node   = __audioNodes[s];
      const img    = document.getElementById('f'+s);
      const audioOn = !!audioRow[s];
      const color  = colorRow[s] || '#f8b8cc';
      const txt    = txtRow[s]   || {};

      if (node) {
        if (audioOn) {
          node.classList.add('active');
          if (img) img.style.display = 'none';

          // Background image from user's card image for this slot
          const bg  = node.querySelector('.ac-bg');
          const src = (TIERS[tierIdx]||[])[s];
          if (bg && src) bg.style.backgroundImage = "url('"+src+"')";

          // Per-slot wave/mic color
          node.querySelectorAll('.ac-wf span').forEach(function(sp){ sp.style.background = color; });
          const ic = node.querySelector('.ac-icon');
          if (ic) {
            ic.style.stroke = color;
            ic.querySelectorAll('rect').forEach(function(r){ r.style.fill = color + '33'; });
          }

          // Per-slot text
          const topEl = node.querySelector('.ac-txt');
          const subEl = node.querySelector('.ac-sub');
          if (topEl && typeof txt.top === 'string') topEl.textContent = txt.top;
          if (subEl && typeof txt.sub === 'string') subEl.textContent = txt.sub;
        } else {
          node.classList.remove('active');
          if (img) img.style.display = '';
        }
      }

      // Per-slot prestige glint — diagonal light sweep over the card face.
      // Slots are staggered so they don't all flash at the same time.
      const front = __slotFront(s);
      if (front) {
        if (shineRow[s]) {
          front.classList.add('card-glint');
          front.style.setProperty('--glint-delay', (s * 1.1).toFixed(1) + 's');
          front.style.setProperty('--glint-dur', '3.6s');
        } else {
          front.classList.remove('card-glint');
          front.style.removeProperty('--glint-delay');
          front.style.removeProperty('--glint-dur');
        }
      }
    }

    // Per-card blur — front face only, so the back stays crisp during flip.
    const blurRow = (c.cardBlur||[])[tierIdx] || [false,false,false];
    const px = (c.cardBlurAmount != null ? c.cardBlurAmount : 8);
    for (var __i=0; __i<3; __i++) {
      var f  = document.getElementById('f'+__i);
      var rf = document.getElementById('rf'+__i);
      var val = blurRow[__i] ? ('blur(' + px + 'px)') : '';
      if (f)  f.style.filter  = val;
      if (rf) rf.style.filter = val;
    }
    for (var __j=0; __j<3; __j++) {
      var b  = document.getElementById('b'+__j);
      var rb = document.getElementById('rb'+__j);
      if (b)  b.style.filter  = '';
      if (rb) rb.style.filter = '';
    }
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
    )
    // Fix exit() petal elapsed: original formula assumed negative delays (pre-seeded);
    // staggered positive delays require Web Animations API currentTime for accuracy.
    .replace(
      `    const elapsed = (performance.now() - delay + dur*100) % dur;\n    const remaining = dur - elapsed;\n    // Switch to exactly 1 more iteration from current point using a fresh delay trick:\n    // Keep current timing but stop after this iteration\n    p.style.animationIterationCount = '1';\n    // Rewind to current position by setting a negative delay\n    p.style.animationDelay = \`-\${elapsed}ms\`;`,
      `    const _wa = p.getAnimations ? p.getAnimations()[0] : null;\n    const _ct = _wa ? (_wa.currentTime || 0) : null;\n    const elapsed = _ct != null ? Math.max(0, _ct - Math.max(0, delay)) % dur : (performance.now() - delay + dur*100) % dur;\n    p.style.animationIterationCount = '1';\n    p.style.animationDelay = '-' + Math.round(elapsed) + 'ms';`
    );

  // 4) Color / sakura overrides + smooth blur transition on faces.
  //    Cover both #id (center audio card) and .class (cloned side cards) for text color.
  const colorCss = `
<style id="user-color-overrides">
  body { transition: opacity .35s ease-out; }
  #tier-text, #patreon-text, #ac-txt, .ac-txt, #ac-sub, .ac-sub { color: ${cfg.textColor} !important; }
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
