// Builds a self-contained, always-visible "Social Media" widget as a single HTML file.
// Design: compact pill — deep coloured left block (with a notch cut into its right
// edge) holding the logo, lighter right side with the @username centred, and the
// spinning sakura pinned to the right edge.
//
// It never enters/exits — it simply cross-fades between the configured platforms.

import { PATREON_ICON, X_ICON, YOUTUBE_ICON } from "./socialIcons";
import { SAKURA_DATA_URL } from "./sakuraDataUrl";

export type SocialItem = {
  id: string;
  name: string; // editor label only
  icon: string; // data URL (white glyph, alpha-trimmed square)
  label: string; // optional small text above the username ("" = hidden)
  username: string;
  iconPanelColor: string; // deep left block
  iconPanelOpacity: number;
  iconColor: string;
  cardColor: string; // lighter right side
  cardOpacity: number;
  labelColor: string;
  usernameColor: string;
  enabled: boolean;
};

export type SocialWidgetConfig = {
  items: SocialItem[];
  rotateMs: number; // how long each platform stays before switching
  fadeMs: number; // cross-fade duration
  cardWidth: number; // px at 1920x1080
  cardHeight: number;
  radius: number;
  leftWidth: number; // width of the deep logo block
  notchDepth: number; // how deep the arrow notch bites into the light side
  offsetX: number; // from left
  offsetY: number; // from bottom
  labelSize: number;
  usernameSize: number;
  iconSize: number; // the square the logo is fitted into — identical for every platform
  sakuraSize: number;
  sakuraSpinSeconds: number;
  sakuraOffsetX: number; // from the right edge of the card
  sakuraOffsetY: number; // vertical nudge from centre
  sakuraOpacity: number;
  sakuraImage: string; // "" = built-in sakura
  glow: boolean; // soft pink ring + drop shadow from the design
};

export const DEFAULT_SOCIAL_ITEMS: SocialItem[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: YOUTUBE_ICON,
    label: "",
    username: "@iomayamai",
    iconPanelColor: "#b8185a",
    iconPanelOpacity: 1,
    iconColor: "#ffffff",
    cardColor: "#f0a0c0",
    cardOpacity: 1,
    labelColor: "#8a4457",
    usernameColor: "#6a0028",
    enabled: true,
  },
  {
    id: "patreon",
    name: "Patreon",
    icon: PATREON_ICON,
    label: "",
    username: "@iomayaVT",
    iconPanelColor: "#9c1030",
    iconPanelOpacity: 1,
    iconColor: "#ffffff",
    cardColor: "#e89090",
    cardOpacity: 1,
    labelColor: "#8a4457",
    usernameColor: "#580818",
    enabled: true,
  },
  {
    id: "x",
    name: "X",
    icon: X_ICON,
    label: "",
    username: "@Iomaya",
    iconPanelColor: "#a01448",
    iconPanelOpacity: 1,
    iconColor: "#ffffff",
    cardColor: "#f0a8c8",
    cardOpacity: 1,
    labelColor: "#8a4457",
    usernameColor: "#600828",
    enabled: true,
  },
];

export const DEFAULT_SOCIAL_CONFIG: SocialWidgetConfig = {
  items: DEFAULT_SOCIAL_ITEMS,
  rotateMs: 180000,
  fadeMs: 420,
  cardWidth: 480,
  cardHeight: 100,
  radius: 16,
  leftWidth: 120,
  notchDepth: 18,
  offsetX: 120,
  offsetY: 140,
  labelSize: 18,
  usernameSize: 34,
  iconSize: 48,
  sakuraSize: 52,
  sakuraSpinSeconds: 9,
  sakuraOffsetX: 18,
  sakuraOffsetY: 0,
  sakuraOpacity: 0.8,
  sakuraImage: "",
  glow: true,
};

const num = (v: unknown, fallback: number, min: number, max: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
};
const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

export function normalizeSocialConfig(raw: Partial<SocialWidgetConfig>): SocialWidgetConfig {
  const d = DEFAULT_SOCIAL_CONFIG;
  const items = Array.isArray(raw.items) && raw.items.length ? raw.items : d.items;
  return {
    items: items.map((it, i) => {
      const base = DEFAULT_SOCIAL_ITEMS[i % DEFAULT_SOCIAL_ITEMS.length];
      return {
        id: str(it?.id, base.id),
        name: str(it?.name, base.name),
        icon: str(it?.icon, base.icon) || base.icon,
        label: str(it?.label, base.label),
        username: str(it?.username, base.username),
        iconPanelColor: str(it?.iconPanelColor, base.iconPanelColor),
        iconPanelOpacity: num(it?.iconPanelOpacity, 1, 0, 1),
        iconColor: str(it?.iconColor, base.iconColor),
        cardColor: str(it?.cardColor, base.cardColor),
        cardOpacity: num(it?.cardOpacity, 1, 0, 1),
        labelColor: str(it?.labelColor, base.labelColor),
        usernameColor: str(it?.usernameColor, base.usernameColor),
        enabled: it?.enabled !== false,
      };
    }),
    rotateMs: num(raw.rotateMs, d.rotateMs, 1000, 3600000),
    fadeMs: num(raw.fadeMs, d.fadeMs, 0, 5000),
    cardWidth: num(raw.cardWidth, d.cardWidth, 160, 1600),
    cardHeight: num(raw.cardHeight, d.cardHeight, 40, 500),
    radius: num(raw.radius, d.radius, 0, 200),
    leftWidth: num(raw.leftWidth, d.leftWidth, 30, 600),
    notchDepth: num(raw.notchDepth, d.notchDepth, 0, 80),
    offsetX: num(raw.offsetX, d.offsetX, -500, 1900),
    offsetY: num(raw.offsetY, d.offsetY, -500, 1000),
    labelSize: num(raw.labelSize, d.labelSize, 6, 120),
    usernameSize: num(raw.usernameSize, d.usernameSize, 8, 200),
    iconSize: num(raw.iconSize, d.iconSize, 10, 300),
    sakuraSize: num(raw.sakuraSize, d.sakuraSize, 0, 400),
    sakuraSpinSeconds: num(raw.sakuraSpinSeconds, d.sakuraSpinSeconds, 1, 120),
    sakuraOffsetX: num(raw.sakuraOffsetX, d.sakuraOffsetX, -400, 1600),
    sakuraOffsetY: num(raw.sakuraOffsetY, d.sakuraOffsetY, -300, 300),
    sakuraOpacity: num(raw.sakuraOpacity, d.sakuraOpacity, 0, 1),
    sakuraImage: str(raw.sakuraImage, ""),
    glow: raw.glow !== false,
  };
}

export function buildSocialWidgetHtml(rawCfg: Partial<SocialWidgetConfig>): string {
  const c = normalizeSocialConfig(rawCfg);
  const active = c.items.filter((i) => i.enabled);
  const items = active.length ? active : [c.items[0]];
  const sakura = c.sakuraImage || SAKURA_DATA_URL;

  // the sakura zone on the right + the logo block on the left keep the name centred
  const rightPad = Math.round(c.sakuraOffsetX + c.sakuraSize * 0.85);
  const notch = c.notchDepth;

  const payload = JSON.stringify(
    items.map((i) => ({
      icon: i.icon,
      label: i.label,
      username: i.username,
      deep: i.iconPanelColor,
      deepOpacity: i.iconPanelOpacity,
      iconColor: i.iconColor,
      light: i.cardColor,
      lightOpacity: i.cardOpacity,
      labelColor: i.labelColor,
      usernameColor: i.usernameColor,
    })),
  );

  const shadow = c.glow
    ? `box-shadow:
        0 0 0 1px rgba(180,40,80,0.35),
        0 6px 24px -6px rgba(180,30,70,0.5),
        0 16px 40px -16px rgba(0,0,0,0.6);`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Social Rotator</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;800&display=swap" rel="stylesheet" />
<style>
  *,*::before,*::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1920px; height:1080px; overflow:hidden; background:transparent; }
  body { font-family:'DM Sans', ui-sans-serif, system-ui, sans-serif; }

  #stage { position:absolute; left:${c.offsetX}px; bottom:${c.offsetY}px; }

  #card {
    position:relative;
    width:${c.cardWidth}px; height:${c.cardHeight}px;
    border-radius:${c.radius}px;
    overflow:hidden;
    ${shadow}
  }

  /* lighter right side — the username sits centred between logo block and sakura */
  #right {
    position:absolute; inset:0;
    padding:0 ${rightPad}px 0 ${Math.round(c.leftWidth)}px;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:${Math.max(1, Math.round(c.labelSize * 0.18))}px;
    transition: background-color ${c.fadeMs}ms ease;
  }
  #label {
    font-size:${c.labelSize}px; font-weight:500;
    letter-spacing:0.18em; text-transform:uppercase;
    white-space:nowrap; line-height:1;
  }
  #username {
    font-size:${c.usernameSize}px; font-weight:800;
    letter-spacing:-0.01em; white-space:nowrap; line-height:1.05;
    text-shadow:0 1px 3px rgba(0,0,0,0.1);
  }

  /* deep left block with the arrow notch bitten out of its right edge */
  #left {
    position:absolute; left:0; top:0; bottom:0;
    width:${c.leftWidth}px;
    display:flex; align-items:center; justify-content:center;
    z-index:2;
    transition: background-color ${c.fadeMs}ms ease;
    clip-path: polygon(
      0% 0%, 100% 0%,
      100% calc(50% - ${notch}px),
      ${Math.max(0, 100 - (notch / c.leftWidth) * 100).toFixed(2)}% 50%,
      100% calc(50% + ${notch}px),
      100% 100%, 0% 100%
    );
  }
  #icon {
    width:${c.iconSize}px; height:${c.iconSize}px;
    margin-right:${Math.round(notch * 0.35)}px;
    -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
    -webkit-mask-position:center; mask-position:center;
    -webkit-mask-size:contain; mask-size:contain;
    filter:drop-shadow(0 1px 4px rgba(0,0,0,0.2));
  }

  #sakura {
    position:absolute; z-index:3;
    right:${c.sakuraOffsetX}px;
    top:50%;
    width:${c.sakuraSize}px; height:${c.sakuraSize}px;
    margin-top:${-Math.round(c.sakuraSize / 2) - c.sakuraOffsetY}px;
    opacity:${c.sakuraOpacity};
    background:url("${sakura}") center/contain no-repeat;
    filter:drop-shadow(0 0 5px rgba(180,30,70,0.45));
    animation: spin ${c.sakuraSpinSeconds}s linear infinite;
    pointer-events:none;
  }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

  #fader { transition: opacity ${c.fadeMs}ms ease, transform ${c.fadeMs}ms ease; }
  #fader.out { opacity:0; transform:translateX(-8px); }
</style>
</head>
<body>
  <div id="stage">
    <div id="card">
      <div id="fader" style="position:absolute;inset:0;">
        <div id="right">
          <div id="label"></div>
          <div id="username"></div>
        </div>
        <div id="left"><div id="icon"></div></div>
      </div>
      <div id="sakura"></div>
    </div>
  </div>

<script>
(function () {
  var ITEMS = ${payload};
  var ROTATE = ${c.rotateMs};
  var FADE = ${c.fadeMs};

  var fader = document.getElementById('fader');
  var right = document.getElementById('right');
  var left = document.getElementById('left');
  var icon = document.getElementById('icon');
  var label = document.getElementById('label');
  var username = document.getElementById('username');

  function hexToRgba(hex, a) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return 'rgba(0,0,0,' + a + ')';
    return 'rgba(' + ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + a + ')';
  }

  function apply(item) {
    right.style.backgroundColor = hexToRgba(item.light, item.lightOpacity);
    left.style.backgroundColor = hexToRgba(item.deep, item.deepOpacity);
    icon.style.backgroundColor = item.iconColor;
    icon.style.webkitMaskImage = 'url("' + item.icon + '")';
    icon.style.maskImage = 'url("' + item.icon + '")';
    label.style.color = item.labelColor;
    label.textContent = item.label || '';
    label.style.display = item.label ? 'block' : 'none';
    username.style.color = item.usernameColor;
    username.textContent = item.username;
  }

  var i = 0;
  apply(ITEMS[0]);

  if (ITEMS.length > 1) {
    setInterval(function () {
      fader.classList.add('out');
      setTimeout(function () {
        i = (i + 1) % ITEMS.length;
        apply(ITEMS[i]);
        fader.classList.remove('out');
      }, FADE);
    }, ROTATE);
  }
})();
</script>
</body>
</html>`;
}
