// Fill the Birthday Wheel scene template with the user's title, legend labels and options.
// The template holds a single `/*__CONFIG__*/const CONFIG = {...};/*__END_CONFIG__*/` block.

export type WheelOptionType = "once" | "repeat";

export type WheelOption = {
  id: string; // stable id — the scene's saved progress (done / removed) refers to it
  label: string; // short text written on the wheel
  full: string; // full text shown when it lands
  type: WheelOptionType; // "once" = removed after Done, "repeat" = stays on the wheel
  double?: boolean; // "Double trouble": spin twice and combine both results
};

export type BirthdayWheelConfig = {
  title: string;
  onceLabel: string;
  repeatLabel: string;
  items: WheelOption[];
};

export const WHEEL_LABEL_MAX = 24;

const o = (id: string, label: string, full: string, type: WheelOptionType, double = false): WheelOption =>
  double ? { id, label, full, type, double } : { id, label, full, type };

// Ids match the original standalone scene, so progress saved in OBS carries over.
export const DEFAULT_BIRTHDAY_WHEEL_CONFIG: BirthdayWheelConfig = {
  title: "Birthday Wheel",
  onceLabel: "one time only!",
  repeatLabel: "can come back for more",
  items: [
    o("story", "Embarrassing story", "Tell an embarrassing story", "once"),
    o("sour", "Sour challenge", "Sour challenge!", "once"),
    o("extend", "+10 min stream", "Extend stream time +10 mins", "repeat"),
    o("villain", "Villain mode", "Become a villain for 5 mins", "repeat"),
    o("uwu", "UwU voice", "UwU voice + say cringe things for 5 mins", "repeat"),
    o("sing", "Sing everything", "Sing everything I say for 5 mins", "repeat"),
    o("chatline", "Chat picks a line", "Chat decides 1 thing for me to say (nothing bad!)", "repeat"),
    o("chibi", "Chibi vibe", "Turn into chibi and vibe to a stupid song", "once"),
    o("double", "Double trouble", "Double trouble! Spin twice and combine both", "repeat", true),
    o("vchanger", "Voice changer", "Voice changer for 15 minutes", "once"),
    o("room", "Rate chat's room", "Rate chat's room on stream", "once"),
    o("shot", "Tiny shot", "Alcohol shot (tiny!)", "once"),
    o("pushups", "10 pushups", "10 pushups", "repeat"),
    o("japanese", "Learn Japanese", "Learn Japanese for 10 mins", "once"),
    o("conspiracy", "Conspiracy theory", "Become a conspiracy theorist and explain something stupid", "repeat"),
    o("speech", "Emotional speech", "Give an emotional speech about something incredibly stupid", "repeat"),
    o("anime", "Anime breakdown", "Dramatic anime breakdown", "repeat"),
    o("mickey", "Mickey voice", "Try a Mickey voice for 5 mins", "repeat"),
    o("high", "Highest voice", "Use your highest possible voice for 1–3 mins", "repeat"),
    o("cake", "Cake cursed crushes", "Cake cursed crushes", "once"),
    o("scandal", "Fake scandal", "Make a fake scandal about yourself", "once"),
    o("nick", "Nicknames ×5", "Create a nickname for 5 viewers", "once"),
    o("uno", "UNO REVERSE", "UNO REVERSE!", "once"),
    o("ban", "Ban a chatter", "Ban a chatter (10 mins)", "repeat"),
    o("pfp", "Change pfp", "Change pfp", "once"),
    o("nya", "“nya” / “puta”", "Say “nya” or “puta” at the end of every sentence for 5 mins", "repeat"),
  ],
};

export const newWheelOptionId = () => `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

export function normalizeBirthdayWheelConfig(raw: Partial<BirthdayWheelConfig> | null | undefined): BirthdayWheelConfig {
  const d = DEFAULT_BIRTHDAY_WHEEL_CONFIG;
  const seen = new Set<string>();
  const items = (Array.isArray(raw?.items) ? raw!.items : d.items).map((it) => {
    let id = typeof it?.id === "string" && it.id ? it.id : newWheelOptionId();
    while (seen.has(id)) id = newWheelOptionId();
    seen.add(id);
    const label = str(it?.label, "").slice(0, WHEEL_LABEL_MAX);
    const opt: WheelOption = {
      id,
      label,
      full: str(it?.full, "") || label,
      type: it?.type === "once" ? "once" : "repeat",
    };
    if (it?.double) opt.double = true;
    return opt;
  });
  return {
    title: str(raw?.title, d.title),
    onceLabel: str(raw?.onceLabel, d.onceLabel),
    repeatLabel: str(raw?.repeatLabel, d.repeatLabel),
    items,
  };
}

export function buildBirthdayWheelHtml(template: string, rawCfg: BirthdayWheelConfig): string {
  const cfg = normalizeBirthdayWheelConfig(rawCfg);
  // Keep only options that have something written on the wheel.
  const items = cfg.items.filter((it) => it.label.trim());
  // Safe inside a <script>: no "</script>" break-outs, no raw line separators.
  // Escapes are written as JSON unicode escape sequences (read back as the same characters).
  const BS = String.fromCharCode(92); // backslash
  const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  const json = JSON.stringify({ ...cfg, items })
    .split("<").join(BS + "u003c")
    .split(LS).join(BS + "u2028")
    .split(PS).join(BS + "u2029");
  return template.replace(
    /\/\*__CONFIG__\*\/[\s\S]*?\/\*__END_CONFIG__\*\//,
    () => `/*__CONFIG__*/const CONFIG = ${json};/*__END_CONFIG__*/`,
  );
}
