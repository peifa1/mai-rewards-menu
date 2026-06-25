import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared audio engine for the Audio Teasers tab.
 *
 * One <audio> element + one Web Audio AnalyserNode. On each animation frame
 * while playing, it reads the live frequency spectrum, reduces it to a small
 * normalized band array + an overall amplitude, and broadcasts that to the
 * preview iframes via postMessage. The iframe templates apply it to their
 * visualizers (waveform bars / now-playing mini-bars / sound-orb breathing).
 *
 * The spectrum→visual mapping is intentionally simple and centralized here so
 * it can be reproduced deterministically by a server-side renderer (Remotion)
 * when we build video export.
 */

const BANDS = 32;

export type AudioFramePayload = { type: "aud"; s: number[]; amp: number; freq?: number[]; sampleRate?: number; fftSize?: number };

export function useAudioEngine(getTargets: () => Window[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string>("");

  const [hasAudio, setHasAudio] = useState(false);
  const [fileName, setFileName] = useState("");
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Lazily build the audio graph on first play (needs a user gesture).
  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.65;
    const src = ctx.createMediaElementSource(audio);
    src.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    freqRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  }, []);

  const broadcast = useCallback((msg: unknown) => {
    for (const w of getTargets()) {
      try { w.postMessage(msg, "*"); } catch { /* iframe mid-reload */ }
    }
  }, [getTargets]);

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const analyser = analyserRef.current;
    const freq = freqRef.current;
    const audio = audioRef.current;
    if (!analyser || !freq || !audio) return;

    analyser.getByteFrequencyData(freq);
    const per = Math.floor(freq.length / BANDS);
    const s = new Array<number>(BANDS);
    let sum = 0;
    for (let b = 0; b < BANDS; b++) {
      let acc = 0;
      for (let k = 0; k < per; k++) acc += freq[b * per + k];
      const v = acc / per / 255;
      s[b] = v;
      sum += v;
    }
    // Overall loudness, lightly emphasized so the orb visibly breathes.
    const amp = Math.min(1, (sum / BANDS) * 1.7);
    // Send raw freq array so waveform iframe can do its own per-bar FFT mapping.
    const ctx = ctxRef.current;
    broadcast({ type: "aud", s, amp, freq: Array.from(freq), sampleRate: ctx?.sampleRate ?? 48000, fftSize: analyser.fftSize });
    setCurrentTime(audio.currentTime);
  }, [broadcast]);

  const startLoop = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureGraph();
    if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
    try { await audio.play(); } catch { return; }
    setPlaying(true);
    startLoop();
  }, [ensureGraph, startLoop]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    stopLoop();
    broadcast({ type: "audStop" });
  }, [stopLoop, broadcast]);

  const toggle = useCallback(() => { if (playing) pause(); else void play(); }, [playing, play, pause]);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  const load = useCallback((file: File) => {
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

  // <audio> element event handlers (wired in the component).
  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration)) setDuration(audio.duration);
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
    stopLoop();
    broadcast({ type: "audStop" });
    seek(0);
  }, [stopLoop, broadcast, seek]);

  useEffect(() => () => {
    stopLoop();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, [stopLoop]);

  return {
    audioRef,
    hasAudio, fileName, playing, duration, currentTime,
    load, play, pause, toggle, seek,
    onLoadedMetadata, onEnded,
  };
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
