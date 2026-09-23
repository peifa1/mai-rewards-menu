// Panel Rotator widget: builds a self-contained OBS browser-source HTML from the
// uploaded design (5 rotating panels) plus the user's editable configuration.

export type WidgetSlideId = "patreon" | "socials" | "throne" | "comms" | "gsupps";

export const WIDGET_SLIDE_LABELS: Record<WidgetSlideId, string> = {
  patreon: "Patreon",
  socials: "Socials",
  throne: "Throne",
  comms: "Commissions",
  gsupps: "GamerSupps",
};

export type WidgetAssetKey =
  | "banner"
  | "patreon"
  | "x"
  | "yt"
  | "tt"
  | "throne"
  | "squid"
  | "gs_poster"
  | "gs_bottle"
  | "sakura";

export const WIDGET_ASSET_FILES: Record<Exclude<WidgetAssetKey, "sakura">, string> = {
  banner: "/widget/banner.jpg",
  patreon: "/widget/patreon.png",
  x: "/widget/x.png",
  yt: "/widget/yt.png",
  tt: "/widget/tt.png",
  throne: "/widget/throne.png",
  squid: "/widget/squid.png",
  gs_poster: "/widget/gs_poster.jpg",
  gs_bottle: "/widget/gs_bottle.png",
};

export type WidgetConfig = {
  width: number;
  height: number;
  intervalMs: number;
  transition: "fade" | "slide" | "scale" | "wipe" | "flip";
  glow: boolean;
  order: WidgetSlideId[];
  enabled: Record<WidgetSlideId, boolean>;
  sakura: { show: boolean; size: number; spinSec: number; opacity: number };
  // per-slide text
  patreon: { eyebrow: string; name: string; url: string; note: string };
  socials: { xHandle: string; ytHandle: string; ttHandle: string };
  throne: { eyebrow: string; url: string };
  comms: { title: string; url: string; note: string };
  gsupps: { brand: string; save: string; codeLabel: string; code: string };
  // user image overrides (data URLs); "" = use bundled artwork
  images: Partial<Record<WidgetAssetKey, string>>;
};

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  width: 480,
  height: 130,
  intervalMs: 4000,
  transition: "wipe",
  glow: false,
  order: ["patreon", "socials", "throne", "comms", "gsupps"],
  enabled: { patreon: true, socials: true, throne: true, comms: true, gsupps: true },
  sakura: { show: true, size: 58, spinSec: 12, opacity: 1 },
  patreon: { eyebrow: "support me on", name: "Patreon", url: "patreon.com/iomaya", note: "exclusive\ncontent ♡" },
  socials: { xHandle: "@iomayamai", ytHandle: "@iomayaVT", ttHandle: "@iomaya" },
  throne: { eyebrow: "my wishlist", url: "throne.com/iomaya" },
  comms: { title: "Commissions", url: "iomaya.com", note: "let's create\nsomething cute~ ♡" },
  gsupps: { brand: "Gamer Supps", save: "Save 10%", codeLabel: "use code", code: "KRAKEN" },
  images: {},
};

const ALL_SLIDES: WidgetSlideId[] = ["patreon", "socials", "throne", "comms", "gsupps"];

export function normalizeWidgetConfig(raw: Partial<WidgetConfig> | null | undefined): WidgetConfig {
  const d = DEFAULT_WIDGET_CONFIG;
  const c = raw ?? {};
  const order = Array.isArray(c.order) ? c.order.filter((s) => ALL_SLIDES.includes(s)) : [];
  for (const s of ALL_SLIDES) if (!order.includes(s)) order.push(s);
  return {
    width: num(c.width, d.width, 120, 1920),
    height: num(c.height, d.height, 60, 1080),
    intervalMs: num(c.intervalMs, d.intervalMs, 800, 120000),
    transition: (["fade", "slide", "scale", "wipe", "flip"] as const).includes(c.transition as never)
      ? (c.transition as WidgetConfig["transition"])
      : d.transition,
    glow: typeof c.glow === "boolean" ? c.glow : d.glow,
    order,
    enabled: { ...d.enabled, ...(c.enabled ?? {}) },
    sakura: {
      show: c.sakura?.show ?? d.sakura.show,
      size: num(c.sakura?.size, d.sakura.size, 10, 300),
      spinSec: num(c.sakura?.spinSec, d.sakura.spinSec, 1, 120),
      opacity: num(c.sakura?.opacity, d.sakura.opacity, 0, 1),
    },
    patreon: { ...d.patreon, ...(c.patreon ?? {}) },
    socials: { ...d.socials, ...(c.socials ?? {}) },
    throne: { ...d.throne, ...(c.throne ?? {}) },
    comms: { ...d.comms, ...(c.comms ?? {}) },
    gsupps: { ...d.gsupps, ...(c.gsupps ?? {}) },
    images: { ...(c.images ?? {}) },
  };
}

function num(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const multiline = (s: string) => esc(s).replace(/\n/g, "<br>");

export type WidgetBuildOptions = {
  assets: Record<WidgetAssetKey, string>; // resolved URL/data URL per asset
  previewBg?: string; // website preview only
  fastPreview?: boolean;
};

export function buildWidgetHtml(rawCfg: Partial<WidgetConfig>, opts: WidgetBuildOptions): string {
  const cfg = normalizeWidgetConfig(rawCfg);
  const img = (k: WidgetAssetKey) => cfg.images[k] || opts.assets[k] || "";
  const active = cfg.order.filter((s) => cfg.enabled[s]);
  const slides = active.length ? active : (["patreon"] as WidgetSlideId[]);
  const interval = opts.fastPreview ? Math.min(cfg.intervalMs, 1600) : cfg.intervalMs;
  const g = cfg.glow ? " glow" : "";

  const slideHtml = (id: WidgetSlideId, i: number) => {
    const cls = `rs panel slide-${id}${i === 0 ? "" : " out"}`;
    if (id === "patreon")
      return `<div class="${cls}" data-sakura="1">
  <img class="panel-bg" src="${img("banner")}" alt="">
  <div class="scrim"></div>
  <div class="content">
    <div class="patreon-icon"><img src="${img("patreon")}" alt=""></div>
    <div class="patreon-text">
      <span class="patreon-eyebrow${g}">${esc(cfg.patreon.eyebrow)}</span>
      <span class="patreon-name${g}">${esc(cfg.patreon.name)}</span>
      <span class="patreon-url${g}">${esc(cfg.patreon.url)}</span>
    </div>
    <div class="sidenote${g}">${multiline(cfg.patreon.note)}</div>
  </div>
</div>`;
    if (id === "socials")
      return `<div class="${cls}" style="background:transparent;box-shadow:none;overflow:visible">
  <div class="content">
    <div class="social-col left"><div class="social-icon-bg"><img src="${img("x")}" alt=""></div><span class="social-handle${g}">${esc(cfg.socials.xHandle)}</span></div>
    <div class="social-col mid"><div class="social-icon-bg"><img src="${img("yt")}" alt=""></div><span class="social-handle${g}">${esc(cfg.socials.ytHandle)}</span></div>
    <div class="social-col right"><div class="social-icon-bg"><img class="tiktok-white" src="${img("tt")}" alt=""></div><span class="social-handle${g}">${esc(cfg.socials.ttHandle)}</span></div>
  </div>
</div>`;
    if (id === "throne")
      return `<div class="${cls}" data-sakura="1">
  <img class="panel-bg" src="${img("banner")}" alt="">
  <div class="scrim"></div>
  <div class="content">
    <img class="throne-logo" src="${img("throne")}" alt="">
    <div class="throne-divider"></div>
    <div class="throne-text">
      <span class="throne-eyebrow${g}">${esc(cfg.throne.eyebrow)}</span>
      <span class="throne-name${g}">${esc(cfg.throne.url)}</span>
    </div>
  </div>
</div>`;
    if (id === "comms")
      return `<div class="${cls}" data-sakura="1">
  <img class="panel-bg" src="${img("banner")}" alt="">
  <div class="scrim"></div>
  <div class="content">
    <img class="comms-mascot" src="${img("squid")}" alt="">
    <div class="comms-text">
      <span class="comms-title${g}">${esc(cfg.comms.title)}</span>
      <span class="comms-url${g}">${esc(cfg.comms.url)}</span>
    </div>
    <div class="comms-sidenote${g}">${multiline(cfg.comms.note)}</div>
  </div>
</div>`;
    return `<div class="${cls}" style="background:transparent;box-shadow:none;overflow:visible">
  <div class="content">
    <div class="gs-img-left"><img src="${img("gs_poster")}" alt=""></div>
    <div class="gs-center">
      <span class="gs-brand${g}">${esc(cfg.gsupps.brand)}</span>
      <span class="gs-save${g}">${esc(cfg.gsupps.save)}</span>
      <span class="gs-code-label${g}">${esc(cfg.gsupps.codeLabel)}</span>
      <span class="gs-code${g}">${esc(cfg.gsupps.code)}</span>
    </div>
    <div class="gs-img-right"><img src="${img("gs_bottle")}" alt=""></div>
  </div>
</div>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Iomaya · Panel Widget</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;font-family:'Outfit',sans-serif;color:#fff}
body{${opts.previewBg ? `background-image:url('${opts.previewBg}');background-size:cover;background-position:center;` : ""}display:flex;align-items:center;justify-content:center}
.pw{position:relative;display:inline-block;flex-shrink:0}
.corner-sakura{position:absolute;top:-22px;left:-22px;width:${cfg.sakura.size}px;height:${cfg.sakura.size}px;z-index:30;
  animation:spinSakura ${cfg.sakura.spinSec}s linear infinite;filter:drop-shadow(0 0 12px rgba(248,184,204,0.85));
  pointer-events:none;opacity:${cfg.sakura.show ? cfg.sakura.opacity : 0};transition:opacity .4s ease;display:${cfg.sakura.show ? "block" : "none"}}
@keyframes spinSakura{to{transform:rotate(360deg)}}
.mini-rot{position:relative;width:${cfg.width}px;height:${cfg.height}px;flex-shrink:0}
.panel{width:${cfg.width}px;height:${cfg.height}px;position:relative;overflow:hidden;flex-shrink:0;box-shadow:0 12px 40px -12px rgba(0,0,0,0.6)}
.panel-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block}
@keyframes breathe{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.05) translateY(-4px)}}
@keyframes floatA{0%{transform:rotate(-7deg) translateY(0)}30%{transform:rotate(-9deg) translateY(-6px)}60%{transform:rotate(-5deg) translateY(-2px)}100%{transform:rotate(-7deg) translateY(0)}}
@keyframes floatB{0%{transform:translateY(0) scale(1)}25%{transform:translateY(-8px) scale(1.04)}70%{transform:translateY(-3px) scale(1.01)}100%{transform:translateY(0) scale(1)}}
@keyframes floatC{0%{transform:rotate(7deg) translateY(0)}40%{transform:rotate(5deg) translateY(-7px)}75%{transform:rotate(9deg) translateY(-1px)}100%{transform:rotate(7deg) translateY(0)}}
@keyframes gsSwayL{0%,100%{transform:rotate(-4deg) translateY(0)}55%{transform:rotate(-1deg) translateY(-8px)}}
@keyframes gsSwayR{0%,100%{transform:rotate(4deg) translateY(0)}45%{transform:rotate(2deg) translateY(-9px)}}
.slide-patreon .scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,1,4,0.92) 0%,rgba(6,1,4,0.75) 40%,rgba(6,1,4,0.28) 65%,rgba(6,1,4,0.04) 100%)}
.slide-patreon .content{position:absolute;inset:0;display:flex;align-items:center;padding:0 22px;gap:16px}
.patreon-icon{width:58px;height:58px;flex-shrink:0;display:flex;align-items:center;justify-content:center;animation:breathe 3.5s ease-in-out infinite}
.patreon-icon img{width:52px;height:52px;object-fit:contain}
.patreon-text{display:flex;flex-direction:column;gap:3px}
.patreon-eyebrow{font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.55)}
.patreon-name{font-size:36px;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1}
.patreon-url{font-size:12px;font-weight:500;color:rgba(255,200,210,0.65)}
.sidenote{position:absolute;right:18px;top:50%;transform:translateY(-55%) rotate(-6deg);font-family:'Caveat',cursive;font-size:17px;font-weight:700;color:rgba(255,210,225,0.8);text-align:center;line-height:1.3;pointer-events:none;white-space:nowrap}
.sidenote::before{content:'✦';display:block;font-size:11px;color:rgba(248,184,204,0.55);margin-bottom:2px}
.slide-socials{background:transparent;box-shadow:none;overflow:visible}
.slide-socials .content{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:36px}
.social-col{display:flex;flex-direction:column;align-items:center;gap:11px}
.social-col.left{animation:floatA 4.1s ease-in-out infinite}
.social-col.mid{animation:floatB 3.6s ease-in-out infinite;animation-delay:.5s}
.social-col.right{animation:floatC 4.4s ease-in-out infinite;animation-delay:.2s}
.social-icon-bg{width:74px;height:74px;background:rgba(180,24,70,0.28);border:1.5px solid rgba(248,184,204,0.22);border-radius:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(180,24,70,0.28)}
.social-icon-bg img{width:44px;height:44px;object-fit:contain}
.tiktok-white{filter:brightness(0) invert(1)}
.social-handle{font-size:16px;font-weight:800;color:#fff;white-space:nowrap}
.slide-throne .scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,1,4,0.92) 0%,rgba(6,1,4,0.72) 42%,rgba(6,1,4,0.22) 70%,rgba(6,1,4,0) 100%)}
.slide-throne .content{position:absolute;inset:0;display:flex;align-items:center;padding:0 24px;gap:18px}
.throne-logo{height:38px;object-fit:contain;flex-shrink:0;animation:breathe 3.8s ease-in-out infinite;filter:drop-shadow(0 2px 8px rgba(200,150,255,0.3))}
.throne-divider{width:1px;height:48px;flex-shrink:0;background:rgba(248,184,204,0.18)}
.throne-text{display:flex;flex-direction:column;gap:4px}
.throne-eyebrow{font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.48)}
.throne-name{font-size:20px;font-weight:800;color:#fff;line-height:1.15;word-break:break-all}
.slide-comms .scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,1,4,0.90) 0%,rgba(6,1,4,0.65) 42%,rgba(6,1,4,0.18) 70%,rgba(6,1,4,0) 100%)}
.slide-comms .content{position:absolute;inset:0;display:flex;align-items:center;padding:0 20px;gap:14px}
.comms-mascot{width:80px;height:80px;flex-shrink:0;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(100,180,255,0.35));animation:breathe 2.8s ease-in-out infinite}
.comms-text{display:flex;flex-direction:column;gap:4px}
.comms-title{font-size:32px;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1}
.comms-url{font-size:16px;font-weight:700;color:rgba(255,220,235,0.95)}
.comms-sidenote{position:absolute;right:16px;top:50%;transform:translateY(-50%) rotate(5deg);font-family:'Caveat',cursive;font-size:16px;font-weight:700;color:rgba(255,200,220,0.7);text-align:center;line-height:1.35;pointer-events:none}
.slide-gsupps{background:transparent;box-shadow:none;overflow:visible}
.slide-gsupps .content{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.gs-img-left{width:130px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;animation:gsSwayL 3.3s ease-in-out infinite;margin-right:-6px}
.gs-img-left img{width:124px;height:138px;object-fit:contain;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45))}
.gs-center{width:185px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.gs-brand{font-size:14px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#ff6060}
.gs-save{font-size:36px;font-weight:800;color:#fff;letter-spacing:-0.03em;line-height:1}
.gs-code-label{font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,180,180,0.65);margin-top:3px}
.gs-code{font-size:22px;font-weight:800;color:#ff6090;letter-spacing:0.08em}
.gs-img-right{width:110px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;animation:gsSwayR 3.7s ease-in-out infinite;margin-left:-6px}
.gs-img-right img{width:100px;height:138px;object-fit:contain;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.45))}
.patreon-eyebrow,.patreon-name,.patreon-url,.sidenote,.throne-eyebrow,.throne-name,.comms-title,.comms-url,.comms-sidenote,.social-handle,.gs-brand,.gs-save,.gs-code-label,.gs-code{
  text-shadow:1px 1px 0 rgba(0,0,0,.9),-1px 1px 0 rgba(0,0,0,.9),1px -1px 0 rgba(0,0,0,.9),-1px -1px 0 rgba(0,0,0,.9),0 2px 4px rgba(0,0,0,.8),0 4px 12px rgba(0,0,0,.6)}
.patreon-name,.comms-title,.gs-save,.throne-name{
  text-shadow:2px 2px 0 rgba(0,0,0,.95),-2px 2px 0 rgba(0,0,0,.95),2px -2px 0 rgba(0,0,0,.95),-2px -2px 0 rgba(0,0,0,.95),0 3px 6px rgba(0,0,0,.85),0 6px 18px rgba(0,0,0,.65)}
.glow{text-shadow:2px 2px 0 rgba(0,0,0,.95),-2px 2px 0 rgba(0,0,0,.95),2px -2px 0 rgba(0,0,0,.95),-2px -2px 0 rgba(0,0,0,.95),0 3px 6px rgba(0,0,0,.85),
  0 0 6px rgba(255,255,255,1),0 0 14px rgba(248,184,204,1),0 0 30px rgba(240,100,160,.9),0 0 60px rgba(220,60,130,.7),0 0 100px rgba(200,30,100,.4) !important}
.mini-rot .rs{position:absolute;inset:0}
.tr-fade .rs{opacity:1;transition:opacity .55s ease}
.tr-fade .rs.out{opacity:0;pointer-events:none}
.tr-slide .rs{opacity:1;transform:translateX(0);transition:opacity .45s ease,transform .45s cubic-bezier(.4,0,.2,1)}
.tr-slide .rs.out{opacity:0;transform:translateX(-48px);pointer-events:none}
.tr-slide .rs.pre-enter{opacity:0;transform:translateX(48px);transition:none}
.tr-scale .rs{opacity:1;transform:scale(1);transition:opacity .45s ease,transform .45s ease}
.tr-scale .rs.out{opacity:0;transform:scale(.92);pointer-events:none}
.tr-scale .rs.pre-enter{opacity:0;transform:scale(1.06);transition:none}
.tr-wipe .rs{clip-path:inset(0 0% 0 0);transition:clip-path .55s cubic-bezier(.4,0,.2,1)}
.tr-wipe .rs.out{clip-path:inset(0 0 0 100%);pointer-events:none}
.tr-wipe .rs.pre-enter{clip-path:inset(0 100% 0 0);transition:none}
.tr-flip .rs{opacity:1;transform:perspective(800px) rotateY(0);transition:opacity .4s ease,transform .4s ease}
.tr-flip .rs.out{opacity:0;transform:perspective(800px) rotateY(-18deg);pointer-events:none}
.tr-flip .rs.pre-enter{opacity:0;transform:perspective(800px) rotateY(18deg);transition:none}
</style>
</head>
<body>
<div class="pw">
  <img class="corner-sakura" id="liveSakura" src="${img("sakura")}" alt="">
  <div class="mini-rot tr-${cfg.transition}" id="rot">
${slides.map(slideHtml).join("\n")}
  </div>
</div>
<script>
(function(){
  var rot=document.getElementById('rot');
  var slides=Array.prototype.slice.call(rot.querySelectorAll('.rs'));
  var sak=document.getElementById('liveSakura');
  var showSak=${cfg.sakura.show ? "true" : "false"};
  var op=${cfg.sakura.opacity};
  function sync(i){ if(showSak) sak.style.opacity = slides[i].dataset.sakura ? op : 0; }
  sync(0);
  if(slides.length<2) return;
  var cur=0;
  setInterval(function(){
    var prev=slides[cur];
    cur=(cur+1)%slides.length;
    var next=slides[cur];
    next.classList.add('pre-enter');
    next.classList.remove('out');
    void next.offsetWidth;
    next.classList.remove('pre-enter');
    prev.classList.add('out');
    sync(cur);
  }, ${interval});
})();
</script>
</body>
</html>`;
}
