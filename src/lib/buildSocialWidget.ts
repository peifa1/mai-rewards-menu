// Builds a self-contained, always-visible "Social Media" widget as a single HTML file.
// A rounded card: coloured logo panel on the left, "follow me" + username on the right,
// with a spinning sakura flower overlapping the bottom edge.
//
// Unlike the Gamersupps popup this never enters/exits — it simply cross-fades
// between the configured platforms forever.

import { PATREON_ICON, X_ICON, YOUTUBE_ICON } from "./socialIcons";
import { SAKURA_DATA_URL } from "./sakuraDataUrl";

export type SocialItem = {
  id: string;
  name: string; // editor label only
  icon: string; // data URL (white glyph, alpha-trimmed square)
  label: string; // "follow me"
  username: string;
  iconPanelColor: string;
  iconPanelOpacity: number;
  iconColor: string;
  cardColor: string;
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
  offsetX: number; // from left
  offsetY: number; // from bottom
  labelSize: number;
  usernameSize: number;
  iconSize: number; // the square the logo is fitted into — identical for every platform
  sakuraSize: number;
  sakuraSpinSeconds: number;
  sakuraOffsetX: number;
  sakuraOffsetY: number;
  sakuraOpacity: number;
  sakuraImage: string; // "" = built-in sakura
};

export const DEFAULT_SOCIAL_ITEMS: SocialItem[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: YOUTUBE_ICON,
    label: "follow me",
    username: "USERNAME",
    iconPanelColor: "#ef4f6b",
    iconPanelOpacity: 1,
    iconColor: "#ffffff",
    cardColor: "#ffd7e2",
    cardOpacity: 1,
    labelColor: "#8a4457",
    usernameColor: "#e8437a",
    enabled: true,
  },
  {
    id: "patreon",
    name: "Patreon",
    icon: PATREON_ICON,
    label: "support me",
    username: "USERNAME",
    iconPanelColor: "#f0839d",
    iconPanelOpacity: 1,
    iconColor: "#ffffff",
    cardColor: "#ffe4ec",
    cardOpacity: 1,
    labelColor: "#8a4457",
    usernameColor: "#e8437a",
    enabled: true,
  },
  {
    id: "x",
    name: "X",
    icon: X_ICON,
    label: "follow me",
    username: "USERNAME",
    iconPanelColor: "#f2a0b6",
    iconPanelOpacity: 1,
    iconColor: "#ffffff",
    cardColor: "#ffeaf1",
    cardOpacity: 1,
    labelColor: "#8a4457",
    usernameColor: "#e8437a",
    enabled: true,
  },
];

export const DEFAULT_SOCIAL_CONFIG: SocialWidgetConfig = {
  items: DEFAULT_SOCIAL_ITEMS,
  rotateMs: 180000,
  fadeMs: 700,
  cardWidth: 620,
  cardHeight: 170,
  radius: 34,
  offsetX: 120,
  offsetY: 140,
  labelSize: 30,
  usernameSize: 52,
  iconSize: 78,
  sakuraSize: 92,
  sakuraSpinSeconds: 14,
  sakuraOffsetX: 250,
  sakuraOffsetY: -34,
  sakuraOpacity: 1,
  sakuraImage: "",
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
    cardWidth: num(raw.cardWidth, d.cardWidth, 200, 1600),
    cardHeight: num(raw.cardHeight, d.cardHeight, 80, 500),
    radius: num(raw.radius, d.radius, 0, 200),
    offsetX: num(raw.offsetX, d.offsetX, -500, 1900),
    offsetY: num(raw.offsetY, d.offsetY, -500, 1000),
    labelSize: num(raw.labelSize, d.labelSize, 8, 120),
    usernameSize: num(raw.usernameSize, d.usernameSize, 10, 200),
    iconSize: num(raw.iconSize, d.iconSize, 20, 300),
    sakuraSize: num(raw.sakuraSize, d.sakuraSize, 0, 400),
    sakuraSpinSeconds: num(raw.sakuraSpinSeconds, d.sakuraSpinSeconds, 1, 120),
    sakuraOffsetX: num(raw.sakuraOffsetX, d.sakuraOffsetX, -600, 1600),
    sakuraOffsetY: num(raw.sakuraOffsetY, d.sakuraOffsetY, -300, 300),
    sakuraOpacity: num(raw.sakuraOpacity, d.sakuraOpacity, 0, 1),
    sakuraImage: str(raw.sakuraImage, ""),
  };
}

export function buildSocialWidgetHtml(rawCfg: Partial<SocialWidgetConfig>): string {
  const c = normalizeSocialConfig(rawCfg);
  const active = c.items.filter((i) => i.enabled);
  const items = active.length ? active : [c.items[0]];
  const sakura = c.sakuraImage || SAKURA_DATA_URL;
  const iconPanelW = Math.round(c.cardHeight * 0.92);

  const payload = JSON.stringify(
    items.map((i) => ({
      icon: i.icon,
      label: i.label,
      username: i.username,
      panel: i.iconPanelColor,
      panelOpacity: i.iconPanelOpacity,
      iconColor: i.iconColor,
      card: i.cardColor,
      cardOpacity: i.cardOpacity,
      labelColor: i.labelColor,
      usernameColor: i.usernameColor,
    })),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Social Rotator</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap" rel="stylesheet" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1920px; height:1080px; overflow:hidden; background:transparent; }
  body { font-family:'Quicksand', ui-sans-serif, system-ui, sans-serif; }

  #stage { position:absolute; left:${c.offsetX}px; bottom:${c.offsetY}px; }

  #card {
    position:relative;
    width:${c.cardWidth}px; height:${c.cardHeight}px;
    border-radius:${c.radius}px;
    display:flex; align-items:stretch;
    filter: drop-shadow(0 14px 34px rgba(0,0,0,.28));
    transition: background-color ${c.fadeMs}ms ease;
  }
  #cardBg {
    position:absolute; inset:0; border-radius:inherit;
    transition: opacity ${c.fadeMs}ms ease, background-color ${c.fadeMs}ms ease;
  }

  #panel {
    position:relative; z-index:2;
    width:${iconPanelW}px; flex:0 0 ${iconPanelW}px;
    border-radius:${c.radius}px;
    display:flex; align-items:center; justify-content:center;
    transition: background-color ${c.fadeMs}ms ease, opacity ${c.fadeMs}ms ease;
  }
  /* the logo is masked, so a single colour drives every platform and the box
     size is fixed — trimmed square sources keep all logos visually identical */
  #icon {
    width:${c.iconSize}px; height:${c.iconSize}px;
    -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
    -webkit-mask-position:center; mask-position:center;
    -webkit-mask-size:contain; mask-size:contain;
  }

  #text {
    position:relative; z-index:2;
    flex:1; min-width:0;
    display:flex; flex-direction:column; justify-content:center;
    padding:0 ${Math.round(c.cardHeight * 0.22)}px 0 ${Math.round(c.cardHeight * 0.26)}px;
    gap:${Math.round(c.labelSize * 0.15)}px;
  }
  #label {
    font-size:${c.labelSize}px; font-weight:500; line-height:1.05;
    letter-spacing:.01em;
  }
  #username {
    font-size:${c.usernameSize}px; font-weight:700; line-height:1.05;
    letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }

  #fader { transition: opacity ${c.fadeMs}ms ease; }

  #sakura {
    position:absolute; z-index:3;
    left:${c.sakuraOffsetX}px;
    bottom:${c.sakuraOffsetY}px;
    width:${c.sakuraSize}px; height:${c.sakuraSize}px;
    opacity:${c.sakuraOpacity};
    background:url("${sakura}") center/contain no-repeat;
    filter: drop-shadow(0 6px 14px rgba(0,0,0,.3));
    animation: spin ${c.sakuraSpinSeconds}s linear infinite;
    pointer-events:none;
  }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
</style>
</head>
<body>
  <div id="stage">
    <div id="card">
      <div id="cardBg"></div>
      <div id="fader" style="position:absolute;inset:0;display:flex;align-items:stretch;">
        <div id="panel"><div id="icon"></div></div>
        <div id="text">
          <div id="label"></div>
          <div id="username"></div>
        </div>
      </div>
    </div>
    <div id="sakura"></div>
  </div>

<script>
(function () {
  var ITEMS = ${payload};
  var ROTATE = ${c.rotateMs};
  var FADE = ${c.fadeMs};

  var fader = document.getElementById('fader');
  var cardBg = document.getElementById('cardBg');
  var panel = document.getElementById('panel');
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
    cardBg.style.backgroundColor = hexToRgba(item.card, item.cardOpacity);
    panel.style.backgroundColor = hexToRgba(item.panel, item.panelOpacity);
    icon.style.backgroundColor = item.iconColor;
    icon.style.webkitMaskImage = 'url("' + item.icon + '")';
    icon.style.maskImage = 'url("' + item.icon + '")';
    label.style.color = item.labelColor;
    username.style.color = item.usernameColor;
    label.textContent = item.label;
    username.textContent = item.username;
  }

  var i = 0;
  apply(ITEMS[0]);

  if (ITEMS.length > 1) {
    setInterval(function () {
      fader.style.opacity = '0';
      cardBg.style.opacity = '0';
      setTimeout(function () {
        i = (i + 1) % ITEMS.length;
        apply(ITEMS[i]);
        fader.style.opacity = '1';
        cardBg.style.opacity = '1';
      }, FADE);
    }, ROTATE);
  }
})();
</script>
</body>
</html>`;
}
