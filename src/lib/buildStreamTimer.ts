// Fill the Stream Timer template (public/stream_timer.html) — a separate OBS source that counts
// down the stream time left (then overtime) and picks up +/- minutes from Birthday Wheel landings.
import { BIRTHDAY_WHEEL_THEMES, type BirthdayWheelTheme } from "@/lib/buildBirthdayWheel";

// Same ids as FONTS in the template. `query` loads it from Google Fonts (builder picker too).
export const STREAM_TIMER_FONTS = [
  { id: "fredoka", name: "Fredoka", family: "Fredoka", query: "Fredoka:wght@700", weight: 700, note: "round & soft" },
  { id: "dynapuff", name: "DynaPuff", family: "DynaPuff", query: "DynaPuff:wght@700", weight: 700, note: "puffy, playful" },
  { id: "mochiy", name: "Mochiy Pop", family: "Mochiy Pop One", query: "Mochiy+Pop+One", weight: 400, note: "Japanese pop" },
  { id: "dela", name: "Dela Gothic", family: "Dela Gothic One", query: "Dela+Gothic+One", weight: 400, note: "heavy, Japanese poster" },
  { id: "bungee", name: "Bungee", family: "Bungee", query: "Bungee", weight: 400, note: "bold signage" },
  { id: "orbitron", name: "Orbitron", family: "Orbitron", query: "Orbitron:wght@900", weight: 900, note: "digital / sci-fi" },
  { id: "nunito", name: "Nunito Sans", family: "Nunito Sans", query: "Nunito+Sans:opsz,wght@6..12,900", weight: 900, note: "the wheel's font" },
] as const;
export type StreamTimerFont = (typeof STREAM_TIMER_FONTS)[number]["id"];

export type StreamTimerConfig = {
  theme: BirthdayWheelTheme;
  font: StreamTimerFont;
  label: string; // small text above the time ("" = none)
  startSeconds: number; // time it starts from (adjustable live in OBS Interact)
};

export const STREAM_TIMER_MAX_SECONDS = 99 * 3600 + 59 * 60 + 59;
export const STREAM_TIMER_SIZE = { width: 720, height: 220 };

export const DEFAULT_STREAM_TIMER_CONFIG: StreamTimerConfig = {
  theme: "sakura",
  font: "fredoka",
  label: "",
  startSeconds: 2 * 3600,
};

export function normalizeStreamTimerConfig(raw: Partial<StreamTimerConfig> | null | undefined): StreamTimerConfig {
  const d = DEFAULT_STREAM_TIMER_CONFIG;
  const sec = raw?.startSeconds;
  // Setups saved before the text-only look had a font-less config with a label: drop the label.
  const old = !!raw && raw.font === undefined;
  return {
    theme: BIRTHDAY_WHEEL_THEMES.some((t) => t.id === raw?.theme) ? (raw!.theme as BirthdayWheelTheme) : d.theme,
    font: STREAM_TIMER_FONTS.some((f) => f.id === raw?.font) ? (raw!.font as StreamTimerFont) : d.font,
    label: !old && typeof raw?.label === "string" ? raw.label : d.label,
    startSeconds: typeof sec === "number" && Number.isFinite(sec) ? Math.max(0, Math.min(STREAM_TIMER_MAX_SECONDS, Math.round(sec))) : d.startSeconds,
  };
}

export function buildStreamTimerHtml(template: string, rawCfg: StreamTimerConfig): string {
  const BS = String.fromCharCode(92);
  const json = JSON.stringify(normalizeStreamTimerConfig(rawCfg))
    .split("<").join(BS + "u003c")
    .split(String.fromCharCode(0x2028)).join(BS + "u2028")
    .split(String.fromCharCode(0x2029)).join(BS + "u2029");
  return template.replace(
    /\/\*__CONFIG__\*\/[\s\S]*?\/\*__END_CONFIG__\*\//,
    () => `/*__CONFIG__*/const CONFIG = ${json};/*__END_CONFIG__*/`,
  );
}

let cached: string | null = null;
let pending: Promise<string> | null = null;
export function loadStreamTimerTemplate(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetch("/stream_timer.html").then(async (res) => {
    if (!res.ok) throw new Error(`Failed to load Stream Timer template: ${res.status}`);
    return (cached = await res.text());
  }).finally(() => { pending = null; });
  return pending;
}
