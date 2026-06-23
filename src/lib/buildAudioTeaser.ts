export type TeaserStyle = "waveform" | "nowplaying" | "soundorb";

export type AudioTeaserConfig = {
  style: TeaserStyle;
  title: string;
  eyebrow: string;
  genre: string;
  badge: string;
  minutes: string;
  asmrLabel: string;
  cardLabel: string;   // waveform only — "RP AUDIO"
  timeStart: string;   // nowplaying only — "03:12"
  image: string;       // data URL, "" = keep template default
};

export const DEFAULT_AUDIO_TEASER_CONFIG: AudioTeaserConfig = {
  style: "waveform",
  title: "Whisper & Rain",
  eyebrow: "New Drop",
  genre: "ASMR Roleplay",
  badge: "Exclusive",
  minutes: "24",
  asmrLabel: "ASMR",
  cardLabel: "RP AUDIO",
  timeStart: "03:12",
  image: "",
};

export function normalizeAudioTeaserConfig(cfg: AudioTeaserConfig): AudioTeaserConfig {
  const s = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v : fallback;
  const d = DEFAULT_AUDIO_TEASER_CONFIG;
  return {
    style: (["waveform", "nowplaying", "soundorb"] as TeaserStyle[]).includes(cfg?.style)
      ? cfg.style : d.style,
    title:     s(cfg?.title,     d.title),
    eyebrow:   s(cfg?.eyebrow,   d.eyebrow),
    genre:     s(cfg?.genre,     d.genre),
    badge:     s(cfg?.badge,     d.badge),
    minutes:   s(cfg?.minutes,   d.minutes),
    asmrLabel: s(cfg?.asmrLabel, d.asmrLabel),
    cardLabel: s(cfg?.cardLabel, d.cardLabel),
    timeStart: s(cfg?.timeStart, d.timeStart),
    image: typeof cfg?.image === "string" ? cfg.image : "",
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

  return out;
}
