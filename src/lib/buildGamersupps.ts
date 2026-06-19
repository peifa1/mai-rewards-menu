// Take the Gamersupps card template (a self-contained single HTML file) and apply
// the two user customisations: timing (on-screen hold + end break) and the card image.

export type GamersuppsConfig = {
  holdMs: number; // how long the card stays on screen before exiting
  breakMs: number; // transparent pause after exit before it loops back in
  image: string; // data URL for the animated card image ("" = keep template default)
};

export const DEFAULT_GAMERSUPPS_CONFIG: GamersuppsConfig = {
  holdMs: 6000,
  breakMs: 2000,
  image: "",
};

export function normalizeGamersuppsConfig(cfg: GamersuppsConfig): GamersuppsConfig {
  return {
    holdMs: Number.isFinite(cfg?.holdMs) ? Math.max(200, Math.round(cfg.holdMs)) : 6000,
    breakMs: Number.isFinite(cfg?.breakMs) ? Math.max(0, Math.round(cfg.breakMs)) : 2000,
    image: typeof cfg?.image === "string" ? cfg.image : "",
  };
}

export function buildGamersuppsHtml(template: string, rawCfg: GamersuppsConfig): string {
  const cfg = normalizeGamersuppsConfig(rawCfg);
  let out = template;

  // 1) Timing — the template's loop() holds with sleep(6000) and breaks with sleep(2000).
  out = out
    .replace("await sleep(6000);", `await sleep(${cfg.holdMs});`)
    .replace("await sleep(2000);", `await sleep(${cfg.breakMs});`);

  // 2) Swap the animated card image, if the user uploaded one.
  if (cfg.image) {
    out = out.replace(
      /(<img id="card-img" src=")[^"]*(")/,
      (_m, pre, post) => `${pre}${cfg.image}${post}`,
    );
  }

  return out;
}
