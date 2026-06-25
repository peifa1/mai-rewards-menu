export type TeaserStyle = "waveform" | "nowplaying" | "soundorb";

export type AudioTeaserConfig = {
  style: TeaserStyle;
  title: string;
  eyebrow: string;
  genre: string;
  badge: string;
  minutes: string;
  asmrLabel: string;
  orbSubLabel: string; // soundorb only — small line under the ASMR label
  cardLabel: string;   // waveform only — "RP AUDIO"
  timeStart: string;   // nowplaying only — "03:12"
  image: string;       // data URL, "" = keep template default
  accentColor: string; // waveform bars + rose-colored text (global)
  titleColor: string;  // card titles like "RP AUDIO", "Good Morning" (global)
};

export const DEFAULT_AUDIO_TEASER_CONFIG: AudioTeaserConfig = {
  style: "waveform",
  title: "Good Morning",
  eyebrow: "New Drop",
  genre: "ASMR Roleplay",
  badge: "Exclusive",
  minutes: "24",
  asmrLabel: "ASMR",
  orbSubLabel: "Roleplay Audio",
  cardLabel: "RP AUDIO",
  timeStart: "03:12",
  image: "",
  accentColor: "#f8b8cc",
  titleColor: "#ffffff",
};

export function normalizeAudioTeaserConfig(cfg: AudioTeaserConfig): AudioTeaserConfig {
  // Text fields: keep the value verbatim (empty string stays empty — a user
  // who clears a label means it to be blank). Only fall back to the default
  // when the field is absent entirely (undefined / not a string).
  const txt = (v: unknown, fallback: string) =>
    typeof v === "string" ? v : fallback;
  // Color fields: must always be a valid color, so fall back on blank too.
  const s = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v : fallback;
  const d = DEFAULT_AUDIO_TEASER_CONFIG;
  return {
    style: (["waveform", "nowplaying", "soundorb"] as TeaserStyle[]).includes(cfg?.style)
      ? cfg.style : d.style,
    title:       txt(cfg?.title,       d.title),
    eyebrow:     txt(cfg?.eyebrow,     d.eyebrow),
    genre:       txt(cfg?.genre,       d.genre),
    badge:       txt(cfg?.badge,       d.badge),
    minutes:     txt(cfg?.minutes,     d.minutes),
    asmrLabel:   txt(cfg?.asmrLabel,   d.asmrLabel),
    orbSubLabel: txt(cfg?.orbSubLabel, d.orbSubLabel),
    cardLabel:   txt(cfg?.cardLabel,   d.cardLabel),
    timeStart:   txt(cfg?.timeStart,   d.timeStart),
    image:       typeof cfg?.image === "string" ? cfg.image : "",
    accentColor: s(cfg?.accentColor, d.accentColor),
    titleColor:  s(cfg?.titleColor, d.titleColor),
  };
}

function buildConfigBlock(cfg: AudioTeaserConfig): string {
  const q = (v: string) => JSON.stringify(v);
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
  // soundorb
  return `var CONFIG = {
  title:       ${q(cfg.title)},
  asmrLabel:   ${q(cfg.asmrLabel)},
  orbSubLabel: ${q(cfg.orbSubLabel)},
  minutes:     ${q(cfg.minutes)},
  genre:       ${q(cfg.genre)},
  badge:       ${q(cfg.badge)},
  eyebrow:     ${q(cfg.eyebrow)},
};`;
}

export function buildAudioTeaserHtml(template: string, rawCfg: AudioTeaserConfig): string {
  const cfg = normalizeAudioTeaserConfig(rawCfg);
  let out = template;

  // Inject config values
  out = out.replace(/var CONFIG = \{[\s\S]*?\};/, buildConfigBlock(cfg));

  // Swap cover image if uploaded
  if (cfg.image) {
    out = out.replace(/var IMG = '[^']*';/, `var IMG = '${cfg.image}';`);
  }

  // Inject global color overrides.
  // Accent → --rose (waveform bars, sub-labels). Title → card titles + the
  // Sound Orb ASMR label. The orb sub-label keeps the accent color via --rose.
  const colorStyle = `<style>
:root{--rose:${cfg.accentColor};}
#cardLabel,.card-label{color:${cfg.titleColor}!important;}
#npTitle{color:${cfg.titleColor}!important;}
.orb-caption-main,.orb-caption-main b{color:${cfg.titleColor}!important;}
</style>`;
  out = out.replace('</head>', colorStyle + '</head>');

  return out;
}
