import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { s as supabase } from "./client-HsaAFVBu.mjs";
import { t as toPng } from "../_libs/html-to-image.mjs";
import { J as JSZip } from "../_libs/jszip.mjs";
import { A as ArrowUp, a as ArrowDown, I as ImagePlus, P as Plus, M as Mic, T as Trash2, b as AudioLines, c as Move } from "../_libs/lucide-react.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/readable-stream.mjs";
import "events";
import "node:string_decoder";
import "stream";
import "../_libs/process-nextick-args.mjs";
import "../_libs/isarray.mjs";
import "../_libs/safe-buffer.mjs";
import "buffer";
import "../_libs/core-util-is.mjs";
import "../_libs/inherits.mjs";
import "util";
import "../_libs/util-deprecate.mjs";
import "../_libs/lie.mjs";
import "../_libs/immediate.mjs";
import "../_libs/setimmediate.mjs";
import "../_libs/pako.mjs";
const DEFAULT_AUDIO_TEXT = { top: "RP AUDIO", sub: "ASMR" };
const DEFAULT_AUDIO_COLOR = "#f8b8cc";
const DEFAULT_TIERS = ["Yokan", "Sensu", "Tomo", "Okami", "Danna", "Kami"];
const fill = (n, v) => Array.from({ length: n }, () => v);
const fillSlot = (n, v) => Array.from({ length: n }, () => [v, v, v]);
const DEFAULT_CONFIG = {
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
  startDelayMs: 3e3
};
function pad(arr, n, fallback) {
  const out = (arr ?? []).slice(0, n);
  while (out.length < n) out.push(typeof fallback === "object" ? JSON.parse(JSON.stringify(fallback)) : fallback);
  return out;
}
function normalizeConfig(cfg) {
  const n = Math.max(1, (cfg.tierNames ?? DEFAULT_TIERS).length);
  const legacy = cfg;
  let blurInput = cfg.cardBlur;
  if (Array.isArray(blurInput) && blurInput.length && typeof blurInput[0] === "boolean") {
    blurInput = blurInput.map((b) => [b, b, b]);
  }
  let audioInput = cfg.audioSlots;
  if (!audioInput && Array.isArray(legacy.audioTiers)) {
    audioInput = legacy.audioTiers.map((b) => [false, !!b, false]);
  }
  let shineInput = cfg.cardShineSlots;
  if (!shineInput && Array.isArray(legacy.cardShine)) {
    shineInput = legacy.cardShine.map((b) => [false, !!b, false]);
  }
  let colorsInput = cfg.audioColors;
  if (Array.isArray(colorsInput) && colorsInput.length && typeof colorsInput[0] === "string") {
    colorsInput = colorsInput.map((c) => [c, c, c]);
  }
  let textsInput = cfg.audioTexts;
  if (Array.isArray(textsInput) && textsInput.length && !Array.isArray(textsInput[0])) {
    textsInput = textsInput.map((t) => [t, { ...t }, { ...t }]);
  }
  return {
    ...cfg,
    tierNames: pad(cfg.tierNames, n, ""),
    tierImages: pad(cfg.tierImages, n, ["", "", ""]).map((r) => pad(r, 3, "")),
    audioSlots: pad(audioInput, n, [false, false, false]).map(
      (r) => pad(r, 3, false)
    ),
    audioColors: pad(colorsInput, n, [DEFAULT_AUDIO_COLOR, DEFAULT_AUDIO_COLOR, DEFAULT_AUDIO_COLOR]).map(
      (r) => pad(r, 3, DEFAULT_AUDIO_COLOR)
    ),
    audioTexts: pad(textsInput, n, [DEFAULT_AUDIO_TEXT, DEFAULT_AUDIO_TEXT, DEFAULT_AUDIO_TEXT]).map(
      (r) => pad(r, 3, DEFAULT_AUDIO_TEXT)
    ),
    cardShineSlots: pad(shineInput, n, [false, false, false]).map(
      (r) => pad(r, 3, false)
    ),
    cardShineColor: pad(cfg.cardShineColor, n, "#ffb8cc"),
    cardBlur: pad(blurInput, n, [false, false, false]).map(
      (r) => pad(r, 3, false)
    ),
    cardBlurAmount: cfg.cardBlurAmount ?? 8,
    showPetals: cfg.showPetals ?? true
  };
}
function buildOverlayHtml(template, rawCfg) {
  const cfg = normalizeConfig(rawCfg);
  const N = cfg.tierNames.length;
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
    showPetals: cfg.showPetals
  })};<\/script>
`;
  let out = template.replace("<body>", `<body style="opacity:0">
${configScript}`);
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
} else {
  var _pb = document.getElementById('petals');
  if (_pb) _pb.style.display = 'none';
} // end showPetals
// ===== end petal rain =====
// ===== end overrides =====
`;
  out = out.replace(initMarker, overrideBlock + initMarker);
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
  out = out.replace(/await sleep\(3400\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.holdMs)||3400)`).replace(/await sleep\(1500\)/g, `await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.breakMs)||1500)`).replace(
    /while\s*\(\s*true\s*\)\s*\{/,
    "for (let __once=0; __once<1; __once++) { await sleep((window.__OVERLAY_CONFIG__&&window.__OVERLAY_CONFIG__.startDelayMs)||3000); document.body.style.opacity='1';"
  ).replace(
    `  petels.style.opacity='0';
  petels.style.display='';`,
    `  petels.style.opacity='0';
  petels.style.display=(window.__OVERLAY_CONFIG__||{}).showPetals===false?'none':'';`
  ).replace(
    `  document.querySelectorAll('.petal').forEach(p=>{ p.style.animationPlayState='running'; });
  animate(2200, p=>{
    petels.style.opacity = String(easeOutCubic(p));
  });`,
    `  if((window.__OVERLAY_CONFIG__||{}).showPetals!==false){document.querySelectorAll('.petal').forEach(p=>{ p.style.animationPlayState='running'; });animate(2200, p=>{petels.style.opacity = String(easeOutCubic(p));});}`
  ).replace(
    `    const elapsed = (performance.now() - delay + dur*100) % dur;
    const remaining = dur - elapsed;
    // Switch to exactly 1 more iteration from current point using a fresh delay trick:
    // Keep current timing but stop after this iteration
    p.style.animationIterationCount = '1';
    // Rewind to current position by setting a negative delay
    p.style.animationDelay = \`-\${elapsed}ms\`;`,
    `    const _wa = p.getAnimations ? p.getAnimations()[0] : null;
    const _ct = _wa ? (_wa.currentTime || 0) : null;
    const elapsed = _ct != null ? Math.max(0, _ct - Math.max(0, delay)) % dur : (performance.now() - delay + dur*100) % dur;
    p.style.animationIterationCount = '1';
    p.style.animationDelay = '-' + Math.round(elapsed) + 'ms';`
  );
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
function htmlToBlobUrl(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}
let cached$1 = null;
let pending$2 = null;
async function loadOverlayTemplate() {
  if (cached$1) return cached$1;
  if (pending$2) return pending$2;
  pending$2 = (async () => {
    const res = await fetch("/iomaya_overlay.zip");
    if (!res.ok) throw new Error(`Failed to load overlay template: ${res.status}`);
    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const fileName = Object.keys(zip.files).find((n) => !zip.files[n].dir) ?? "iomaya_overlay.txt";
    const html = await zip.file(fileName).async("string");
    cached$1 = html;
    return html;
  })();
  return pending$2;
}
function readFileAsDataUrl$1(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
const SLOT_LABELS = ["Left", "Center", "Right"];
const INK$2 = "#fbe0e7";
const INK_SOFT$1 = "#f0a8b8";
const KANJI$2 = "#ffb8c8";
const BRIGHT$1 = "#fff0f4";
const LINE$2 = "rgba(255,180,200,0.16)";
const LINE_STRONG$1 = "rgba(255,180,200,0.30)";
const PANEL$2 = "rgba(20,5,12,0.5)";
const CARD$1 = "rgba(255,240,244,0.035)";
const FIELD$1 = "rgba(20,5,12,0.7)";
const SEAL$1 = "linear-gradient(135deg,#c8132a,#8a0a1c)";
const SEAL_WASH$1 = "linear-gradient(135deg, rgba(200,19,42,0.32), rgba(138,10,28,0.20))";
function TwitchOverlayBuilder() {
  const [template, setTemplate] = reactExports.useState(null);
  const [loadError, setLoadError] = reactExports.useState(null);
  const [cfg, setCfg] = reactExports.useState(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem("twitch-overlay-cfg");
      if (raw) return normalizeConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
    } catch {
    }
    return DEFAULT_CONFIG;
  });
  const [activeTier, setActiveTier] = reactExports.useState(0);
  const [replayKey, setReplayKey] = reactExports.useState(0);
  const [previewBg, setPreviewBg] = reactExports.useState("default");
  const [previewBgImage, setPreviewBgImage] = reactExports.useState("");
  const bgInputRef = reactExports.useRef(null);
  const blobUrlRef = reactExports.useRef(null);
  const [previewUrl, setPreviewUrl] = reactExports.useState("");
  reactExports.useEffect(() => {
    loadOverlayTemplate().then(setTemplate).catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem("twitch-overlay-cfg", JSON.stringify(cfg));
    } catch {
    }
  }, [cfg]);
  reactExports.useEffect(() => {
    if (!template) return;
    const handle = window.setTimeout(() => {
      const html = buildOverlayHtml(template, cfg);
      const url = htmlToBlobUrl(html);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [template, cfg]);
  reactExports.useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);
  const updateCfg = reactExports.useCallback(
    (key, value) => setCfg((c) => ({ ...c, [key]: value })),
    []
  );
  const setTierName = (i, name) => setCfg((c) => {
    const tierNames = c.tierNames.slice();
    tierNames[i] = name;
    return { ...c, tierNames };
  });
  const setTierImage = (t, s, dataUrl) => setCfg((c) => {
    const tierImages = c.tierImages.map((r) => r.slice());
    tierImages[t][s] = dataUrl;
    return { ...c, tierImages };
  });
  const setAudioSlot = (t, slot, on) => setCfg((c) => {
    const audioSlots = c.audioSlots.map((r) => r.slice());
    if (!audioSlots[t]) audioSlots[t] = [false, false, false];
    audioSlots[t][slot] = on;
    return { ...c, audioSlots };
  });
  const setAudioColor = (t, slot, v) => setCfg((c) => {
    const audioColors = c.audioColors.map((r) => r.slice());
    if (!audioColors[t]) audioColors[t] = ["#f8b8cc", "#f8b8cc", "#f8b8cc"];
    audioColors[t][slot] = v;
    return { ...c, audioColors };
  });
  const setAudioText = (t, slot, key, v) => setCfg((c) => {
    const audioTexts = c.audioTexts.map((r) => r.map((x) => ({ ...x })));
    if (!audioTexts[t]) audioTexts[t] = [
      { top: "RP AUDIO", sub: "ASMR" },
      { top: "RP AUDIO", sub: "ASMR" },
      { top: "RP AUDIO", sub: "ASMR" }
    ];
    audioTexts[t][slot] = { ...audioTexts[t][slot], [key]: v };
    return { ...c, audioTexts };
  });
  const setShineSlot = (t, slot, on) => setCfg((c) => {
    const cardShineSlots = c.cardShineSlots.map((r) => r.slice());
    if (!cardShineSlots[t]) cardShineSlots[t] = [false, false, false];
    cardShineSlots[t][slot] = on;
    return { ...c, cardShineSlots };
  });
  const setBlur = (t, slot, on) => setCfg((c) => {
    const cardBlur = c.cardBlur.map((r) => r.slice());
    if (!cardBlur[t]) cardBlur[t] = [false, false, false];
    cardBlur[t][slot] = on;
    return { ...c, cardBlur };
  });
  const addTier = () => setCfg((c) => {
    if (c.tierNames.length >= 12) return c;
    const lastImgs = c.tierImages[c.tierImages.length - 1] ?? ["", "", ""];
    return {
      ...c,
      tierNames: [...c.tierNames, `Tier ${c.tierNames.length + 1}`],
      tierImages: [...c.tierImages, lastImgs.slice()],
      audioSlots: [...c.audioSlots, [false, false, false]],
      audioColors: [...c.audioColors, ["#f8b8cc", "#f8b8cc", "#f8b8cc"]],
      audioTexts: [...c.audioTexts, [{ top: "RP AUDIO", sub: "ASMR" }, { top: "RP AUDIO", sub: "ASMR" }, { top: "RP AUDIO", sub: "ASMR" }]],
      cardShineSlots: [...c.cardShineSlots, [false, false, false]],
      cardShineColor: [...c.cardShineColor, "#ffb8cc"],
      cardBlur: [...c.cardBlur, [false, false, false]]
    };
  });
  const removeTier = (idx) => setCfg((c) => {
    if (c.tierNames.length <= 1) return c;
    const drop = (a) => a.filter((_, i) => i !== idx);
    return {
      ...c,
      tierNames: drop(c.tierNames),
      tierImages: drop(c.tierImages),
      audioSlots: drop(c.audioSlots),
      audioColors: drop(c.audioColors),
      audioTexts: drop(c.audioTexts),
      cardShineSlots: drop(c.cardShineSlots),
      cardShineColor: drop(c.cardShineColor),
      cardBlur: drop(c.cardBlur)
    };
  });
  const handleDownload = async () => {
    if (!template) return;
    const html = buildOverlayHtml(template, cfg);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iomaya_overlay.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  const tierTabs = reactExports.useMemo(
    () => cfg.tierNames.map((n, i) => ({
      label: n || `Tier ${i + 1}`,
      idx: i
    })),
    [cfg.tierNames]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-xl leading-none", style: { color: KANJI$2 }, children: "実演" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-menu italic text-xl tracking-wide", style: { color: BRIGHT$1 }, children: "Live Preview" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setReplayKey((k) => k + 1),
              disabled: !previewUrl,
              className: "px-4 py-2.5 rounded-full text-xs tracking-[0.25em] uppercase transition hover:bg-white/5 disabled:opacity-50",
              style: { background: "transparent", color: INK$2, border: `1px solid ${LINE_STRONG$1}` },
              title: "Restart the preview animation (preview-only — not baked into the download)",
              children: "↻ Replay"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDownload,
              disabled: !template,
              className: "px-5 py-2.5 rounded-full text-sm font-semibold tracking-[0.2em] uppercase transition hover:scale-105 disabled:opacity-50",
              style: {
                background: SEAL$1,
                color: BRIGHT$1,
                border: "1px solid rgba(255,200,215,0.4)",
                boxShadow: "0 6px 24px rgba(200,19,42,0.4)"
              },
              children: "Download HTML"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "relative w-full rounded-2xl overflow-hidden border",
          style: {
            aspectRatio: "16 / 9",
            background: previewBg === "image" && previewBgImage ? `url(${previewBgImage}) center/cover no-repeat` : "repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 28px 28px",
            borderColor: LINE$2,
            boxShadow: "0 0 0 1px rgba(255,200,215,0.05) inset, 0 12px 40px rgba(0,0,0,0.45)"
          },
          children: [
            loadError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex items-center justify-center text-sm text-red-200 p-4 text-center", children: [
              "Failed to load overlay template: ",
              loadError
            ] }),
            !template && !loadError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center text-sm opacity-70", style: { color: "#ffd0dc" }, children: "Loading template…" }),
            previewUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "iframe",
              {
                src: previewUrl,
                title: "Overlay preview",
                className: "absolute top-0 left-0",
                style: {
                  width: 1920,
                  height: 1080,
                  transform: "scale(var(--scale))",
                  transformOrigin: "top left",
                  border: 0,
                  background: "transparent"
                },
                ref: (el) => {
                  if (!el) return;
                  const update = () => {
                    const w = el.parentElement?.clientWidth ?? 1280;
                    el.style.setProperty("--scale", String(w / 1920));
                  };
                  update();
                  const ro = new ResizeObserver(update);
                  if (el.parentElement) ro.observe(el.parentElement);
                }
              },
              previewUrl + ":" + replayKey
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center gap-3 flex-wrap text-xs rounded-xl px-4 py-2.5 border",
          style: { borderColor: LINE$2, background: PANEL$2, color: INK$2 },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-sm", style: { color: KANJI$2 }, children: "背景" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.25em]", style: { color: INK_SOFT$1 }, children: "Preview BG" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setPreviewBg("default"),
                className: "px-3 py-1 rounded-full transition hover:bg-white/5",
                style: {
                  background: previewBg === "default" ? SEAL_WASH$1 : "transparent",
                  border: `1px solid ${previewBg === "default" ? LINE_STRONG$1 : LINE$2}`,
                  color: BRIGHT$1
                },
                children: "Default"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  if (previewBgImage) setPreviewBg("image");
                  else bgInputRef.current?.click();
                },
                className: "px-3 py-1 rounded-full transition hover:bg-white/5",
                style: {
                  background: previewBg === "image" ? SEAL_WASH$1 : "transparent",
                  border: `1px solid ${previewBg === "image" ? LINE_STRONG$1 : LINE$2}`,
                  color: BRIGHT$1
                },
                children: previewBgImage ? "Custom image" : "Upload image…"
              }
            ),
            previewBgImage && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => bgInputRef.current?.click(),
                  className: "px-2 py-1 rounded-full opacity-80 hover:opacity-100 transition hover:bg-white/5",
                  style: { background: "transparent", border: `1px solid ${LINE$2}`, color: BRIGHT$1 },
                  children: "Change"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    setPreviewBgImage("");
                    setPreviewBg("default");
                  },
                  className: "px-2 py-1 rounded-full opacity-70 hover:opacity-100",
                  style: { color: "#ffd0dc" },
                  children: "Clear"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: bgInputRef,
                type: "file",
                accept: "image/*",
                className: "hidden",
                onChange: async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await readFileAsDataUrl$1(f);
                    setPreviewBgImage(url);
                    setPreviewBg("image");
                  }
                  e.currentTarget.value = "";
                }
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ObsGuide, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded-2xl p-5 flex flex-col gap-6 border",
        style: { background: PANEL$2, borderColor: LINE$2, color: INK$2 },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTitle$1, { kanji: "彩", children: "Global colors" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ColorField$1, { label: "Text", value: cfg.textColor, onChange: (v) => updateCfg("textColor", v) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ToggleRow,
              {
                label: "Show petal rain",
                on: cfg.showPetals ?? true,
                onChange: (v) => updateCfg("showPetals", v)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] opacity-60 mt-2 leading-snug", style: { color: INK_SOFT$1 }, children: "Audio wave / mic color is configured per-tier below." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTitle$1, { kanji: "時", children: "Timing" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                NumberField$1,
                {
                  label: "Start delay (sec)",
                  hint: "Empty/transparent pause before the animation begins",
                  value: +(cfg.startDelayMs / 1e3).toFixed(1),
                  step: 0.5,
                  min: 0,
                  onChange: (v) => updateCfg("startDelayMs", Math.max(0, Math.round(v * 1e3)))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                NumberField$1,
                {
                  label: "Card hold (sec)",
                  hint: "How long each tier shows before flipping",
                  value: +(cfg.holdMs / 1e3).toFixed(1),
                  step: 0.1,
                  min: 0.5,
                  onChange: (v) => updateCfg("holdMs", Math.max(500, Math.round(v * 1e3)))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                NumberField$1,
                {
                  label: "End break (min)",
                  hint: "Transparent pause after the animation finishes (plays once, then empty)",
                  value: +(cfg.breakMs / 6e4).toFixed(2),
                  step: 0.25,
                  min: 0,
                  onChange: (v) => updateCfg("breakMs", Math.max(0, Math.round(v * 6e4)))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "rounded-2xl border overflow-hidden",
              style: {
                borderColor: LINE_STRONG$1,
                background: "rgba(45,12,22,0.4)",
                boxShadow: "0 10px 34px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,200,215,0.04) inset"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex items-center justify-between gap-2 px-4 py-3.5",
                    style: { background: "linear-gradient(90deg, rgba(200,19,42,0.14), transparent)" },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-lg leading-none", style: { color: KANJI$2 }, children: "段" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm uppercase tracking-[0.28em] font-semibold", style: { color: BRIGHT$1 }, children: "Tiers" })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            onClick: addTier,
                            disabled: cfg.tierNames.length >= 12,
                            className: "px-2.5 py-1 rounded-full text-[11px] font-semibold transition disabled:opacity-40",
                            style: { background: SEAL$1, color: BRIGHT$1, border: "1px solid rgba(255,180,200,0.3)" },
                            title: "Add a new tier",
                            children: "+ Add tier"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            onClick: () => {
                              if (cfg.tierNames.length <= 1) return;
                              const newIdx = Math.max(0, Math.min(activeTier, cfg.tierNames.length - 2));
                              removeTier(activeTier);
                              setActiveTier(newIdx);
                            },
                            disabled: cfg.tierNames.length <= 1,
                            className: "px-2.5 py-1 rounded-full text-[11px] font-semibold transition hover:bg-white/5 disabled:opacity-40",
                            style: { background: "transparent", color: "#ffd0dc", border: `1px solid ${LINE_STRONG$1}` },
                            title: "Remove the currently selected tier",
                            children: "− Remove"
                          }
                        )
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 px-4 pb-3.5", children: tierTabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => setActiveTier(t.idx),
                    className: "px-3 py-1.5 rounded-full text-xs font-semibold transition hover:bg-white/5",
                    style: {
                      background: activeTier === t.idx ? SEAL$1 : "transparent",
                      border: `1px solid ${activeTier === t.idx ? "rgba(255,180,200,0.4)" : LINE$2}`,
                      color: activeTier === t.idx ? BRIGHT$1 : INK$2
                    },
                    children: t.label
                  },
                  t.idx
                )) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex flex-col gap-4 px-4 pt-4 pb-4",
                    style: { borderTop: `1px solid ${LINE$2}`, background: PANEL$2 },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-[0.3em]", style: { color: INK_SOFT$1 }, children: "Now editing" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-menu italic text-lg leading-none", style: { color: BRIGHT$1 }, children: cfg.tierNames[activeTier] || `Tier ${activeTier + 1}` })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-[0.25em]", style: { color: INK_SOFT$1 }, children: "Tier name" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            value: cfg.tierNames[activeTier],
                            onChange: (e) => setTierName(activeTier, e.target.value),
                            className: "px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-300/30",
                            style: { background: FIELD$1, border: `1px solid ${LINE_STRONG$1}`, color: "#fff" },
                            maxLength: 32
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-3.5 flex flex-col gap-3", style: { borderColor: LINE$2, background: CARD$1 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { kanji: "音", children: "Audio Card" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          SlotToggles,
                          {
                            values: cfg.audioSlots[activeTier],
                            onChange: (slot, on) => setAudioSlot(activeTier, slot, on)
                          }
                        ),
                        SLOT_LABELS.map((slotLabel, slot) => {
                          if (!(cfg.audioSlots[activeTier] || [])[slot]) return null;
                          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 text-xs pl-3 border-l-2", style: { borderColor: LINE_STRONG$1 }, children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.25em] text-[10px]", style: { color: INK_SOFT$1 }, children: slotLabel }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                ColorField$1,
                                {
                                  label: "Wave / mic",
                                  value: (cfg.audioColors[activeTier] || [])[slot] || "#f8b8cc",
                                  onChange: (v) => setAudioColor(activeTier, slot, v)
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.2em]", style: { color: INK_SOFT$1 }, children: "Top text" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    value: (cfg.audioTexts[activeTier] || [])[slot]?.top ?? "RP AUDIO",
                                    onChange: (e) => setAudioText(activeTier, slot, "top", e.target.value),
                                    className: "px-2 py-1.5 rounded-lg outline-none text-sm",
                                    style: { background: FIELD$1, border: `1px solid ${LINE_STRONG$1}`, color: "#fff" },
                                    maxLength: 24
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1 col-span-2", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.2em]", style: { color: INK_SOFT$1 }, children: "Sub text" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    value: (cfg.audioTexts[activeTier] || [])[slot]?.sub ?? "ASMR",
                                    onChange: (e) => setAudioText(activeTier, slot, "sub", e.target.value),
                                    className: "px-2 py-1.5 rounded-lg outline-none text-sm",
                                    style: { background: FIELD$1, border: `1px solid ${LINE_STRONG$1}`, color: "#fff" },
                                    maxLength: 24
                                  }
                                )
                              ] })
                            ] })
                          ] }, slot);
                        })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-3.5 flex flex-col gap-3", style: { borderColor: LINE$2, background: CARD$1 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { kanji: "光", children: "Light Shimmer" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          SlotToggles,
                          {
                            values: cfg.cardShineSlots[activeTier],
                            onChange: (slot, on) => setShineSlot(activeTier, slot, on)
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-3.5 flex flex-col gap-3", style: { borderColor: LINE$2, background: CARD$1 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { kanji: "暈", children: "Blur" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          SlotToggles,
                          {
                            values: cfg.cardBlur[activeTier],
                            onChange: (slot, on) => setBlur(activeTier, slot, on)
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { kanji: "絵", children: "Card images" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2", children: SLOT_LABELS.map((label, slot) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                          CardImageSlot,
                          {
                            label,
                            value: cfg.tierImages[activeTier][slot],
                            isAudioCenter: !!(cfg.audioSlots[activeTier] || [])[slot],
                            onPick: async (file) => {
                              const url = await readFileAsDataUrl$1(file);
                              setTierImage(activeTier, slot, url);
                            },
                            onClear: () => setTierImage(activeTier, slot, "")
                          },
                          slot
                        )) })
                      ] })
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setCfg(DEFAULT_CONFIG),
              className: "text-[11px] uppercase tracking-[0.25em] opacity-60 hover:opacity-100 self-start transition",
              style: { color: INK_SOFT$1 },
              children: "Reset to template defaults"
            }
          )
        ]
      }
    )
  ] });
}
function SectionTitle$1({ kanji, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 mb-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-base leading-none", style: { color: KANJI$2 }, children: kanji }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-[0.25em] whitespace-nowrap", style: { color: INK_SOFT$1 }, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 h-px", style: { background: "linear-gradient(90deg, rgba(255,180,200,0.22), transparent)" } })
  ] });
}
function SectionLabel({ kanji, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-sm leading-none", style: { color: KANJI$2 }, children: kanji }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-[0.25em]", style: { color: INK_SOFT$1 }, children })
  ] });
}
function ToggleRow({
  label,
  on,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "label",
    {
      className: "flex items-center justify-between gap-2 mt-3 px-3 py-2 rounded-lg cursor-pointer select-none transition",
      style: {
        background: on ? SEAL_WASH$1 : "transparent",
        border: `1px solid ${on ? LINE_STRONG$1 : LINE$2}`
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-[0.2em]", style: { color: on ? BRIGHT$1 : INK$2 }, children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            role: "switch",
            "aria-checked": on,
            className: "relative inline-block flex-shrink-0",
            style: { width: 36, height: 20, borderRadius: 999, background: on ? "#c8132a" : "rgba(255,255,255,0.15)", transition: "background 0.15s" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                style: {
                  position: "absolute",
                  top: 2,
                  left: on ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
                }
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "sr-only", checked: on, onChange: (e) => onChange(e.target.checked) })
      ]
    }
  );
}
function SlotToggles({
  values,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2", children: SLOT_LABELS.map((label, slot) => {
    const on = !!(values || [])[slot];
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "label",
      {
        className: "flex items-center justify-center gap-2 text-[11px] px-2 py-2 rounded-lg cursor-pointer select-none transition hover:bg-white/5",
        style: {
          background: on ? SEAL_WASH$1 : "transparent",
          border: `1px solid ${on ? LINE_STRONG$1 : LINE$2}`
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "inline-block flex-shrink-0",
              style: {
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: on ? "#ff5a78" : "transparent",
                border: on ? "none" : `1px solid ${LINE_STRONG$1}`,
                boxShadow: on ? "0 0 6px rgba(255,90,120,0.7)" : "none"
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.2em]", style: { color: on ? BRIGHT$1 : INK$2 }, children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "sr-only", checked: on, onChange: (e) => onChange(slot, e.target.checked) })
        ]
      },
      slot
    );
  }) });
}
function ColorField$1({
  label,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "color",
        value,
        onChange: (e) => onChange(e.target.value),
        className: "w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.2em]", style: { color: INK_SOFT$1 }, children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] opacity-60", children: value })
    ] })
  ] });
}
function NumberField$1({
  label,
  hint,
  value,
  step,
  min,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.2em]", style: { color: INK_SOFT$1 }, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "number",
        value,
        step,
        min,
        onChange: (e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        },
        className: "px-2 py-1.5 rounded-lg outline-none text-sm",
        style: { background: FIELD$1, border: `1px solid ${LINE_STRONG$1}`, color: "#fff" }
      }
    ),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] opacity-60 leading-snug", children: hint })
  ] });
}
function CardImageSlot({
  label,
  value,
  isAudioCenter,
  onPick,
  onClear
}) {
  const inputRef = reactExports.useRef(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-lg overflow-hidden border flex flex-col",
      style: { borderColor: LINE_STRONG$1, background: "rgba(0,0,0,0.35)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "aspect-[5/7] relative flex items-center justify-center text-[10px] opacity-70 cursor-pointer",
            onClick: () => inputRef.current?.click(),
            style: {
              background: value ? `url(${value}) center/cover no-repeat` : "rgba(255,255,255,0.04)"
            },
            children: [
              !value && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Click to upload" }),
              isAudioCenter && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] uppercase tracking-[0.2em] text-pink-200", children: "Audio" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-2 py-1 text-[10px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.2em] opacity-70", children: label }),
          value && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClear, className: "opacity-70 hover:opacity-100", children: "clear" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: inputRef,
            type: "file",
            accept: "image/*",
            className: "hidden",
            onChange: (e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.currentTarget.value = "";
            }
          }
        )
      ]
    }
  );
}
const OBS_STEPS = [
  { title: "Press “DOWNLOAD HTML”", detail: "The button up top, by the preview." },
  { title: "Save the file", detail: "A .html file lands on your computer." },
  { title: "Open OBS" },
  { title: "Add a Browser source", detail: "In your scene’s Sources panel, click + → Browser." },
  { title: "Tick “Local File”", detail: "Then browse to the .html file you saved." },
  { title: "Set the size", detail: "Width 1920 · Height 1080." },
  { title: "Position it", detail: "Drag & scale it in your scene however you like ♡" }
];
function ObsGuide() {
  const [open, setOpen] = reactExports.useState(true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border overflow-hidden",
      style: {
        borderColor: LINE_STRONG$1,
        background: "linear-gradient(160deg, rgba(52,11,24,0.72), rgba(18,4,9,0.6))",
        color: INK$2,
        boxShadow: "0 12px 34px rgba(0,0,0,0.32)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setOpen((o) => !o),
            className: "w-full flex items-center justify-between px-5 py-4 text-left",
            style: {
              borderBottom: open ? `1px solid ${LINE$2}` : "none",
              background: "linear-gradient(90deg, rgba(200,19,42,0.16), transparent)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-3.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "aria-hidden": true,
                    className: "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg",
                    style: { background: "rgba(200,19,42,0.18)", border: `1px solid ${LINE_STRONG$1}`, color: KANJI$2 },
                    children: "⛩"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold tracking-[0.22em] uppercase", style: { color: BRIGHT$1 }, children: "OBS Setup Guide" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-sm opacity-75", style: { color: KANJI$2 }, children: "案内" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] tracking-wide opacity-65", style: { color: INK_SOFT$1 }, children: "Get your overlay into a stream in 7 quick steps" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-base opacity-80",
                  style: { border: `1px solid ${LINE$2}` },
                  children: open ? "−" : "+"
                }
              )
            ]
          }
        ),
        open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 py-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "relative flex flex-col", children: OBS_STEPS.map((step, i) => {
            const last = i === OBS_STEPS.length - 1;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "relative flex gap-4 pb-5 last:pb-0", children: [
              !last && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  "aria-hidden": true,
                  className: "absolute top-7 bottom-0 left-[13px] w-px",
                  style: { background: "linear-gradient(180deg, rgba(255,180,200,0.35), rgba(255,180,200,0.08))" }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold",
                  style: {
                    background: SEAL$1,
                    color: BRIGHT$1,
                    border: "1px solid rgba(255,200,215,0.45)",
                    boxShadow: "0 2px 10px rgba(200,19,42,0.4)"
                  },
                  children: i + 1
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col gap-0.5 pt-0.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", style: { color: BRIGHT$1 }, children: step.title }),
                step.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs leading-snug opacity-70", style: { color: INK$2 }, children: step.detail })
              ] })
            ] }, i);
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "mt-5 text-xs leading-snug rounded-xl px-4 py-3.5 flex gap-3",
              style: { background: "rgba(255,200,215,0.06)", border: `1px solid ${LINE_STRONG$1}` },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, style: { color: KANJI$2, fontSize: 15 }, children: "🌸" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { color: INK$2 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold tracking-[0.18em] uppercase text-[10px] mr-1.5", style: { color: KANJI$2 }, children: "Pro tip" }),
                  "Download 2 files — one with a 0.3s end break for positioning in OBS, and one with the real break length you want. The real one stays invisible between plays, which makes it hard to align."
                ] })
              ]
            }
          )
        ] })
      ]
    }
  );
}
const DEFAULT_GAMERSUPPS_CONFIG = {
  holdMs: 6e3,
  breakMs: 2e3,
  image: ""
};
function normalizeGamersuppsConfig(cfg) {
  return {
    holdMs: Number.isFinite(cfg?.holdMs) ? Math.max(200, Math.round(cfg.holdMs)) : 6e3,
    breakMs: Number.isFinite(cfg?.breakMs) ? Math.max(0, Math.round(cfg.breakMs)) : 2e3,
    image: typeof cfg?.image === "string" ? cfg.image : ""
  };
}
function buildGamersuppsHtml(template, rawCfg) {
  const cfg = normalizeGamersuppsConfig(rawCfg);
  let out = template;
  out = out.replace("await sleep(6000);", `await sleep(${cfg.holdMs});`).replace("await sleep(2000);", `await sleep(${cfg.breakMs});`);
  if (cfg.image) {
    out = out.replace(
      /(<img id="card-img" src=")[^"]*(")/,
      (_m, pre, post) => `${pre}${cfg.image}${post}`
    );
  }
  return out;
}
let cached = null;
let pending$1 = null;
async function loadGamersuppsTemplate() {
  if (cached) return cached;
  if (pending$1) return pending$1;
  pending$1 = (async () => {
    const res = await fetch("/gs_card.html");
    if (!res.ok) throw new Error(`Failed to load Gamersupps template: ${res.status}`);
    const html = await res.text();
    cached = html;
    return html;
  })();
  return pending$1;
}
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
const INK$1 = "#fbe0e7";
const INK_SOFT = "#f0a8b8";
const KANJI$1 = "#ffb8c8";
const BRIGHT = "#fff0f4";
const LINE$1 = "rgba(255,180,200,0.16)";
const LINE_STRONG = "rgba(255,180,200,0.30)";
const PANEL$1 = "rgba(20,5,12,0.5)";
const CARD = "rgba(255,240,244,0.035)";
const FIELD = "rgba(20,5,12,0.7)";
const SEAL = "linear-gradient(135deg,#c8132a,#8a0a1c)";
const SEAL_WASH = "linear-gradient(135deg, rgba(200,19,42,0.32), rgba(138,10,28,0.20))";
function GamersuppsBuilder() {
  const [template, setTemplate] = reactExports.useState(null);
  const [loadError, setLoadError] = reactExports.useState(null);
  const [cfg, setCfg] = reactExports.useState(() => {
    if (typeof window === "undefined") return DEFAULT_GAMERSUPPS_CONFIG;
    try {
      const raw = localStorage.getItem("gamersupps-cfg");
      if (raw) return normalizeGamersuppsConfig({ ...DEFAULT_GAMERSUPPS_CONFIG, ...JSON.parse(raw) });
    } catch {
    }
    return DEFAULT_GAMERSUPPS_CONFIG;
  });
  const [replayKey, setReplayKey] = reactExports.useState(0);
  const [previewBg, setPreviewBg] = reactExports.useState("default");
  const [previewBgImage, setPreviewBgImage] = reactExports.useState("");
  const bgInputRef = reactExports.useRef(null);
  const imgInputRef = reactExports.useRef(null);
  const blobUrlRef = reactExports.useRef(null);
  const [previewUrl, setPreviewUrl] = reactExports.useState("");
  reactExports.useEffect(() => {
    loadGamersuppsTemplate().then(setTemplate).catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem("gamersupps-cfg", JSON.stringify(cfg));
    } catch {
    }
  }, [cfg]);
  reactExports.useEffect(() => {
    if (!template) return;
    const handle = window.setTimeout(() => {
      const html = buildGamersuppsHtml(template, cfg);
      const url = htmlToBlobUrl(html);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [template, cfg]);
  reactExports.useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);
  const updateCfg = reactExports.useCallback(
    (key, value) => setCfg((c) => ({ ...c, [key]: value })),
    []
  );
  const handleDownload = () => {
    if (!template) return;
    const html = buildGamersuppsHtml(template, cfg);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gamersupps_card.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-xl leading-none", style: { color: KANJI$1 }, children: "実演" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-menu italic text-xl tracking-wide", style: { color: BRIGHT }, children: "Live Preview" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setReplayKey((k) => k + 1),
              disabled: !previewUrl,
              className: "px-4 py-2.5 rounded-full text-xs tracking-[0.25em] uppercase transition hover:bg-white/5 disabled:opacity-50",
              style: { background: "transparent", color: INK$1, border: `1px solid ${LINE_STRONG}` },
              title: "Restart the preview animation",
              children: "↻ Replay"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDownload,
              disabled: !template,
              className: "px-5 py-2.5 rounded-full text-sm font-semibold tracking-[0.2em] uppercase transition hover:scale-105 disabled:opacity-50",
              style: {
                background: SEAL,
                color: BRIGHT,
                border: "1px solid rgba(255,200,215,0.4)",
                boxShadow: "0 6px 24px rgba(200,19,42,0.4)"
              },
              children: "Download HTML"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "relative w-full rounded-2xl overflow-hidden border",
          style: {
            aspectRatio: "16 / 9",
            background: previewBg === "image" && previewBgImage ? `url(${previewBgImage}) center/cover no-repeat` : "repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 28px 28px",
            borderColor: LINE$1,
            boxShadow: "0 0 0 1px rgba(255,200,215,0.05) inset, 0 12px 40px rgba(0,0,0,0.45)"
          },
          children: [
            loadError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex items-center justify-center text-sm text-red-200 p-4 text-center", children: [
              "Failed to load Gamersupps template: ",
              loadError
            ] }),
            !template && !loadError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center text-sm opacity-70", style: { color: "#ffd0dc" }, children: "Loading template…" }),
            previewUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "iframe",
              {
                src: previewUrl,
                title: "Gamersupps preview",
                className: "absolute top-0 left-0",
                style: {
                  width: 1920,
                  height: 1080,
                  transform: "scale(var(--scale))",
                  transformOrigin: "top left",
                  border: 0,
                  background: "transparent"
                },
                ref: (el) => {
                  if (!el) return;
                  const update = () => {
                    const w = el.parentElement?.clientWidth ?? 1280;
                    el.style.setProperty("--scale", String(w / 1920));
                  };
                  update();
                  const ro = new ResizeObserver(update);
                  if (el.parentElement) ro.observe(el.parentElement);
                }
              },
              previewUrl + ":" + replayKey
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center gap-3 flex-wrap text-xs rounded-xl px-4 py-2.5 border",
          style: { borderColor: LINE$1, background: PANEL$1, color: INK$1 },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-sm", style: { color: KANJI$1 }, children: "背景" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.25em]", style: { color: INK_SOFT }, children: "Preview BG" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setPreviewBg("default"),
                className: "px-3 py-1 rounded-full transition hover:bg-white/5",
                style: {
                  background: previewBg === "default" ? SEAL_WASH : "transparent",
                  border: `1px solid ${previewBg === "default" ? LINE_STRONG : LINE$1}`,
                  color: BRIGHT
                },
                children: "Default"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  if (previewBgImage) setPreviewBg("image");
                  else bgInputRef.current?.click();
                },
                className: "px-3 py-1 rounded-full transition hover:bg-white/5",
                style: {
                  background: previewBg === "image" ? SEAL_WASH : "transparent",
                  border: `1px solid ${previewBg === "image" ? LINE_STRONG : LINE$1}`,
                  color: BRIGHT
                },
                children: previewBgImage ? "Custom image" : "Upload image…"
              }
            ),
            previewBgImage && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => bgInputRef.current?.click(),
                  className: "px-2 py-1 rounded-full opacity-80 hover:opacity-100 transition hover:bg-white/5",
                  style: { background: "transparent", border: `1px solid ${LINE$1}`, color: BRIGHT },
                  children: "Change"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    setPreviewBgImage("");
                    setPreviewBg("default");
                  },
                  className: "px-2 py-1 rounded-full opacity-70 hover:opacity-100",
                  style: { color: "#ffd0dc" },
                  children: "Clear"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: bgInputRef,
                type: "file",
                accept: "image/*",
                className: "hidden",
                onChange: async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await readFileAsDataUrl(f);
                    setPreviewBgImage(url);
                    setPreviewBg("image");
                  }
                  e.currentTarget.value = "";
                }
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GamersuppsObsGuide, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded-2xl p-5 flex flex-col gap-6 border",
        style: { background: PANEL$1, borderColor: LINE$1, color: INK$1 },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTitle, { kanji: "時", children: "Timing" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                NumberField,
                {
                  label: "On-screen time (sec)",
                  hint: "How long the card stays before it animates out",
                  value: +(cfg.holdMs / 1e3).toFixed(1),
                  step: 0.5,
                  min: 0.2,
                  onChange: (v) => updateCfg("holdMs", Math.max(200, Math.round(v * 1e3)))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                NumberField,
                {
                  label: "End break (sec)",
                  hint: "Transparent pause after it exits, before it loops back in",
                  value: +(cfg.breakMs / 1e3).toFixed(1),
                  step: 0.5,
                  min: 0,
                  onChange: (v) => updateCfg("breakMs", Math.max(0, Math.round(v * 1e3)))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTitle, { kanji: "絵", children: "Card image" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-3.5 flex flex-col gap-3", style: { borderColor: LINE$1, background: CARD }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "relative rounded-lg overflow-hidden border flex items-center justify-center cursor-pointer",
                  style: {
                    borderColor: LINE_STRONG,
                    background: cfg.image ? `url(${cfg.image}) center/contain no-repeat, repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 22px 22px` : "rgba(255,255,255,0.04)",
                    minHeight: 180
                  },
                  onClick: () => imgInputRef.current?.click(),
                  children: !cfg.image && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs opacity-70 uppercase tracking-[0.2em]", style: { color: INK_SOFT }, children: "Click to upload image" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => imgInputRef.current?.click(),
                    className: "flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] transition hover:scale-[1.02]",
                    style: { background: SEAL, color: BRIGHT, border: "1px solid rgba(255,200,215,0.4)" },
                    children: cfg.image ? "Replace image" : "Upload image"
                  }
                ),
                cfg.image && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => updateCfg("image", ""),
                    className: "px-3 py-2 rounded-lg text-xs uppercase tracking-[0.2em] transition hover:bg-white/5",
                    style: { background: "transparent", color: "#ffd0dc", border: `1px solid ${LINE_STRONG}` },
                    children: "Reset"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] opacity-60 leading-snug", style: { color: INK_SOFT }, children: "This single image is what floats and animates. PNG with transparency works best. The spinning sakura petals stay as-is." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ref: imgInputRef,
                  type: "file",
                  accept: "image/*",
                  className: "hidden",
                  onChange: async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const url = await readFileAsDataUrl(f);
                      updateCfg("image", url);
                    }
                    e.currentTarget.value = "";
                  }
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setCfg(DEFAULT_GAMERSUPPS_CONFIG),
              className: "text-[11px] uppercase tracking-[0.25em] opacity-60 hover:opacity-100 self-start transition",
              style: { color: INK_SOFT },
              children: "Reset to template defaults"
            }
          )
        ]
      }
    )
  ] });
}
function SectionTitle({ kanji, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 mb-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-base leading-none", style: { color: KANJI$1 }, children: kanji }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-[0.25em] whitespace-nowrap", style: { color: INK_SOFT }, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 h-px", style: { background: "linear-gradient(90deg, rgba(255,180,200,0.22), transparent)" } })
  ] });
}
function NumberField({
  label,
  hint,
  value,
  step,
  min,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase tracking-[0.2em]", style: { color: INK_SOFT }, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "number",
        value,
        step,
        min,
        onChange: (e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        },
        className: "px-2 py-1.5 rounded-lg outline-none text-sm",
        style: { background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }
      }
    ),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] opacity-60 leading-snug", children: hint })
  ] });
}
const GS_OBS_STEPS = [
  { title: "Press “DOWNLOAD HTML”", detail: "The button up top, by the preview." },
  { title: "Save the file", detail: "A .html file lands on your computer." },
  { title: "Open OBS" },
  { title: "Add a Browser source", detail: "In your scene’s Sources panel, click + → Browser." },
  { title: "Tick “Local File”", detail: "Then browse to the .html file you saved." },
  { title: "Set the size", detail: "Width 1920 · Height 1080." },
  { title: "Position it", detail: "Drag & scale it in your scene however you like ♡" }
];
function GamersuppsObsGuide() {
  const [open, setOpen] = reactExports.useState(true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border overflow-hidden",
      style: {
        borderColor: LINE_STRONG,
        background: "linear-gradient(160deg, rgba(52,11,24,0.72), rgba(18,4,9,0.6))",
        color: INK$1,
        boxShadow: "0 12px 34px rgba(0,0,0,0.32)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setOpen((o) => !o),
            className: "w-full flex items-center justify-between px-5 py-4 text-left",
            style: {
              borderBottom: open ? `1px solid ${LINE$1}` : "none",
              background: "linear-gradient(90deg, rgba(200,19,42,0.16), transparent)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-3.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "aria-hidden": true,
                    className: "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg",
                    style: { background: "rgba(200,19,42,0.18)", border: `1px solid ${LINE_STRONG}`, color: KANJI$1 },
                    children: "⛩"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold tracking-[0.22em] uppercase", style: { color: BRIGHT }, children: "OBS Setup Guide" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-sm opacity-75", style: { color: KANJI$1 }, children: "案内" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] tracking-wide opacity-65", style: { color: INK_SOFT }, children: "Get your overlay into a stream in 7 quick steps" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-base opacity-80",
                  style: { border: `1px solid ${LINE$1}` },
                  children: open ? "−" : "+"
                }
              )
            ]
          }
        ),
        open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-5 py-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "relative flex flex-col", children: GS_OBS_STEPS.map((step, i) => {
          const last = i === GS_OBS_STEPS.length - 1;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "relative flex gap-4 pb-5 last:pb-0", children: [
            !last && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                "aria-hidden": true,
                className: "absolute top-7 bottom-0 left-[13px] w-px",
                style: { background: "linear-gradient(180deg, rgba(255,180,200,0.35), rgba(255,180,200,0.08))" }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold",
                style: {
                  background: SEAL,
                  color: BRIGHT,
                  border: "1px solid rgba(255,200,215,0.45)",
                  boxShadow: "0 2px 10px rgba(200,19,42,0.4)"
                },
                children: i + 1
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col gap-0.5 pt-0.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", style: { color: BRIGHT }, children: step.title }),
              step.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs leading-snug opacity-70", style: { color: INK$1 }, children: step.detail })
            ] })
          ] }, i);
        }) }) })
      ]
    }
  );
}
const URLS = {
  waveform: "/audio_waveform.html",
  nowplaying: "/audio_nowplaying.html",
  soundorb: "/audio_soundorb.html"
};
const cache = {};
const pending = {};
async function loadAudioTeaserTemplate(style) {
  if (cache[style]) return cache[style];
  if (pending[style]) return pending[style];
  pending[style] = (async () => {
    const res = await fetch(URLS[style]);
    if (!res.ok) throw new Error(`Failed to load audio teaser template (${style}): ${res.status}`);
    const html = await res.text();
    cache[style] = html;
    return html;
  })();
  return pending[style];
}
const BANDS = 32;
function useAudioEngine(getTargets) {
  const audioRef = reactExports.useRef(null);
  const ctxRef = reactExports.useRef(null);
  const analyserRef = reactExports.useRef(null);
  const freqRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const objectUrlRef = reactExports.useRef("");
  const [hasAudio, setHasAudio] = reactExports.useState(false);
  const [fileName, setFileName] = reactExports.useState("");
  const [playing, setPlaying] = reactExports.useState(false);
  const [duration, setDuration] = reactExports.useState(0);
  const [currentTime, setCurrentTime] = reactExports.useState(0);
  const ensureGraph = reactExports.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    const src = ctx.createMediaElementSource(audio);
    src.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    freqRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);
  const broadcast = reactExports.useCallback((msg) => {
    for (const w of getTargets()) {
      try {
        w.postMessage(msg, "*");
      } catch {
      }
    }
  }, [getTargets]);
  const tick = reactExports.useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const analyser = analyserRef.current;
    const freq = freqRef.current;
    const audio = audioRef.current;
    if (!analyser || !freq || !audio) return;
    analyser.getByteFrequencyData(freq);
    const per = Math.floor(freq.length / BANDS);
    const s = new Array(BANDS);
    let sum = 0;
    for (let b = 0; b < BANDS; b++) {
      let acc = 0;
      for (let k = 0; k < per; k++) acc += freq[b * per + k];
      const v = acc / per / 255;
      s[b] = v;
      sum += v;
    }
    const amp = Math.min(1, sum / BANDS * 1.7);
    broadcast({ type: "aud", s, amp });
    setCurrentTime(audio.currentTime);
  }, [broadcast]);
  const startLoop = reactExports.useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);
  const stopLoop = reactExports.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);
  const play = reactExports.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureGraph();
    if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
    try {
      await audio.play();
    } catch {
      return;
    }
    setPlaying(true);
    startLoop();
  }, [ensureGraph, startLoop]);
  const pause = reactExports.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    stopLoop();
    broadcast({ type: "audStop" });
  }, [stopLoop, broadcast]);
  const toggle = reactExports.useCallback(() => {
    if (playing) pause();
    else void play();
  }, [playing, play, pause]);
  const seek = reactExports.useCallback((t) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);
  const load = reactExports.useCallback((file) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    audio.src = objectUrlRef.current;
    setFileName(file.name);
    setHasAudio(true);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);
  const onLoadedMetadata = reactExports.useCallback(() => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration)) setDuration(audio.duration);
  }, []);
  const onEnded = reactExports.useCallback(() => {
    setPlaying(false);
    stopLoop();
    broadcast({ type: "audStop" });
    seek(0);
  }, [stopLoop, broadcast, seek]);
  reactExports.useEffect(() => () => {
    stopLoop();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, [stopLoop]);
  return {
    audioRef,
    hasAudio,
    fileName,
    playing,
    duration,
    currentTime,
    load,
    play,
    pause,
    toggle,
    seek,
    onLoadedMetadata,
    onEnded
  };
}
function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
const DEFAULT_AUDIO_TEASER_CONFIG = {
  style: "waveform",
  title: "Whisper & Rain",
  eyebrow: "New Drop",
  genre: "ASMR Roleplay",
  badge: "Exclusive",
  minutes: "24",
  asmrLabel: "ASMR",
  cardLabel: "RP AUDIO",
  timeStart: "03:12",
  image: ""
};
function normalizeAudioTeaserConfig(cfg) {
  const s = (v, fallback) => typeof v === "string" && v.trim() ? v : fallback;
  const d = DEFAULT_AUDIO_TEASER_CONFIG;
  return {
    style: ["waveform", "nowplaying", "soundorb"].includes(cfg?.style) ? cfg.style : d.style,
    title: s(cfg?.title, d.title),
    eyebrow: s(cfg?.eyebrow, d.eyebrow),
    genre: s(cfg?.genre, d.genre),
    badge: s(cfg?.badge, d.badge),
    minutes: s(cfg?.minutes, d.minutes),
    asmrLabel: s(cfg?.asmrLabel, d.asmrLabel),
    cardLabel: s(cfg?.cardLabel, d.cardLabel),
    timeStart: s(cfg?.timeStart, d.timeStart),
    image: typeof cfg?.image === "string" ? cfg.image : ""
  };
}
function buildConfigBlock(cfg) {
  const q = (v) => JSON.stringify(v);
  if (cfg.style === "waveform") {
    return `var CONFIG = {
  title:       ${q(cfg.title)},
  asmrLabel:   ${q(cfg.asmrLabel)},
  cardLabel:   ${q(cfg.cardLabel)},
  eyebrow:     ${q(cfg.eyebrow)},
  genre:       ${q(cfg.genre)},
  badge:       ${q(cfg.badge)},
  minutes:     ${q(cfg.minutes)},
};`;
  }
  if (cfg.style === "nowplaying") {
    return `var CONFIG = {
  title:       ${q(cfg.title)},
  asmrLabel:   ${q(cfg.asmrLabel)},
  minutes:     ${q(cfg.minutes)},
  genre:       ${q(cfg.genre)},
  badge:       ${q(cfg.badge)},
  eyebrow:     ${q(cfg.eyebrow)},
  timeStart:   ${q(cfg.timeStart)},
};`;
  }
  return `var CONFIG = {
  title:       ${q(cfg.title)},
  asmrLabel:   ${q(cfg.asmrLabel)},
  minutes:     ${q(cfg.minutes)},
  genre:       ${q(cfg.genre)},
  badge:       ${q(cfg.badge)},
  eyebrow:     ${q(cfg.eyebrow)},
};`;
}
function buildAudioTeaserHtml(template, rawCfg) {
  const cfg = normalizeAudioTeaserConfig(rawCfg);
  let out = template;
  out = out.replace(/var CONFIG = \{[\s\S]*?\};/, buildConfigBlock(cfg));
  if (cfg.image) {
    out = out.replace(/var IMG = '[^']*';/, `var IMG = '${cfg.image}';`);
  }
  return out;
}
const INK = "#fbeaea";
const INK_DIM = "#c08898";
const ROSE = "#e8a0b4";
const KANJI = "#ffb8c8";
const LINE = "rgba(255,150,180,0.10)";
const LINE_STR = "rgba(255,150,180,0.22)";
const PANEL = "rgba(10,2,6,0.80)";
const FIELD_BG = "rgba(255,140,170,0.04)";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, sans-serif";
const STYLES = [
  { key: "waveform", kanji: "波", label: "Waveform" },
  { key: "nowplaying", kanji: "再", label: "Now Playing" },
  { key: "soundorb", kanji: "球", label: "Sound Orb" }
];
const CARD_W = 390;
const CARD_H = 488;
function storageKey(s) {
  return `audio-teaser-cfg-${s}`;
}
function loadStored(style) {
  try {
    const raw = localStorage.getItem(storageKey(style));
    if (raw) return normalizeAudioTeaserConfig(JSON.parse(raw));
  } catch {
  }
  return { ...DEFAULT_AUDIO_TEASER_CONFIG, style };
}
function saveStored(style, cfg) {
  try {
    localStorage.setItem(storageKey(style), JSON.stringify(cfg));
  } catch {
  }
}
function Field({
  label,
  value,
  onChange,
  placeholder
}) {
  const [focused, setFocused] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 13 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      fontSize: 7.5,
      letterSpacing: "0.38em",
      textTransform: "uppercase",
      fontFamily: SANS,
      color: focused ? ROSE : INK_DIM,
      marginBottom: 5,
      transition: "color 0.18s"
    }, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        style: {
          width: "100%",
          padding: "3px 0 6px",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${focused ? ROSE : LINE_STR}`,
          color: INK,
          fontSize: 13,
          fontFamily: SERIF,
          outline: "none",
          boxSizing: "border-box",
          boxShadow: focused ? `0 1px 0 ${ROSE}` : "none",
          transition: "border-color 0.18s, box-shadow 0.18s"
        }
      }
    )
  ] });
}
function Section({ title, accent, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    background: accent ? "rgba(255,140,170,0.06)" : FIELD_BG,
    border: `1px solid ${accent ? "rgba(255,150,180,0.18)" : LINE}`,
    borderRadius: 10,
    padding: "12px 14px 4px",
    marginBottom: 8
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      fontSize: 7,
      letterSpacing: "0.52em",
      textTransform: "uppercase",
      fontFamily: SANS,
      color: accent ? KANJI : INK_DIM,
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 7
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { opacity: accent ? 1 : 0.6 }, children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, height: "1px", background: accent ? LINE_STR : LINE } })
    ] }),
    children
  ] });
}
function TeaserCard({ style, kanji, label, onWindow, audioMinutes, onBroadcast }) {
  const [cfg, setCfg] = reactExports.useState(() => loadStored(style));
  const [previewSrc, setPreviewSrc] = reactExports.useState("");
  const blobRef = reactExports.useRef("");
  const debounceRef = reactExports.useRef(null);
  const set = reactExports.useCallback((key, val) => {
    setCfg((prev) => {
      const next = { ...prev, [key]: val };
      saveStored(style, next);
      return next;
    });
  }, [style]);
  const buildPreview = reactExports.useCallback(async (c) => {
    try {
      const tpl = await loadAudioTeaserTemplate(c.style);
      const html = buildAudioTeaserHtml(tpl, c);
      const blob = new Blob([html], { type: "text/html" });
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = URL.createObjectURL(blob);
      setPreviewSrc(blobRef.current);
    } catch (e) {
      console.error(e);
    }
  }, []);
  reactExports.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buildPreview(cfg), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cfg, buildPreview]);
  reactExports.useEffect(() => {
    if (audioMinutes && audioMinutes !== cfg.minutes) set("minutes", audioMinutes);
  }, [audioMinutes]);
  const handleImage = reactExports.useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("image", ev.target?.result ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [set]);
  const colW = 290;
  const scale = colW / CARD_W;
  const displayH = Math.round(CARD_H * scale);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: "0 0 290px", display: "flex", flexDirection: "column", gap: 10 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 9 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 20, color: KANJI, fontFamily: SERIF, lineHeight: 1 }, children: kanji }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
        fontSize: 10,
        letterSpacing: "0.4em",
        color: INK_DIM,
        fontFamily: SANS,
        textTransform: "uppercase"
      }, children: label })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      width: colW,
      height: displayH,
      borderRadius: 11,
      overflow: "hidden",
      border: `1px solid ${LINE_STR}`,
      background: "#080205",
      flexShrink: 0,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
    }, children: previewSrc && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "iframe",
      {
        src: previewSrc,
        onLoad: (e) => onWindow(style, e.currentTarget.contentWindow),
        style: {
          width: CARD_W,
          height: CARD_H,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          display: "block"
        },
        sandbox: "allow-scripts"
      },
      previewSrc
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => previewSrc && onBroadcast(previewSrc),
        disabled: !previewSrc,
        style: {
          width: colW,
          padding: "10px 0",
          borderRadius: 9,
          border: `1px solid ${ROSE}`,
          background: "rgba(255,140,170,0.10)",
          color: ROSE,
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          fontFamily: SANS,
          cursor: previewSrc ? "pointer" : "default"
        },
        children: "●  Broadcast for OBS"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      background: PANEL,
      border: `1px solid ${LINE_STR}`,
      borderTop: `2px solid rgba(255,150,180,0.35)`,
      borderRadius: 12,
      padding: "16px 14px 10px",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 6px 28px rgba(0,0,0,0.5)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Cover Image", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "block", cursor: "pointer", marginBottom: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
            height: cfg.image ? 70 : 42,
            borderRadius: 7,
            border: `1px dashed ${cfg.image ? "transparent" : LINE_STR}`,
            background: cfg.image ? "transparent" : "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }, children: cfg.image ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: cfg.image, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 7 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, color: INK_DIM, letterSpacing: "0.3em", fontFamily: SANS }, children: "＋  Upload" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", accept: "image/*", onChange: handleImage, style: { display: "none" } })
        ] }),
        cfg.image && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => set("image", ""), style: {
          fontSize: 8,
          color: INK_DIM,
          background: "none",
          border: "none",
          cursor: "pointer",
          letterSpacing: "0.24em",
          fontFamily: SANS,
          padding: "2px 0 8px",
          textAlign: "left",
          opacity: 0.65
        }, children: "✕  Remove" })
      ] }),
      style === "waveform" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Card Text", accent: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "ASMR Label", value: cfg.asmrLabel, onChange: (v) => set("asmrLabel", v), placeholder: "ASMR" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Card Label", value: cfg.cardLabel, onChange: (v) => set("cardLabel", v), placeholder: "RP AUDIO" })
      ] }),
      style === "nowplaying" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Card Text", accent: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "ASMR Label", value: cfg.asmrLabel, onChange: (v) => set("asmrLabel", v), placeholder: "ASMR" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Time Start", value: cfg.timeStart, onChange: (v) => set("timeStart", v), placeholder: "03:12" })
      ] }),
      style === "soundorb" && /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Orb Caption", accent: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "ASMR Label", value: cfg.asmrLabel, onChange: (v) => set("asmrLabel", v), placeholder: "ASMR" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Bottom Strip", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Title", value: cfg.title, onChange: (v) => set("title", v), placeholder: "Whisper & Rain" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Eyebrow", value: cfg.eyebrow, onChange: (v) => set("eyebrow", v), placeholder: "New Drop" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Genre", value: cfg.genre, onChange: (v) => set("genre", v), placeholder: "ASMR Roleplay" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Badge", value: cfg.badge, onChange: (v) => set("badge", v), placeholder: "Exclusive" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Duration (min)", value: cfg.minutes, onChange: (v) => set("minutes", v), placeholder: "24" })
      ] })
    ] })
  ] });
}
function Transport({ engine }) {
  const { hasAudio, fileName, playing, duration, currentTime, load, toggle, seek } = engine;
  const onFile = reactExports.useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) load(f);
    e.target.value = "";
  }, [load]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto 6px",
    background: PANEL,
    border: `1px solid ${LINE_STR}`,
    borderTop: `2px solid rgba(255,150,180,0.35)`,
    borderRadius: 14,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 18,
    boxShadow: "0 6px 28px rgba(0,0,0,0.45)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { cursor: "pointer", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
        display: "inline-block",
        padding: "9px 16px",
        borderRadius: 9,
        background: "rgba(255,140,170,0.10)",
        border: `1px solid ${LINE_STR}`,
        color: ROSE,
        fontSize: 9,
        letterSpacing: "0.3em",
        textTransform: "uppercase",
        fontFamily: SANS
      }, children: [
        "♪  ",
        hasAudio ? "Replace Audio" : "Upload Audio"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", accept: "audio/*", onChange: onFile, style: { display: "none" } })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: toggle,
        disabled: !hasAudio,
        style: {
          width: 44,
          height: 44,
          borderRadius: "50%",
          flexShrink: 0,
          border: `1px solid ${hasAudio ? ROSE : LINE_STR}`,
          background: hasAudio ? "rgba(255,140,170,0.12)" : "transparent",
          color: hasAudio ? ROSE : INK_DIM,
          cursor: hasAudio ? "pointer" : "default",
          fontSize: 15,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        },
        children: playing ? "❚❚" : "▶"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
        fontSize: 12,
        color: INK,
        fontFamily: SERIF,
        marginBottom: 6,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }, children: hasAudio ? fileName : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: INK_DIM, fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em" }, children: "No audio loaded — upload a file to drive all three previews" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "range",
          min: 0,
          max: duration || 0,
          step: 0.01,
          value: currentTime,
          onChange: (e) => seek(Number(e.target.value)),
          disabled: !hasAudio,
          style: { width: "100%", accentColor: ROSE, cursor: hasAudio ? "pointer" : "default" }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      flexShrink: 0,
      fontFamily: SANS,
      fontSize: 11,
      color: INK_DIM,
      letterSpacing: "0.06em",
      minWidth: 86,
      textAlign: "right"
    }, children: [
      formatTime(currentTime),
      " / ",
      formatTime(duration)
    ] })
  ] });
}
function overlayBtn(primary) {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${primary ? ROSE : LINE_STR}`,
    background: primary ? "rgba(255,140,170,0.14)" : "rgba(0,0,0,0.45)",
    color: primary ? ROSE : INK,
    fontSize: 10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontFamily: SANS,
    cursor: "pointer"
  };
}
function BroadcastOverlay({ src, engine, onRegister, onClose }) {
  const [vp, setVp] = reactExports.useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800
  }));
  const [showUI, setShowUI] = reactExports.useState(true);
  const hideTimer = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const poke = reactExports.useCallback(() => {
    setShowUI(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), 2600);
  }, []);
  reactExports.useEffect(() => {
    poke();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [poke]);
  reactExports.useEffect(() => () => {
    onRegister(null);
  }, [onRegister]);
  const ASPECT = CARD_W / CARD_H;
  const targetH = Math.min(vp.h * 0.96, vp.w * 0.96 / ASPECT);
  const scale = targetH / CARD_H;
  const dispW = Math.round(CARD_W * scale);
  const dispH = Math.round(CARD_H * scale);
  const start = reactExports.useCallback(() => {
    engine.seek(0);
    void engine.play();
  }, [engine]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      onMouseMove: poke,
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: dispW, height: dispH, position: "relative" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "iframe",
          {
            src,
            onLoad: (e) => onRegister(e.currentTarget.contentWindow),
            style: {
              width: CARD_W,
              height: CARD_H,
              border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              display: "block"
            },
            sandbox: "allow-scripts"
          },
          src
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.78), transparent)",
          opacity: showUI ? 1 : 0,
          transition: "opacity 0.4s",
          pointerEvents: showUI ? "auto" : "none"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: start, style: overlayBtn(true), children: engine.playing ? "⟲  Restart" : "▶  Start from 0:00" }),
          engine.playing && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: engine.pause, style: overlayBtn(false), children: "❚❚  Pause" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontFamily: SANS, fontSize: 11, color: INK_DIM, letterSpacing: "0.08em" }, children: [
            formatTime(engine.currentTime),
            " / ",
            formatTime(engine.duration),
            " · ",
            dispW,
            "×",
            dispH,
            "px"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            engine.pause();
            onClose();
          }, style: overlayBtn(false), children: "✕  Exit" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
          position: "fixed",
          bottom: 14,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 10,
          color: INK_DIM,
          letterSpacing: "0.12em",
          opacity: showUI ? 0.85 : 0,
          transition: "opacity 0.4s",
          pointerEvents: "none"
        }, children: [
          "OBS: capture this window (crop to the ",
          dispW,
          "×",
          dispH,
          " card) · start OBS recording, then press Start · trim the ends after"
        ] })
      ]
    }
  );
}
function AudioTeaserBuilder() {
  const windowsRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const getTargets = reactExports.useCallback(() => Array.from(windowsRef.current.values()), []);
  const engine = useAudioEngine(getTargets);
  const onWindow = reactExports.useCallback((style, win) => {
    if (win) windowsRef.current.set(style, win);
    else windowsRef.current.delete(style);
  }, []);
  const registerBroadcast = reactExports.useCallback((win) => {
    if (win) windowsRef.current.set("__broadcast__", win);
    else windowsRef.current.delete("__broadcast__");
  }, []);
  const [broadcastSrc, setBroadcastSrc] = reactExports.useState(null);
  const audioMinutes = engine.duration > 0 ? String(Math.max(1, Math.ceil(engine.duration / 60))) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "24px 32px 60px" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "audio",
      {
        ref: engine.audioRef,
        onLoadedMetadata: engine.onLoadedMetadata,
        onEnded: engine.onEnded,
        style: { display: "none" }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Transport, { engine }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      display: "flex",
      gap: 24,
      marginTop: 22,
      justifyContent: "center",
      alignItems: "flex-start",
      flexWrap: "wrap"
    }, children: STYLES.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      TeaserCard,
      {
        style: s.key,
        kanji: s.kanji,
        label: s.label,
        onWindow,
        audioMinutes,
        onBroadcast: setBroadcastSrc
      },
      s.key
    )) }),
    broadcastSrc && /* @__PURE__ */ jsxRuntimeExports.jsx(
      BroadcastOverlay,
      {
        src: broadcastSrc,
        engine,
        onRegister: registerBroadcast,
        onClose: () => setBroadcastSrc(null)
      }
    )
  ] });
}
const squiggleArrowAsset = {
  url: "/images/squiggle-arrow.png"
};
const chibi = {
  url: "/images/Chibi%20art%20thank%20you.png"
};
const thankYou = {
  url: "/images/thank%20%20you!!_text.png"
};
const petal = {
  url: "/images/petal.png"
};
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%234a0c22'/><stop offset='1' stop-color='%232a0712'/></linearGradient></defs><rect width='16' height='9' fill='url(%23g)'/><text x='8' y='5.2' font-family='serif' font-size='1.2' text-anchor='middle' fill='%23ffb8c8' opacity='0.45'>upload art</text></svg>";
let _uid = 0;
const uid = () => `p${++_uid}`;
const p = (label, extra = {}) => ({
  id: uid(),
  label,
  ...extra
});
const ACCENT_STD = "#ffb8c8";
const ACCENT_MID = "#ffc7a0";
const ACCENT_TOP = "#ffd28a";
const ACCENT_KAMI = "#e8c878";
const TIER_ACCENT = {
  yokan: ACCENT_STD,
  sensu: ACCENT_STD,
  tomo: ACCENT_STD,
  okami: ACCENT_MID,
  danna: ACCENT_TOP,
  kami: ACCENT_KAMI
};
const PILL_MIC_BG = "linear-gradient(90deg, rgba(255,184,200,0.18) 0%, rgba(40,10,20,0.85) 45%, rgba(40,10,20,0.9) 100%)";
const PILL_DEFAULT_BG = "rgba(20,5,12,0.6)";
const PILL_DEFAULT_BORDER = "rgba(255,180,200,0.30)";
const PILL_DEFAULT_TEXT = "#fbe0e7";
const PREV_STYLE = {
  textColor: "#b08a98",
  bgColor: "rgba(20,5,12,0.35)",
  borderColor: "rgba(255,180,200,0.18)"
};
const PREV_LABEL = "Previous Tiers Rewards…";
const NSFW_STYLE = {
  textColor: "#ff8aa0",
  bgColor: "rgba(255,138,160,0.18)",
  borderColor: "rgba(255,138,160,0.55)"
};
const INITIAL_TIERS = [{
  key: "yokan",
  name: "Yokan",
  kanji: "羊羹",
  perks: [p("SFW + NSFW Art"), p("Brushes"), p("Sketches"), p("Character Suggestion")]
}, {
  key: "sensu",
  name: "Sensu",
  kanji: "扇子",
  perks: [p(PREV_LABEL, PREV_STYLE), p("Character Polls"), p("Extra Art!!")]
}, {
  key: "tomo",
  name: "Tomo",
  kanji: "友",
  perks: [p(PREV_LABEL, PREV_STYLE), p("RP Audio + ASMR / 18+", {
    ...NSFW_STYLE,
    showMic: true,
    showVisualizer: true
  }), p("Voice Notes", {
    showMic: true
  }), p("Cosplay")]
}, {
  key: "okami",
  name: "Okami",
  kanji: "女将",
  premium: true,
  perks: [p(PREV_LABEL, PREV_STYLE), p("Art + Audio Voting", {
    showVisualizer: true
  }), p("Art x Audio RP / +10 Min", {
    showMic: true,
    showVisualizer: true,
    badge: "+10 MIN",
    badgeBg: ACCENT_MID,
    badgeTextColor: "#2a0a14"
  })]
}, {
  key: "danna",
  name: "Danna",
  kanji: "旦那",
  premium: true,
  perks: [p(PREV_LABEL, PREV_STYLE), p("Climax / 18+", NSFW_STYLE), p("Personalized content with ME"), p("MORE PICS AND COSPLAYS!!!")]
}, {
  key: "kami",
  name: "Kami Sama",
  kanji: "神様",
  premium: true,
  perks: [p(PREV_LABEL, PREV_STYLE), p("Monthly Shikishi — original framed art", {
    badge: "SOLD OUT",
    badgeBg: "#1a1a1a",
    badgeTextColor: "#e8c878"
  }), p("Golden Kami Charm (12-month reward)"), p("Limited spaces — VIP treatment")]
}];
const mk = (src, nsfw = false) => ({
  src,
  nsfw,
  zoom: 1,
  posX: 50,
  posY: 30
});
const DEFAULT_SLOTS = {
  yokan: [mk(PLACEHOLDER_IMG), mk(PLACEHOLDER_IMG)],
  sensu: [mk(PLACEHOLDER_IMG), mk(PLACEHOLDER_IMG)],
  tomo: [mk(PLACEHOLDER_IMG), mk(PLACEHOLDER_IMG)],
  okami: [mk(PLACEHOLDER_IMG), mk(PLACEHOLDER_IMG)],
  danna: [mk(PLACEHOLDER_IMG), mk(PLACEHOLDER_IMG)],
  kami: [mk(PLACEHOLDER_IMG), mk(PLACEHOLDER_IMG)]
};
const TEXT_STATE_CACHE_KEY = "iomaya-mai-text-state";
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
function waitForImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener("load", () => resolve(), {
        once: true
      });
      img.addEventListener("error", () => resolve(), {
        once: true
      });
    });
  }));
}
async function getLocalFontEmbedCSS() {
  const response = await fetch("/fonts/HakkouMincho.ttf", {
    cache: "force-cache"
  });
  if (!response.ok) throw new Error("Failed to load export font");
  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return `@font-face{font-family:"HakkouMincho";src:url(${dataUrl}) format("truetype");font-weight:400 700;font-style:normal;font-display:block;}@font-face{font-family:"HakkouMincho";src:url(${dataUrl}) format("truetype");font-weight:400 700;font-style:italic;font-display:block;}`;
}
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
function readCachedTextState() {
  try {
    const cached2 = window.localStorage.getItem(TEXT_STATE_CACHE_KEY);
    return cached2 ? JSON.parse(cached2) : null;
  } catch {
    return null;
  }
}
function cacheTextState(state) {
  try {
    window.localStorage.setItem(TEXT_STATE_CACHE_KEY, JSON.stringify(state));
  } catch {
  }
}
function Index() {
  const [tab, setTab] = reactExports.useState(() => {
    if (typeof window === "undefined") return "patreon";
    return localStorage.getItem("active-tab") || "patreon";
  });
  reactExports.useEffect(() => {
    try {
      localStorage.setItem("active-tab", tab);
    } catch {
    }
  }, [tab]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen w-full", style: {
    background: "#2a0a14"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      position: "fixed",
      top: 18,
      left: 22,
      zIndex: 50,
      pointerEvents: "none",
      userSelect: "none"
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "44", height: "44", viewBox: "0 0 100 100", style: {
      animation: "sakura-spin 18s linear infinite",
      filter: "drop-shadow(0 0 10px rgba(255,160,190,0.55))"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes sakura-spin { to { transform: rotate(360deg); } }` }),
      [0, 72, 144, 216, 288].map((deg) => /* @__PURE__ */ jsxRuntimeExports.jsx("ellipse", { cx: "50", cy: "28", rx: "14", ry: "22", fill: "#ffb8c8", opacity: "0.90", transform: `rotate(${deg} 50 50)` }, deg)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "50", cy: "50", r: "10", fill: "#ff8aaa" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "50", cy: "50", r: "6", fill: "#ffccd8" }),
      [0, 60, 120, 180, 240, 300].map((deg) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { transform: `rotate(${deg} 50 50)`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "50", y1: "44", x2: "50", y2: "38", stroke: "#c8132a", strokeWidth: "1.4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "50", cy: "37", r: "2", fill: "#c8132a" })
      ] }, deg))
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full flex justify-center pt-4 pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex rounded-full p-1 gap-1", style: {
      background: "rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,180,200,0.25)"
    }, children: [{
      id: "patreon",
      label: "Patreon Showcase"
    }, {
      id: "twitch",
      label: "Twitch Overlays"
    }, {
      id: "audio",
      label: "Audio Teasers"
    }].map(({
      id,
      label
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(id), className: "px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition", style: {
      background: tab === id ? "linear-gradient(135deg,#c8132a,#8a0a1c)" : "transparent",
      color: tab === id ? "#fff0f4" : "#ffd0dc"
    }, children: label }, id)) }) }),
    tab === "patreon" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PatreonShowcase, {}) : tab === "twitch" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TwitchOverlays, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(AudioTeaserBuilder, {})
  ] });
}
function TwitchOverlays() {
  const [sub, setSub] = reactExports.useState(() => {
    if (typeof window === "undefined") return "patreon";
    return localStorage.getItem("twitch-sub-tab") || "patreon";
  });
  reactExports.useEffect(() => {
    try {
      localStorage.setItem("twitch-sub-tab", sub);
    } catch {
    }
  }, [sub]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full flex justify-center pt-1 pb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex rounded-full p-1 gap-1", style: {
      background: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,180,200,0.18)"
    }, children: [{
      id: "patreon",
      label: "Patreon",
      kanji: "支援"
    }, {
      id: "gamersupps",
      label: "Gamersupps",
      kanji: "飲"
    }].map(({
      id,
      label,
      kanji
    }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setSub(id), className: "px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] transition inline-flex items-center gap-2", style: {
      background: sub === id ? "linear-gradient(135deg,#c8132a,#8a0a1c)" : "transparent",
      color: sub === id ? "#fff0f4" : "#ffd0dc"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-xs", style: {
        color: sub === id ? "#ffe2ec" : "#ffb8c8"
      }, children: kanji }),
      label
    ] }, id)) }) }),
    sub === "patreon" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TwitchOverlayBuilder, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(GamersuppsBuilder, {})
  ] });
}
function PatreonShowcase() {
  const [slots, setSlots] = reactExports.useState(DEFAULT_SLOTS);
  const [tiers, setTiers] = reactExports.useState(INITIAL_TIERS);
  const [dateText, setDateText] = reactExports.useState("MAY 2025");
  const canvasRef = reactExports.useRef(null);
  const didSkipInitialSave = reactExports.useRef(false);
  const userEditedText = reactExports.useRef(false);
  const [exporting, setExporting] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached2 = readCachedTextState();
      if (cached2) {
        if (cached2.tiers) setTiers(cached2.tiers);
        if (cached2.dateText) setDateText(cached2.dateText);
      }
      let data = null;
      let error = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await supabase.from("app_state").select("data").eq("id", "singleton").maybeSingle();
        data = result.data;
        error = result.error;
        if (!error) break;
        await wait(500 * (attempt + 1));
      }
      if (cancelled) return;
      if (error) console.error("Load failed:", error);
      const payload = data?.data;
      if (payload && !userEditedText.current) {
        if (payload.tiers) setTiers(payload.tiers);
        if (payload.dateText) setDateText(payload.dateText);
        cacheTextState(payload);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!didSkipInitialSave.current) {
      didSkipInitialSave.current = true;
      return;
    }
    const payload = {
      tiers,
      dateText
    };
    cacheTextState(payload);
    const handle = setTimeout(() => {
      (async () => {
        let lastError = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const {
            error
          } = await supabase.from("app_state").upsert({
            id: "singleton",
            data: payload,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          lastError = error;
          if (!error) return;
          await wait(500 * (attempt + 1));
        }
        console.error("Save failed:", lastError);
      })();
    }, 600);
    return () => clearTimeout(handle);
  }, [tiers, dateText]);
  const handleTiersChange = (next) => {
    userEditedText.current = true;
    cacheTextState({
      tiers: next,
      dateText
    });
    setTiers(next);
  };
  const handleDateChange = (next) => {
    userEditedText.current = true;
    cacheTextState({
      tiers,
      dateText: next
    });
    setDateText(next);
  };
  const updateSlot = (tierKey, idx, next) => {
    setSlots((prev) => ({
      ...prev,
      [tierKey]: prev[tierKey].map((s, i) => i === idx ? {
        ...s,
        ...next
      } : s)
    }));
  };
  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    const exportNode = canvasRef.current.firstElementChild ?? canvasRef.current;
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      let fontEmbedCSS = "";
      try {
        fontEmbedCSS = await getLocalFontEmbedCSS();
      } catch (e) {
        console.warn("Font embed failed, continuing without inlined fonts:", e);
      }
      const opts = {
        cacheBust: true,
        pixelRatio: 2,
        width: 1080,
        height: 1280,
        fontEmbedCSS,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true")
      };
      await waitForImages(exportNode);
      await toPng(exportNode, opts);
      const dataUrl = await toPng(exportNode, opts);
      const link = document.createElement("a");
      link.download = "iomaya-mai-monthly-rewards.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen w-full flex flex-col items-center gap-6 py-8 px-4", style: {
    background: "#2a0a14"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleExport, disabled: exporting, className: "px-6 py-2.5 rounded-full text-sm font-semibold tracking-widest uppercase transition-all hover:scale-105 disabled:opacity-60", style: {
      background: "linear-gradient(135deg, #c8132a, #8a0a1c)",
      color: "#fff0f4",
      border: "1px solid rgba(255,200,215,0.4)",
      boxShadow: "0 6px 24px rgba(200,19,42,0.45), 0 0 0 1px rgba(255,180,200,0.15) inset"
    }, children: exporting ? "Exporting…" : "Export as Image" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full flex justify-center items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShowcaseTip, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CanvasScaler, { innerRef: canvasRef, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Canvas, { tiers, slots, onUpdateSlot: updateSlot, dateText }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Editor, { tiers, onTiersChange: handleTiersChange, slots, onChange: setSlots, dateText, onDateChange: handleDateChange })
  ] });
}
function SquiggleArrow({
  flip = false,
  className = ""
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className, style: {
    transform: flip ? "scaleX(-1)" : void 0,
    backgroundColor: "#ffb8c8",
    WebkitMaskImage: `url(${squiggleArrowAsset.url})`,
    maskImage: `url(${squiggleArrowAsset.url})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    filter: "drop-shadow(0 2px 12px rgba(255,140,170,0.35))"
  } });
}
function ShowcaseTip() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden xl:flex absolute top-24 flex-col items-end gap-2 pointer-events-none select-none", style: {
    left: "calc(50% - 820px)",
    width: 220,
    color: "#ffd0dc"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-menu italic text-right leading-tight", style: {
      fontSize: 18,
      color: "#ffe2ea",
      textShadow: "0 2px 12px rgba(255,140,170,0.4)",
      transform: "rotate(-4deg)"
    }, children: [
      "psst — drag",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      "images in the",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      "tier panel below",
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] tracking-[0.25em] uppercase mt-1 opacity-70", children: "position & zoom" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SquiggleArrow, { className: "w-[180px] h-[110px] -mt-2 mr-2" })
  ] });
}
function EditorTip() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden lg:flex items-center gap-2 pointer-events-none select-none", style: {
    color: "#ffd0dc"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SquiggleArrow, { flip: true, className: "w-[110px] h-[70px] -mb-3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-menu italic leading-tight", style: {
      fontSize: 14,
      color: "#ffe2ea",
      textShadow: "0 2px 10px rgba(255,140,170,0.35)",
      transform: "rotate(2deg)"
    }, children: [
      "reorder descriptions",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] tracking-[0.2em] uppercase opacity-70", children: "arrows on the left ↑↓" })
    ] })
  ] });
}
function CanvasScaler({
  children,
  innerRef
}) {
  const [scale, setScale] = reactExports.useState(1);
  reactExports.useEffect(() => {
    const update = () => {
      const max = Math.min(window.innerWidth - 32, 1080);
      setScale(Math.min(1, max / 1080));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
    width: 1080 * scale,
    height: 1280 * scale
  }, className: "relative", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: innerRef, style: {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: 1080,
    height: 1280,
    boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,180,200,0.08), inset 0 0 120px rgba(0,0,0,0.35)",
    borderRadius: 8,
    overflow: "hidden"
  }, className: "absolute top-0 left-0", children }) });
}
function Canvas({
  tiers,
  slots,
  onUpdateSlot,
  dateText
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative font-menu", style: {
    width: 1080,
    height: 1280,
    overflow: "hidden",
    background: "radial-gradient(ellipse at 30% 20%, #6b1230 0%, #4a0c22 35%, #2a0712 70%, #1a040c 100%)",
    color: "#f7e2e8"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay", style: {
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='9'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.7  0 0 0 0 0.78  0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute pointer-events-none", style: {
      inset: 24,
      border: "1px solid rgba(255,180,200,0.22)",
      boxShadow: "inset 0 0 80px rgba(0,0,0,0.45)"
    } }),
    [{
      x: 60,
      y: 60,
      r: -18,
      s: 0.65,
      o: 0.6
    }, {
      x: 180,
      y: 150,
      r: 30,
      s: 0.55,
      o: 0.5
    }, {
      x: 320,
      y: 70,
      r: -45,
      s: 0.5,
      o: 0.45
    }, {
      x: 90,
      y: 175,
      r: 55,
      s: 0.45,
      o: 0.4
    }].map((pt, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: petal.url, alt: "", className: "absolute pointer-events-none select-none", style: {
      left: pt.x,
      top: pt.y,
      width: 90 * pt.s,
      height: "auto",
      transform: `rotate(${pt.r}deg)`,
      opacity: pt.o,
      filter: "drop-shadow(0 2px 6px rgba(255,140,170,0.3))",
      zIndex: 1
    } }, `h${i}`)),
    [{
      x: 120,
      y: 950,
      r: 20,
      s: 0.7,
      o: 0.55
    }, {
      x: 260,
      y: 1e3,
      r: -35,
      s: 0.55,
      o: 0.45
    }, {
      x: 820,
      y: 970,
      r: 48,
      s: 0.6,
      o: 0.5
    }, {
      x: 940,
      y: 1010,
      r: -12,
      s: 0.5,
      o: 0.45
    }, {
      x: 60,
      y: 1020,
      r: 65,
      s: 0.45,
      o: 0.4
    }].map((pt, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: petal.url, alt: "", className: "absolute pointer-events-none select-none", style: {
      left: pt.x,
      top: pt.y,
      width: 90 * pt.s,
      height: "auto",
      transform: `rotate(${pt.r}deg)`,
      opacity: pt.o,
      filter: "drop-shadow(0 2px 6px rgba(255,140,170,0.3))",
      zIndex: 1
    } }, `f${i}`)),
    [{
      x: 18,
      y: 320,
      r: -22,
      s: 0.55,
      o: 0.18
    }, {
      x: 8,
      y: 470,
      r: 40,
      s: 0.45,
      o: 0.15
    }, {
      x: 30,
      y: 610,
      r: -50,
      s: 0.5,
      o: 0.16
    }, {
      x: 10,
      y: 780,
      r: 25,
      s: 0.4,
      o: 0.14
    }, {
      x: 36,
      y: 880,
      r: 60,
      s: 0.5,
      o: 0.16
    }].map((pt, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: petal.url, alt: "", className: "absolute pointer-events-none select-none", style: {
      left: pt.x,
      top: pt.y,
      width: 90 * pt.s,
      height: "auto",
      transform: `rotate(${pt.r}deg)`,
      opacity: pt.o,
      filter: "blur(3px)",
      zIndex: 0
    } }, `b${i}`)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: chibi.url, alt: "", className: "absolute pointer-events-none select-none", style: {
      top: 24,
      right: 56,
      width: 140,
      filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.45))",
      zIndex: 3
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: thankYou.url, alt: "thank you", className: "absolute pointer-events-none select-none", style: {
      top: 40,
      right: 186,
      width: 92,
      transform: "rotate(-10deg)",
      filter: "drop-shadow(0 2px 10px rgba(255,140,170,0.45))",
      zIndex: 3
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-col items-center pt-14 pb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] tracking-[0.6em] uppercase", style: {
        color: "#f0a8b8"
      }, children: "Patreon.com / Iomaya Mai" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-hakkou text-[68px] leading-none mt-3", style: {
        color: "#fff0f4",
        textShadow: "0 2px 18px rgba(255,120,150,0.35)"
      }, children: "月間リワード" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-menu italic text-[22px] mt-2", style: {
        color: "#f0a8b8"
      }, children: "— Monthly Reward Menu —" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative mt-2 flex flex-col", style: {
      padding: "0 56px"
    }, children: tiers.map((t, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TierRow, { tier: t, images: slots[t.key], onUpdateSlot, index: i, total: tiers.length }),
      i < tiers.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-1", style: {
        height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,180,200,0.18) 30%, rgba(255,180,200,0.28) 50%, rgba(255,180,200,0.18) 70%, transparent 100%)"
      } })
    ] }, t.key)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute left-0 right-0 flex flex-col items-center", style: {
      bottom: 48
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-menu text-[22px] tracking-[0.45em]", style: {
        color: "#fff0f4"
      }, children: dateText }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-hakkou text-[14px] tracking-[0.6em] mt-1", style: {
        color: "#d98aa0"
      }, children: "月間リワード" })
    ] })
  ] });
}
function AdjustOverlay({
  im,
  clipPath,
  left,
  width,
  onChange
}) {
  const ref = reactExports.useRef(null);
  const imRef = reactExports.useRef(im);
  imRef.current = im;
  reactExports.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const cur = imRef.current;
      const delta = -e.deltaY * 15e-4;
      const next = Math.max(1, Math.min(6, cur.zoom + delta));
      onChange({
        zoom: parseFloat(next.toFixed(3))
      });
    };
    el.addEventListener("wheel", onWheel, {
      passive: false
    });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onChange]);
  const handleDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = imRef.current.posX;
    const startPosY = imRef.current.posY;
    const sens = 0.35;
    const onMove = (ev) => {
      const z = Math.max(1, imRef.current.zoom);
      const dx = (ev.clientX - startX) / rect.width * 100 * (sens / z);
      const dy = (ev.clientY - startY) / rect.height * 100 * (sens / z);
      onChange({
        posX: Math.max(0, Math.min(100, startPosX - dx)),
        posY: Math.max(0, Math.min(100, startPosY - dy))
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, className: "absolute top-0 h-full cursor-move group", style: {
    left: `${left}%`,
    width: `${width}%`,
    WebkitClipPath: clipPath,
    clipPath
  }, onMouseDown: handleDown, onDoubleClick: () => onChange({
    zoom: 1,
    posX: 50,
    posY: 30
  }), title: "Drag to pan · Scroll to zoom · Double-click to reset", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold pointer-events-none", style: {
    top: 8,
    right: 10,
    background: "rgba(0,0,0,0.6)",
    color: "#ffd6e0",
    border: "1px solid rgba(255,200,215,0.35)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Move, { size: 11 }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
      im.zoom.toFixed(2),
      "×"
    ] })
  ] }) });
}
function TierRow({
  tier,
  images,
  onUpdateSlot,
  index,
  total
}) {
  const isTop = index === total - 1;
  const isMid = index === total - 2 && tier.premium;
  const isKami = tier.key === "kami";
  const rowHeight = isTop ? 156 : tier.premium ? 142 : 128;
  const nameColor = isKami ? "#ffffff" : tier.premium ? "#fff8fa" : "#f7dde4";
  const kanjiColor = isKami ? ACCENT_KAMI : tier.premium ? "#ffd6e0" : "#e8a8b8";
  const groupWidthPct = 64;
  const mid = 50;
  const skew = 6;
  const s0Width = mid + skew;
  const s1Left = mid - skew;
  const s1Width = 100 - s1Left;
  const slices = [{
    left: 0,
    width: s0Width
  }, {
    left: s1Left,
    width: s1Width
  }];
  const polys = [`polygon(0 0, 100% 0, ${(mid - skew) / s0Width * 100}% 100%, 0 100%)`, `polygon(${(mid + skew - s1Left) / s1Width * 100}% 0, 100% 0, 100% 100%, 0 100%)`];
  const prestigeBg = isKami && isTop ? {
    background: "linear-gradient(90deg, rgba(58,28,42,0.62) 0%, rgba(44,20,32,0.45) 40%, rgba(40,18,28,0.18) 75%, transparent 100%)",
    boxShadow: "inset 0 0 50px rgba(0,0,0,0.4), inset 0 0 110px rgba(232,200,120,0.10)"
  } : isTop ? {
    background: "linear-gradient(90deg, rgba(255,180,200,0.16) 0%, rgba(255,150,175,0.09) 35%, transparent 72%)",
    boxShadow: "inset 0 0 55px rgba(255,150,180,0.16)"
  } : isMid ? {
    background: "linear-gradient(90deg, rgba(255,180,195,0.11) 0%, rgba(255,150,175,0.07) 38%, transparent 75%)",
    boxShadow: "inset 0 0 36px rgba(255,150,180,0.11)"
  } : void 0;
  const tierBorderColor = isKami && isTop ? ACCENT_KAMI : isTop ? ACCENT_TOP : isMid ? ACCENT_MID : "transparent";
  const borderWidth = isTop ? 4 : tier.premium ? 3 : 3;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full overflow-hidden", style: {
    height: rowHeight,
    borderLeft: `${borderWidth}px solid ${tierBorderColor}`,
    paddingLeft: 18,
    ...prestigeBg
  }, children: [
    tier.premium && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-0 top-0 h-full pointer-events-none", style: {
      width: isTop ? 110 : 80,
      background: isKami && isTop ? "linear-gradient(90deg, rgba(232,200,120,0.28) 0%, rgba(30,14,22,0.40) 50%, transparent 100%)" : isTop ? "linear-gradient(90deg, rgba(255,200,160,0.30) 0%, rgba(255,180,200,0.18) 40%, transparent 100%)" : "linear-gradient(90deg, rgba(255,180,200,0.16) 0%, transparent 100%)"
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 right-0 h-full pointer-events-none", style: {
      width: `${groupWidthPct}%`,
      WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 55%, #000 100%)",
      maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 55%, #000 100%)"
    }, children: images.slice(0, 2).map((im, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 h-full overflow-hidden", style: {
      left: `${slices[idx].left}%`,
      width: `${slices[idx].width}%`,
      WebkitClipPath: polys[idx],
      clipPath: polys[idx]
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: im.src, alt: "", className: "absolute inset-0 w-full h-full", style: {
      objectFit: "cover",
      objectPosition: `${im.posX}% ${im.posY}%`,
      transform: `scale(${im.zoom}) ${im.nsfw ? "scale(1.1)" : ""}`.trim(),
      transformOrigin: `${im.posX}% ${im.posY}%`,
      filter: im.nsfw ? "blur(16px) saturate(1.1)" : "none"
    } }) }, idx)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 right-0 h-full pointer-events-none", style: {
      width: `${groupWidthPct}%`,
      background: isKami && isTop ? "linear-gradient(90deg, transparent 0%, rgba(30,14,22,0.30) 60%, rgba(30,14,22,0.42) 100%)" : "linear-gradient(90deg, transparent 0%, rgba(74,12,34,0.28) 55%, rgba(74,12,34,0.42) 100%)",
      mixBlendMode: "multiply"
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-export-ignore": "true", className: "absolute top-0 right-0 h-full z-30", style: {
      width: `${groupWidthPct}%`
    }, children: images.slice(0, 2).map((im, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(AdjustOverlay, { im, clipPath: polys[idx], left: slices[idx].left, width: slices[idx].width, onChange: (next) => onUpdateSlot(tier.key, idx, next) }, idx)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative h-full flex items-center z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-4", children: [
      tier.premium && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-menu", style: {
        fontSize: isTop ? 26 : 20,
        color: isKami && isTop ? ACCENT_KAMI : isTop ? ACCENT_TOP : ACCENT_MID,
        letterSpacing: "-0.15em",
        marginRight: 4,
        textShadow: isKami && isTop ? "0 0 14px rgba(232,200,120,0.7), 0 0 2px rgba(0,0,0,0.9)" : isTop ? "0 0 12px rgba(255,200,140,0.6)" : "none"
      }, children: isKami && isTop ? "⛩" : isTop ? "✦✦" : "✦" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-menu", style: {
        fontSize: isTop ? 66 : tier.premium ? 56 : 50,
        color: nameColor,
        lineHeight: 1,
        letterSpacing: "0.04em",
        textShadow: isKami && isTop ? "0 2px 24px rgba(232,200,120,0.55), 0 0 1px rgba(255,240,200,0.6), 0 2px 8px rgba(0,0,0,0.85)" : isTop ? "0 2px 22px rgba(255,180,140,0.65), 0 0 1px rgba(255,235,210,0.7)" : isMid ? "0 2px 12px rgba(255,150,180,0.40)" : "0 2px 10px rgba(0,0,0,0.4)"
      }, children: tier.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-menu", style: {
        fontSize: isTop ? 34 : tier.premium ? 30 : 26,
        color: kanjiColor,
        opacity: 0.95
      }, children: [
        "(",
        tier.kanji,
        ")"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1.5 z-20", children: tier.perks.map((perk) => /* @__PURE__ */ jsxRuntimeExports.jsx(PerkPill, { perk, tierAccent: TIER_ACCENT[tier.key] || ACCENT_STD }, perk.id)) })
  ] });
}
function PerkPill({
  perk,
  tierAccent = ACCENT_STD
}) {
  const bars = [3, 6, 9, 5, 8, 4, 7, 10, 6, 3];
  const accent = perk.accentColor || tierAccent;
  const bg = perk.bgColor || (perk.showMic || perk.showVisualizer ? PILL_MIC_BG : PILL_DEFAULT_BG);
  const border = perk.borderColor || PILL_DEFAULT_BORDER;
  const color = perk.textColor || PILL_DEFAULT_TEXT;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest inline-flex items-center gap-1.5", style: {
    background: bg,
    color,
    border: `1px solid ${border}`,
    boxShadow: perk.borderColor ? `0 0 10px ${accent}55` : "none"
  }, children: [
    perk.showMic && /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { size: 10, strokeWidth: 2.5, style: {
      color: accent,
      filter: `drop-shadow(0 0 4px ${accent}aa)`
    } }),
    perk.showVisualizer && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-end gap-[1.5px] h-[11px]", children: bars.map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
      width: 1.5,
      height: h,
      background: `linear-gradient(180deg, ${accent}, ${accent}66)`,
      borderRadius: 1,
      boxShadow: `0 0 3px ${accent}88`
    } }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: perk.label }),
    perk.badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 px-2 rounded-full leading-none py-[3px]", style: {
      background: perk.badgeBg ? `linear-gradient(135deg, ${perk.badgeBg}, ${perk.badgeBg}aa)` : "rgba(255,255,255,0.15)",
      color: perk.badgeTextColor || "#2a0a14",
      letterSpacing: "0.08em",
      boxShadow: perk.badgeBg ? `0 0 6px ${perk.badgeBg}88` : "none",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontWeight: 800,
      fontSize: 11,
      fontStyle: "normal",
      whiteSpace: "nowrap"
    }, children: perk.badge })
  ] });
}
function Editor({
  tiers,
  onTiersChange,
  slots,
  onChange,
  dateText,
  onDateChange
}) {
  const updateSlot = (tierKey, idx, next) => {
    const arr = slots[tierKey].map((s, i) => i === idx ? {
      ...s,
      ...next
    } : s);
    onChange({
      ...slots,
      [tierKey]: arr
    });
  };
  const moveTier = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= tiers.length) return;
    const next = [...tiers];
    [next[i], next[j]] = [next[j], next[i]];
    onTiersChange(next);
  };
  const updateTier = (i, next) => {
    onTiersChange(tiers.map((t, idx) => idx === i ? {
      ...t,
      ...next
    } : t));
  };
  const updatePerk = (ti, pi, next) => {
    const newPerks = tiers[ti].perks.map((p2, j) => j === pi ? {
      ...p2,
      ...next
    } : p2);
    updateTier(ti, {
      perks: newPerks
    });
  };
  const movePerk = (ti, pi, dir) => {
    const arr = [...tiers[ti].perks];
    const j = pi + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[pi], arr[j]] = [arr[j], arr[pi]];
    updateTier(ti, {
      perks: arr
    });
  };
  const addPerk = (ti) => {
    updateTier(ti, {
      perks: [...tiers[ti].perks, p("NEW")]
    });
  };
  const removePerk = (ti, pi) => {
    updateTier(ti, {
      perks: tiers[ti].perks.filter((_, j) => j !== pi)
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-[1080px] rounded-lg p-6 flex flex-col gap-5", style: {
    background: "rgba(255,240,244,0.06)",
    border: "1px solid rgba(255,180,200,0.18)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm tracking-[0.3em] uppercase", style: {
        color: "#f0a8b8"
      }, children: "Editor" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-[12px]", style: {
        color: "#fbe0e7"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tracking-[0.2em] uppercase", style: {
          color: "#f0a8b8"
        }, children: "Date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: dateText, onChange: (e) => onDateChange(e.target.value), placeholder: "MAY 2025", className: "px-3 py-1.5 rounded text-[12px] tracking-[0.2em] uppercase outline-none focus:ring-2", style: {
          background: "rgba(20,5,12,0.7)",
          border: "1px solid rgba(255,180,200,0.3)",
          color: "#fff0f4",
          minWidth: 160
        } })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-3", children: tiers.map((t, ti) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 p-3 rounded", style: {
      background: "rgba(20,5,12,0.5)",
      border: "1px solid rgba(255,180,200,0.18)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => moveTier(ti, -1), disabled: ti === 0, className: "p-1 rounded disabled:opacity-30 hover:bg-white/10", title: "Move up", style: {
            color: "#f0a8b8"
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { size: 12 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => moveTier(ti, 1), disabled: ti === tiers.length - 1, className: "p-1 rounded disabled:opacity-30 hover:bg-white/10", title: "Move down", style: {
            color: "#f0a8b8"
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { size: 12 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-3 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold text-2xl tracking-wide", style: {
            color: "#fff0f4"
          }, children: [
            t.premium ? "✦ " : "",
            t.name
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-hakkou text-xl", style: {
            color: "#ffb8c8"
          }, children: t.kanji }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] tracking-widest uppercase opacity-60", style: {
            color: "#f0a8b8"
          }, children: [
            t.premium ? "Premium" : "Standard",
            " · #",
            ti + 1
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: slots[t.key].map((s, idx) => {
        const side = idx === 0 ? "LEFT" : "RIGHT";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5 p-2 rounded", style: {
          background: "rgba(255,240,244,0.04)",
          border: "1px dashed rgba(255,180,200,0.25)"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded", style: {
              background: idx === 0 ? "rgba(200,19,42,0.85)" : "rgba(255,180,140,0.85)",
              color: "#2a0a14"
            }, children: side }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] opacity-60", style: {
              color: "#fbe0e7"
            }, children: [
              "Image #",
              idx + 1
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-full aspect-video overflow-hidden rounded", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: s.src, alt: "", className: "w-full h-full object-cover", style: {
            filter: s.nsfw ? "blur(8px)" : "none",
            transform: s.nsfw ? "scale(1.1)" : "none"
          } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[12px] font-semibold cursor-pointer text-center py-2 rounded inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity", style: {
            background: "linear-gradient(135deg, #c8132a, #8a0a1c)",
            color: "#fff",
            border: "1px solid rgba(255,200,215,0.4)",
            boxShadow: "0 2px 10px rgba(200,19,42,0.35)"
          }, title: `Click to upload ${side.toLowerCase()} image`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePlus, { size: 14 }),
            "Click to upload ",
            side.toLowerCase(),
            " image",
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", accept: "image/*", className: "hidden", onChange: async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const src = await readImageFile(file);
                updateSlot(t.key, idx, {
                  src,
                  zoom: 1,
                  posX: 50,
                  posY: 30
                });
              } catch (err) {
                console.error("Image upload failed:", err);
              }
            } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between gap-2 text-[12px] cursor-pointer px-2.5 py-1.5 rounded", style: {
            color: "#fbe0e7",
            background: s.nsfw ? "rgba(255,138,160,0.18)" : "rgba(20,5,12,0.4)",
            border: `1px solid ${s.nsfw ? "rgba(255,138,160,0.55)" : "rgba(255,180,200,0.2)"}`
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold tracking-wide", children: "NSFW blur" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "switch", "aria-checked": s.nsfw, className: "relative inline-block", style: {
              width: 36,
              height: 20,
              borderRadius: 999,
              background: s.nsfw ? "#ff5a78" : "rgba(255,255,255,0.15)",
              transition: "background 0.15s"
            }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
              position: "absolute",
              top: 2,
              left: s.nsfw ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.15s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
            } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", className: "sr-only", checked: s.nsfw, onChange: (e) => updateSlot(t.key, idx, {
              nsfw: e.target.checked
            }) })
          ] })
        ] }, idx);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2 rounded flex flex-col gap-2", style: {
        background: "rgba(255,240,244,0.04)",
        border: "1px dashed rgba(255,180,200,0.25)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold tracking-[0.2em] uppercase", style: {
              color: "#f0a8b8"
            }, children: "Descriptions" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(EditorTip, {})
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => addPerk(ti), className: "text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded", style: {
            background: "#c8132a",
            color: "#fff"
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 11 }),
            " Add"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5 p-2 rounded", style: {
          background: "rgba(20,5,12,0.6)"
        }, children: [
          t.perks.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] opacity-50", style: {
            color: "#fbe0e7"
          }, children: "No descriptions" }),
          t.perks.map((perk) => /* @__PURE__ */ jsxRuntimeExports.jsx(PerkPill, { perk, tierAccent: TIER_ACCENT[t.key] || ACCENT_STD }, perk.id))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: t.perks.map((perk, pi) => /* @__PURE__ */ jsxRuntimeExports.jsx(PerkEditor, { perk, tierAccent: TIER_ACCENT[t.key] || ACCENT_STD, canUp: pi > 0, canDown: pi < t.perks.length - 1, onMove: (dir) => movePerk(ti, pi, dir), onChange: (next) => updatePerk(ti, pi, next), onRemove: () => removePerk(ti, pi) }, perk.id)) })
      ] })
    ] }, t.key)) })
  ] });
}
function PerkEditor({
  perk,
  tierAccent,
  canUp,
  canDown,
  onMove,
  onChange,
  onRemove
}) {
  const hasAudio = !!perk.showMic || !!perk.showVisualizer;
  const effectiveAccent = perk.accentColor || tierAccent;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 p-3 rounded-md", style: {
    background: "rgba(20,5,12,0.55)",
    border: "1px solid rgba(255,180,200,0.18)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onMove(-1), disabled: !canUp, className: "p-0.5 rounded disabled:opacity-30 hover:bg-white/10", style: {
          color: "#f0a8b8"
        }, title: "Move up", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { size: 12 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onMove(1), disabled: !canDown, className: "p-0.5 rounded disabled:opacity-30 hover:bg-white/10", style: {
          color: "#f0a8b8"
        }, title: "Move down", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { size: 12 }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: perk.label, onChange: (e) => onChange({
        label: e.target.value
      }), placeholder: "Description text", className: "flex-1 min-w-0 px-2.5 py-1.5 rounded text-[12px] outline-none focus:ring-1 focus:ring-pink-300/40", style: {
        background: "rgba(20,5,12,0.7)",
        border: "1px solid rgba(255,180,200,0.25)",
        color: "#fff0f4"
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onRemove, className: "p-1.5 rounded hover:bg-white/10", style: {
        color: "#ff8aa0"
      }, title: "Remove description", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 13 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] tracking-[0.2em] uppercase opacity-60", style: {
        color: "#f0a8b8"
      }, children: "Pill" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ColorField, { label: "Text", value: perk.textColor, onChange: (v) => onChange({
        textColor: v
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ColorField, { label: "Fill", value: perk.bgColor, onChange: (v) => onChange({
        bgColor: v
      }), allowGradient: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ColorField, { label: "Border", value: perk.borderColor, onChange: (v) => onChange({
        borderColor: v
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] tracking-[0.2em] uppercase opacity-60", style: {
        color: "#f0a8b8"
      }, children: "Audio" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-[11px] cursor-pointer", style: {
        color: "#fbe0e7"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: !!perk.showMic, onChange: (e) => onChange({
          showMic: e.target.checked
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { size: 12 }),
        " Mic"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-[11px] cursor-pointer", style: {
        color: "#fbe0e7"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: !!perk.showVisualizer, onChange: (e) => onChange({
          showVisualizer: e.target.checked
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AudioLines, { size: 12 }),
        " Visualizer"
      ] }),
      hasAudio && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 ml-1 pl-2", style: {
        borderLeft: "1px solid rgba(255,180,200,0.18)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ColorField, { label: "Accent", value: perk.accentColor, onChange: (v) => onChange({
          accentColor: v
        }), fallbackHex: effectiveAccent }),
        !perk.accentColor && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] opacity-60", style: {
          color: "#f0a8b8"
        }, children: "using tier default" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] tracking-[0.2em] uppercase opacity-60", style: {
        color: "#f0a8b8"
      }, children: "Badge" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: perk.badge || "", onChange: (e) => onChange({
        badge: e.target.value || void 0
      }), placeholder: "optional, e.g. +20 MIN", className: "px-2 py-1 rounded text-[11px] outline-none w-44", style: {
        background: "rgba(20,5,12,0.7)",
        border: "1px solid rgba(255,180,200,0.25)",
        color: "#fff0f4"
      } }),
      perk.badge && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ColorField, { label: "Fill", value: perk.badgeBg, onChange: (v) => onChange({
          badgeBg: v
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ColorField, { label: "Text", value: perk.badgeTextColor, onChange: (v) => onChange({
          badgeTextColor: v
        }) })
      ] })
    ] })
  ] });
}
function ColorField({
  label,
  value,
  onChange,
  allowGradient,
  fallbackHex
}) {
  const hexMatch = value?.match(/#([0-9a-fA-F]{6})/);
  const hex = hexMatch ? `#${hexMatch[1]}` : fallbackHex || "#ffb8c8";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-[10px]", style: {
    color: "#fbe0e7"
  }, title: label, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "opacity-70 uppercase tracking-wider", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", value: hex, onChange: (e) => onChange(e.target.value), className: "w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" }),
    allowGradient && value && /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value, onChange: (e) => onChange(e.target.value || void 0), placeholder: "rgba/css", className: "px-1 py-0.5 rounded text-[10px] outline-none w-20", style: {
      background: "rgba(20,5,12,0.7)",
      border: "1px solid rgba(255,180,200,0.2)",
      color: "#fff0f4"
    } }),
    value && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(void 0), className: "opacity-60 hover:opacity-100", title: "Clear", style: {
      color: "#f0a8b8"
    }, children: "×" })
  ] });
}
export {
  Index as component
};
