import type { TeaserStyle } from "./buildAudioTeaser";

const URLS: Record<TeaserStyle, string> = {
  waveform:   "/audio_waveform.html",
  nowplaying: "/audio_nowplaying.html",
  soundorb:   "/audio_soundorb.html",
};

const cache: Partial<Record<TeaserStyle, string>> = {};
const pending: Partial<Record<TeaserStyle, Promise<string>>> = {};

export async function loadAudioTeaserTemplate(style: TeaserStyle): Promise<string> {
  if (cache[style]) return cache[style]!;
  if (pending[style]) return pending[style]!;
  pending[style] = (async () => {
    const res = await fetch(URLS[style]);
    if (!res.ok) throw new Error(`Failed to load audio teaser template (${style}): ${res.status}`);
    const html = await res.text();
    cache[style] = html;
    return html;
  })();
  return pending[style]!;
}
