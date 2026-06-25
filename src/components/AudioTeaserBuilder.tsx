import { useCallback, useEffect, useRef, useState } from "react";
import { loadAudioTeaserTemplate } from "@/lib/audioTeaserTemplate";
import { useAudioEngine } from "@/lib/useAudioEngine";
import {
  buildAudioTeaserHtml,
  DEFAULT_AUDIO_TEASER_CONFIG,
  normalizeAudioTeaserConfig,
  type AudioTeaserConfig,
  type TeaserStyle,
} from "@/lib/buildAudioTeaser";
import {
  CANVAS_W, CANVAS_H, OUT_W, OUT_H,
  drawWaveformCard,
  drawNowPlayingCard,
  drawSoundOrbCard,
  preloadCanvasAssets,
} from "@/lib/canvasCardRenderer";

// ── Palette ───────────────────────────────────────────────────────────────
const INK      = "#fbeaea";
const INK_DIM  = "#c08898";
const ROSE     = "#e8a0b4";
const KANJI    = "#ffb8c8";
const LINE     = "rgba(255,150,180,0.10)";
const LINE_STR = "rgba(255,150,180,0.22)";
const PANEL    = "rgba(10,2,6,0.80)";
const FIELD_BG = "rgba(255,140,170,0.04)";
const SERIF    = "Georgia, 'Times New Roman', serif";
const SANS     = "ui-sans-serif, system-ui, sans-serif";

const STYLES: { key: TeaserStyle; kanji: string; label: string }[] = [
  { key: "waveform",   kanji: "波", label: "Waveform"    },
  { key: "nowplaying", kanji: "再", label: "Now Playing" },
  { key: "soundorb",   kanji: "球", label: "Sound Orb"   },
];

const CARD_W = 390;
const CARD_H = 488;

// ── Storage ───────────────────────────────────────────────────────────────
function storageKey(s: TeaserStyle) { return `audio-teaser-cfg-${s}`; }
function loadStored(style: TeaserStyle): AudioTeaserConfig {
  try {
    const raw = localStorage.getItem(storageKey(style));
    if (raw) return normalizeAudioTeaserConfig(JSON.parse(raw));
  } catch {}
  return { ...DEFAULT_AUDIO_TEASER_CONFIG, style };
}
function saveStored(style: TeaserStyle, cfg: AudioTeaserConfig) {
  try { localStorage.setItem(storageKey(style), JSON.stringify(cfg)); } catch {}
}

// ── Field (underline style) ───────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{
        fontSize: 7.5, letterSpacing: "0.38em", textTransform: "uppercase",
        fontFamily: SANS, color: focused ? ROSE : INK_DIM,
        marginBottom: 5, transition: "color 0.18s",
      }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "3px 0 6px",
          background: "transparent", border: "none",
          borderBottom: `1px solid ${focused ? ROSE : LINE_STR}`,
          color: INK, fontSize: 13, fontFamily: SERIF,
          outline: "none", boxSizing: "border-box",
          boxShadow: focused ? `0 1px 0 ${ROSE}` : "none",
          transition: "border-color 0.18s, box-shadow 0.18s",
        }}
      />
    </div>
  );
}

// ── Section box ───────────────────────────────────────────────────────────
function Section({ title, accent, children }: {
  title: string; accent?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: accent ? "rgba(255,140,170,0.06)" : FIELD_BG,
      border: `1px solid ${accent ? "rgba(255,150,180,0.18)" : LINE}`,
      borderRadius: 10,
      padding: "12px 14px 4px",
      marginBottom: 8,
    }}>
      <div style={{
        fontSize: 7, letterSpacing: "0.52em", textTransform: "uppercase",
        fontFamily: SANS, color: accent ? KANJI : INK_DIM,
        marginBottom: 12, display: "flex", alignItems: "center", gap: 7,
      }}>
        <span style={{ opacity: accent ? 1 : 0.6 }}>{title}</span>
        <div style={{ flex: 1, height: "1px", background: accent ? LINE_STR : LINE }} />
      </div>
      {children}
    </div>
  );
}

// ── Single card column ────────────────────────────────────────────────────
function TeaserCard({ style, kanji, label, onWindow, audioMinutes, audioFile, audioDuration, waveformData }: {
  style: TeaserStyle; kanji: string; label: string;
  onWindow: (style: TeaserStyle, win: Window | null) => void;
  audioMinutes: string | null;
  audioFile: File | null;
  audioDuration: number;
  waveformData: number[];
}) {
  const [cfg, setCfg] = useState<AudioTeaserConfig>(() => loadStored(style));
  const [previewSrc, setPreviewSrc] = useState("");
  const blobRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Canvas recorder ──────────────────────────────────────────────────────
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const [recState, setRecState] = useState<"idle" | "render">("idle");
  const [renderTimeLeft, setRenderTimeLeft] = useState<string>("");
  const recMrRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStopLoopRef = useRef<(() => void) | null>(null);
  const recAudioCtxRef = useRef<AudioContext | null>(null);
  const audioDurationRef = useRef(audioDuration);
  useEffect(() => { audioDurationRef.current = audioDuration; }, [audioDuration]);

  const iframeWinRef = useRef<Window | null>(null);
  const waveformDataRef = useRef(waveformData);
  useEffect(() => {
    waveformDataRef.current = waveformData;
    if (waveformData.length > 0 && iframeWinRef.current) {
      iframeWinRef.current.postMessage({ type: "waveform", data: waveformData }, "*");
    }
  }, [waveformData]);

  useEffect(() => {
    if (!cfg.image) { imgElRef.current = null; return; }
    const img = new Image();
    img.src = cfg.image;
    imgElRef.current = img;
  }, [cfg.image]);

  useEffect(() => () => {
    recStopLoopRef.current?.();
    recAudioCtxRef.current?.close();
  }, []);

  function getMimeType(): string {
    if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E,mp4a.40.2"))
      return "video/mp4;codecs=avc1.42E01E,mp4a.40.2";
    if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
    return "video/webm";
  }

  function computeBands(analyser: AnalyserNode, buf: Uint8Array<ArrayBuffer>, n: number): number[] {
    analyser.getByteFrequencyData(buf);
    const per = Math.floor(buf.length / n);
    const out: number[] = [];
    for (let b = 0; b < n; b++) {
      let sum = 0;
      for (let k = 0; k < per; k++) sum += buf[b * per + k];
      const raw = (sum / per) / 255;
      // Square-root curve: boosts quiet ASMR voices without clipping loud ones
      out.push(Math.min(1, Math.sqrt(raw) * 1.6));
    }
    return out;
  }

  function drawFrame(
    ctx2d: CanvasRenderingContext2D,
    bands: number[],
    progress: number,
    freqBuf?: Uint8Array,
    sampleRate?: number,
    dt?: number,
    freqL?: Uint8Array,
    freqR?: Uint8Array,
    animSec?: number
  ) {
    const img = imgElRef.current;
    if (style === "waveform" && freqBuf && sampleRate) {
      drawWaveformCard(ctx2d, cfg, img, freqBuf, sampleRate, dt, freqL, freqR);
    } else if (style === "nowplaying") {
      drawNowPlayingCard(ctx2d, cfg, img, bands, progress, audioDurationRef.current || undefined, freqBuf, sampleRate, dt, freqL, freqR, animSec);
    } else {
      const amp = bands.reduce((a, b) => a + b, 0) / Math.max(1, bands.length);
      drawSoundOrbCard(ctx2d, cfg, img, amp, freqBuf);
    }
  }

  function finishRecording(mimeType: string) {
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(recChunksRef.current, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${style}-teaser.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function stopRec() {
    recStopLoopRef.current?.();
    recStopLoopRef.current = null;
    recMrRef.current?.stop();
    setRenderTimeLeft("");
  }

  const startRenderRecording = useCallback(async () => {
    if (!audioFile) return;
    const mimeType = getMimeType();

    const arrayBuf = await audioFile.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
    const audioCtx = new AudioCtx();
    recAudioCtxRef.current = audioCtx;

    let audioBuf: AudioBuffer;
    try {
      audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    } catch {
      alert("Could not decode audio file.");
      audioCtx.close();
      return;
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.65;
    const splitter = audioCtx.createChannelSplitter(2);
    const analyserL = audioCtx.createAnalyser();
    analyserL.fftSize = 4096; analyserL.smoothingTimeConstant = 0.65;
    const analyserR = audioCtx.createAnalyser();
    analyserR.fftSize = 4096; analyserR.smoothingTimeConstant = 0.65;
    const dest = audioCtx.createMediaStreamDestination();
    analyser.connect(dest);

    // Keep AudioContext alive in background: Chrome suspends contexts that
    // aren't connected to the speaker. A near-silent gain node prevents that.
    const keepAlive = audioCtx.createGain();
    keepAlive.gain.value = 0.0001;
    analyser.connect(keepAlive);
    keepAlive.connect(audioCtx.destination);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(analyser);
    source.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W; canvas.height = OUT_H;
    // 60fps so the waveform attack/decay AND analyser smoothing match the
    // live preview (which is requestAnimationFrame-driven at ~60fps).
    const videoStream = canvas.captureStream(60);
    const combined = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

    const mr = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: 12_000_000,
      audioBitsPerSecond: 256_000,
    });
    recChunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
    mr.onstop = () => {
      finishRecording(mimeType);
      setRecState("idle");
      audioCtx.close();
    };
    recMrRef.current = mr;
    mr.start();
    setRecState("render");

    await preloadCanvasAssets();
    const startTime = audioCtx.currentTime;
    source.start();
    source.onended = () => stopRec();

    const ctx2d = canvas.getContext("2d")!;
    ctx2d.imageSmoothingEnabled = true;
    ctx2d.imageSmoothingQuality = "high";
    const scaleX = OUT_W / CANVAS_W, scaleY = OUT_H / CANVAS_H;
    const freqBuf = new Uint8Array(analyser.frequencyBinCount);
    const freqLBuf = new Uint8Array(analyserL.frequencyBinCount);
    const freqRBuf = new Uint8Array(analyserR.frequencyBinCount);

    function fmt(s: number) {
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return `${m}:${String(sec).padStart(2, "0")}`;
    }
    let frameCount = 0;
    let lastT = performance.now();
    const intervalId = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      const elapsed = audioCtx.currentTime - startTime;
      const progress = Math.min(1, elapsed / audioBuf.duration);
      if (frameCount++ % 60 === 0) {
        const left = Math.max(0, audioBuf.duration - elapsed);
        const achievedFps = elapsed > 0 ? (frameCount / elapsed).toFixed(1) : "—";
        console.log(`[waveform render] frame ${frameCount}, ${elapsed.toFixed(1)}s elapsed, ~${achievedFps} fps`);
        setRenderTimeLeft(`${fmt(elapsed)} / ${fmt(audioBuf.duration)}  (${fmt(left)} left)`);
      }
      analyser.getByteFrequencyData(freqBuf);
      analyserL.getByteFrequencyData(freqLBuf);
      analyserR.getByteFrequencyData(freqRBuf);
      const bands = computeBands(analyser, freqBuf, 18);
      ctx2d.save();
      ctx2d.scale(scaleX, scaleY);
      drawFrame(ctx2d, bands, progress, freqBuf, audioCtx.sampleRate, dt, freqLBuf, freqRBuf, elapsed);
      ctx2d.restore();
    }, 1000 / 60);
    recStopLoopRef.current = () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile, cfg, style]);

  const set = useCallback(<K extends keyof AudioTeaserConfig>(key: K, val: AudioTeaserConfig[K]) => {
    setCfg(prev => {
      const next = { ...prev, [key]: val };
      saveStored(style, next);
      return next;
    });
  }, [style]);

  const buildPreview = useCallback(async (c: AudioTeaserConfig) => {
    try {
      const tpl = await loadAudioTeaserTemplate(c.style);
      const html = buildAudioTeaserHtml(tpl, c);
      const blob = new Blob([html], { type: "text/html" });
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = URL.createObjectURL(blob);
      setPreviewSrc(blobRef.current);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buildPreview(cfg), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [cfg, buildPreview]);

  useEffect(() => {
    if (audioMinutes && audioMinutes !== cfg.minutes) set("minutes", audioMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioMinutes]);

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("image", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [set]);

  const colW = 290;
  const scale = colW / CARD_W;
  const displayH = Math.round(CARD_H * scale);

  return (
    <div style={{ flex: "0 0 290px", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontSize: 20, color: KANJI, fontFamily: SERIF, lineHeight: 1 }}>{kanji}</span>
        <span style={{
          fontSize: 10, letterSpacing: "0.4em", color: INK_DIM,
          fontFamily: SANS, textTransform: "uppercase",
        }}>{label}</span>
      </div>

      {/* Preview */}
      <div style={{
        width: colW, height: displayH,
        borderRadius: 11, overflow: "hidden",
        border: `1px solid ${LINE_STR}`,
        background: "#080205",
        flexShrink: 0,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {previewSrc && (
          <iframe
            key={previewSrc}
            src={previewSrc}
            onLoad={e => {
              const win = (e.currentTarget as HTMLIFrameElement).contentWindow;
              iframeWinRef.current = win;
              onWindow(style, win);
              if (waveformDataRef.current.length > 0 && win) {
                win.postMessage({ type: "waveform", data: waveformDataRef.current }, "*");
              }
            }}
            style={{
              width: CARD_W, height: CARD_H, border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left", display: "block",
            }}
            sandbox="allow-scripts"
          />
        )}
      </div>

      {/* Render button */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: colW }}>
        <button
            onClick={recState === "render" ? stopRec : () => void startRenderRecording()}
            disabled={!audioFile && recState !== "render"}
            title={!audioFile && recState !== "render" ? "Upload audio first" : undefined}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 8,
              cursor: (!audioFile && recState === "idle") ? "default" : "pointer",
              border: recState === "render"
                ? "1px solid rgba(255,90,90,0.7)"
                : audioFile ? "1px solid rgba(100,210,210,0.4)" : "1px solid rgba(255,255,255,0.1)",
              background: recState === "render" ? "rgba(255,60,60,0.14)" : audioFile ? "rgba(80,200,200,0.07)" : "transparent",
              color: recState === "render" ? "#ff9090" : audioFile && recState === "idle" ? "#88dddd" : INK_DIM,
              fontSize: 10, fontFamily: SANS, letterSpacing: "0.18em",
              textTransform: "uppercase",
              transition: "border 0.2s, background 0.2s",
            }}
          >{recState === "render" ? "■ Stop" : "⬇ Render"}</button>

        {/* Render timer — shown prominently while rendering */}
        {recState === "render" && renderTimeLeft && (
          <div style={{
            textAlign: "center", fontFamily: SANS,
            color: "#ff9090", letterSpacing: "0.12em",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{renderTimeLeft}</span>
            <span style={{ fontSize: 8.5, opacity: 0.6, letterSpacing: "0.22em", textTransform: "uppercase" }}>remaining</span>
          </div>
        )}
      </div>

      {/* Editor panel */}
      <div style={{
        background: PANEL,
        border: `1px solid ${LINE_STR}`,
        borderTop: `2px solid rgba(255,150,180,0.35)`,
        borderRadius: 12,
        padding: "16px 14px 10px",
        display: "flex", flexDirection: "column",
        boxShadow: "0 6px 28px rgba(0,0,0,0.5)",
      }}>

        {/* Cover image section */}
        <Section title="Cover Image">
          <label style={{ display: "block", cursor: "pointer", marginBottom: 4 }}>
            <div style={{
              height: cfg.image ? 70 : 42, borderRadius: 7,
              border: `1px dashed ${cfg.image ? "transparent" : LINE_STR}`,
              background: cfg.image ? "transparent" : "rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {cfg.image
                ? <img src={cfg.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 7 }} />
                : <span style={{ fontSize: 9, color: INK_DIM, letterSpacing: "0.3em", fontFamily: SANS }}>＋  Upload</span>
              }
            </div>
            <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          </label>
          {cfg.image && (
            <button onClick={() => set("image", "")} style={{
              fontSize: 8, color: INK_DIM, background: "none", border: "none",
              cursor: "pointer", letterSpacing: "0.24em", fontFamily: SANS,
              padding: "2px 0 8px", textAlign: "left", opacity: 0.65,
            }}>✕  Remove</button>
          )}
        </Section>

        {/* Card-internal fields */}
        {style === "waveform" && (
          <Section title="Card Text" accent>
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
            <Field label="Card Label" value={cfg.cardLabel} onChange={v => set("cardLabel", v)} placeholder="RP AUDIO" />
          </Section>
        )}
        {style === "nowplaying" && (
          <Section title="Card Text" accent>
            <Field label="Title" value={cfg.title} onChange={v => set("title", v)} placeholder="Whisper & Rain" />
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          </Section>
        )}
        {style === "soundorb" && (
          <Section title="Orb Caption" accent>
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          </Section>
        )}


      </div>
    </div>
  );
}

// ── Transport bar ─────────────────────────────────────────────────────────
function Transport({
  engine,
  onAudioFile,
}: {
  engine: ReturnType<typeof useAudioEngine>;
  onAudioFile: (f: File | null) => void;
}) {
  const { hasAudio, fileName, playing, load, toggle } = engine;

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { load(f); onAudioFile(f); }
    e.target.value = "";
  }, [load, onAudioFile]);

  return (
    <div style={{
      width: "100%", maxWidth: 980, margin: "0 auto 6px",
      background: PANEL, border: `1px solid ${LINE_STR}`,
      borderTop: `2px solid rgba(255,150,180,0.35)`,
      borderRadius: 14, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 18,
      boxShadow: "0 6px 28px rgba(0,0,0,0.45)",
    }}>
      {/* Upload */}
      <label style={{ cursor: "pointer", flexShrink: 0 }}>
        <span style={{
          display: "inline-block", padding: "9px 16px", borderRadius: 9,
          background: "rgba(255,140,170,0.10)", border: `1px solid ${LINE_STR}`,
          color: ROSE, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase",
          fontFamily: SANS,
        }}>♪  {hasAudio ? "Replace Audio" : "Upload Audio"}</span>
        <input type="file" accept="audio/*,video/*" onChange={onFile} style={{ display: "none" }} />
      </label>

      {/* Play / pause — drives all three previews */}
      <button
        onClick={toggle}
        disabled={!hasAudio}
        title={hasAudio ? (playing ? "Pause" : "Play — animates all previews") : "Upload audio first"}
        style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          border: hasAudio
            ? "1.5px solid rgba(255,160,195,0.55)"
            : `1px solid ${LINE_STR}`,
          background: hasAudio
            ? playing
              ? "linear-gradient(135deg, rgba(255,100,150,0.28), rgba(200,100,255,0.18))"
              : "linear-gradient(135deg, rgba(255,140,175,0.22), rgba(180,100,255,0.13))"
            : "transparent",
          color: hasAudio ? "#ffb8cc" : INK_DIM,
          cursor: hasAudio ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: hasAudio
            ? playing
              ? "0 0 16px rgba(255,120,170,0.45), inset 0 0 8px rgba(255,100,160,0.12)"
              : "0 0 10px rgba(255,120,170,0.25)"
            : "none",
          transition: "box-shadow 0.3s, background 0.3s, border 0.3s",
        }}
      >
        {playing
          ? <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="3.5" height="10" rx="1.2"/><rect x="8.5" y="2" width="3.5" height="10" rx="1.2"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="3,1 13,7 3,13"/></svg>
        }
      </button>

      {/* Status text */}
      <div style={{
        flex: 1, minWidth: 0, fontSize: 12, color: INK, fontFamily: SERIF,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {hasAudio ? fileName : <span style={{ color: INK_DIM, fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em" }}>Upload a file to drive all three previews</span>}
      </div>
    </div>
  );
}


// ── CSS keyframes for spinner ─────────────────────────────────────────────
const spinStyle = `
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ── Main export ───────────────────────────────────────────────────────────
export function AudioTeaserBuilder() {
  const windowsRef = useRef<Map<string, Window>>(new Map());
  const getTargets = useCallback(() => Array.from(windowsRef.current.values()), []);
  const engine = useAudioEngine(getTargets);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Pre-analyze uploaded audio → 40 normalized RMS amplitude values.
  // This is what drives the waveform bar heights: shape comes from the file,
  // real-time amplitude just scales it up/down.
  useEffect(() => {
    if (!audioFile) { setWaveformData([]); return; }
    let cancelled = false;
    audioFile.arrayBuffer().then(async buf => {
      if (cancelled) return;
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(buf);
      audioCtx.close();
      if (cancelled) return;
      const samples = decoded.getChannelData(0);
      const N = 40;
      const step = Math.floor(samples.length / N);
      const wf = Array.from({ length: N }, (_, i) => {
        let sum = 0;
        const start = i * step;
        for (let j = 0; j < step; j++) sum += samples[start + j] ** 2;
        return Math.sqrt(sum / step);
      });
      const max = Math.max(...wf, 0.001);
      setWaveformData(wf.map(v => v / max));
    }).catch(err => console.error("waveform analysis failed", err));
    return () => { cancelled = true; };
  }, [audioFile]);

  const onWindow = useCallback((style: TeaserStyle, win: Window | null) => {
    if (win) windowsRef.current.set(style, win);
    else windowsRef.current.delete(style);
  }, []);

  const audioMinutes = engine.duration > 0
    ? String(Math.max(1, Math.ceil(engine.duration / 60)))
    : null;

  return (
    <div style={{ padding: "24px 32px 60px" }}>
      <style>{spinStyle}</style>

      {/* Hidden shared audio element */}
      <audio
        ref={engine.audioRef}
        onLoadedMetadata={engine.onLoadedMetadata}
        onEnded={engine.onEnded}
        style={{ display: "none" }}
      />

      <Transport engine={engine} onAudioFile={setAudioFile} />

      <div style={{ display: "flex", gap: 24, marginTop: 22, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
        {STYLES.map(s => (
          <TeaserCard
            key={s.key} style={s.key} kanji={s.kanji} label={s.label}
            onWindow={onWindow} audioMinutes={audioMinutes}
            audioFile={audioFile}
            audioDuration={engine.duration}
            waveformData={waveformData}
          />
        ))}

        {/* Single squiggle hint — sits to the right of all cards */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 10, paddingTop: 80, opacity: 0.7, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36,
            backgroundColor: "#ffb8c8",
            WebkitMaskImage: "url(/images/squiggle-arrow.png)",
            maskImage: "url(/images/squiggle-arrow.png)",
            WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
            WebkitMaskSize: "contain", maskSize: "contain",
            WebkitMaskPosition: "center", maskPosition: "center",
            transform: "scaleX(-1)",
          }} />
          <span style={{
            fontSize: 11, color: "#a98a92", fontFamily: SANS,
            letterSpacing: "0.06em", lineHeight: 1.5,
            textAlign: "center", maxWidth: 90, writingMode: "horizontal-tb",
          }}>
            render takes as long as the audio
          </span>
        </div>
      </div>

    </div>
  );
}
