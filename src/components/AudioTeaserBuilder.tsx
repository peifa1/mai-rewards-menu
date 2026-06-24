import { useCallback, useEffect, useRef, useState } from "react";
import { loadAudioTeaserTemplate } from "@/lib/audioTeaserTemplate";
import { useAudioEngine, formatTime } from "@/lib/useAudioEngine";
import {
  buildAudioTeaserHtml,
  DEFAULT_AUDIO_TEASER_CONFIG,
  normalizeAudioTeaserConfig,
  type AudioTeaserConfig,
  type TeaserStyle,
} from "@/lib/buildAudioTeaser";
import { dispatchRenderJob } from "@/lib/renderApi";
import {
  CANVAS_W, CANVAS_H, OUT_W, OUT_H,
  drawWaveformCard,
  drawNowPlayingCard,
  drawSoundOrbCard,
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

// ── Render state ──────────────────────────────────────────────────────────
type RenderPhase =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "queued"; jobId: string; audioUrl: string; imageUrl: string }
  | { phase: "rendering"; jobId: string; audioUrl: string; imageUrl: string }
  | { phase: "done"; jobId: string; audioUrl: string; imageUrl: string; downloadUrl: string }
  | { phase: "error"; message: string };

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

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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

// ── Render status badge ───────────────────────────────────────────────────
function RenderStatus({ state, onDownload, onDismiss }: {
  state: RenderPhase;
  onDownload: () => void;
  onDismiss: () => void;
}) {
  if (state.phase === "idle") return null;

  const phaseLabel: Record<string, string> = {
    uploading: "Uploading…",
    queued: "Queued — waiting for runner",
    rendering: "Rendering…",
    done: "Ready",
    error: "Failed",
  };

  const isActive = state.phase === "uploading" || state.phase === "queued" || state.phase === "rendering";
  const isDone = state.phase === "done";
  const isError = state.phase === "error";

  return (
    <div style={{
      marginTop: 6,
      padding: "10px 12px",
      borderRadius: 9,
      background: isDone ? "rgba(120,200,140,0.10)" : isError ? "rgba(200,80,80,0.10)" : "rgba(255,140,170,0.06)",
      border: `1px solid ${isDone ? "rgba(120,200,140,0.3)" : isError ? "rgba(200,80,80,0.3)" : LINE_STR}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      {/* Spinner or icon */}
      {isActive && (
        <div style={{
          width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${LINE_STR}`,
          borderTopColor: ROSE,
          animation: "spin 0.8s linear infinite",
        }} />
      )}
      {isDone && <span style={{ fontSize: 14, flexShrink: 0 }}>✓</span>}
      {isError && <span style={{ fontSize: 14, flexShrink: 0, color: "#e88" }}>✕</span>}

      {/* Label */}
      <span style={{
        fontFamily: SANS, fontSize: 9, letterSpacing: "0.18em",
        color: isDone ? "rgba(140,220,160,0.9)" : isError ? "#e88" : INK_DIM,
        flex: 1,
      }}>
        {isError ? (state as { phase: "error"; message: string }).message.slice(0, 80) : phaseLabel[state.phase]}
      </span>

      {/* Actions */}
      {isDone && (
        <button
          onClick={onDownload}
          style={{
            padding: "5px 10px", borderRadius: 7,
            border: "1px solid rgba(140,220,160,0.4)",
            background: "rgba(120,200,140,0.12)",
            color: "rgba(160,230,180,0.95)",
            fontSize: 9, letterSpacing: "0.2em", fontFamily: SANS,
            cursor: "pointer", flexShrink: 0,
          }}
        >
          ▼ Download
        </button>
      )}
      <button
        onClick={onDismiss}
        disabled={isActive}
        style={{
          background: "none", border: "none", color: INK_DIM, cursor: isActive ? "default" : "pointer",
          fontSize: 11, padding: 0, opacity: isActive ? 0.3 : 0.6, flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Single card column ────────────────────────────────────────────────────
function TeaserCard({ style, kanji, label, onWindow, audioMinutes, audioFile, audioDuration }: {
  style: TeaserStyle; kanji: string; label: string;
  onWindow: (style: TeaserStyle, win: Window | null) => void;
  audioMinutes: string | null;
  audioFile: File | null;
  audioDuration: number;
}) {
  const [cfg, setCfg] = useState<AudioTeaserConfig>(() => loadStored(style));
  const [previewSrc, setPreviewSrc] = useState("");
  const blobRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renderState, setRenderState] = useState<RenderPhase>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Canvas recorder ──────────────────────────────────────────────────────
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const [recState, setRecState] = useState<"idle" | "live" | "render">("idle");
  const [renderTimeLeft, setRenderTimeLeft] = useState<string>("");
  const recMrRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStopLoopRef = useRef<(() => void) | null>(null);
  const recAudioCtxRef = useRef<AudioContext | null>(null);
  const recMicRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!cfg.image) { imgElRef.current = null; return; }
    const img = new Image();
    img.src = cfg.image;
    imgElRef.current = img;
  }, [cfg.image]);

  useEffect(() => () => {
    recStopLoopRef.current?.();
    recAudioCtxRef.current?.close();
    recMicRef.current?.getTracks().forEach(t => t.stop());
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
    progress: number
  ) {
    const img = imgElRef.current;
    if (style === "waveform") {
      drawWaveformCard(ctx2d, cfg, img, bands);
    } else if (style === "nowplaying") {
      drawNowPlayingCard(ctx2d, cfg, img, bands, progress, audioDuration || undefined);
    } else {
      const amp = bands.reduce((a, b) => a + b, 0) / Math.max(1, bands.length);
      drawSoundOrbCard(ctx2d, cfg, img, amp);
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

  const startLiveRecording = useCallback(async () => {
    const mimeType = getMimeType();
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
        },
        video: false,
      });
    } catch {
      alert("Microphone access denied. Please allow mic permission and try again.");
      return;
    }
    recMicRef.current = mic;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
    const audioCtx = new AudioCtx();
    recAudioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    audioCtx.createMediaStreamSource(mic).connect(analyser);
    const freqBuf = new Uint8Array(analyser.frequencyBinCount);

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W; canvas.height = OUT_H;
    const videoStream = canvas.captureStream(30);
    const combined = new MediaStream([...videoStream.getVideoTracks(), ...mic.getAudioTracks()]);

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
      mic.getTracks().forEach(t => t.stop());
      audioCtx.close();
    };
    recMrRef.current = mr;
    mr.start();
    setRecState("live");

    const ctx2d = canvas.getContext("2d")!;
    ctx2d.imageSmoothingEnabled = true;
    ctx2d.imageSmoothingQuality = "high";
    const scaleX = OUT_W / CANVAS_W, scaleY = OUT_H / CANVAS_H;
    const intervalId = setInterval(() => {
      const bands = computeBands(analyser, freqBuf, 18);
      const progress = ((Date.now() / 1000) % 6) / 6;
      ctx2d.save();
      ctx2d.scale(scaleX, scaleY);
      drawFrame(ctx2d, bands, progress);
      ctx2d.restore();
    }, 1000 / 30);
    recStopLoopRef.current = () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, style]);

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
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
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

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W; canvas.height = OUT_H;
    const videoStream = canvas.captureStream(30);
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

    const startTime = audioCtx.currentTime;
    source.start();
    source.onended = () => stopRec();

    const ctx2d = canvas.getContext("2d")!;
    ctx2d.imageSmoothingEnabled = true;
    ctx2d.imageSmoothingQuality = "high";
    const scaleX = OUT_W / CANVAS_W, scaleY = OUT_H / CANVAS_H;
    const freqBuf = new Uint8Array(analyser.frequencyBinCount);

    function fmt(s: number) {
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return `${m}:${String(sec).padStart(2, "0")}`;
    }
    let frameCount = 0;
    const intervalId = setInterval(() => {
      const elapsed = audioCtx.currentTime - startTime;
      const progress = Math.min(1, elapsed / audioBuf.duration);
      if (frameCount++ % 30 === 0) {
        const left = Math.max(0, audioBuf.duration - elapsed);
        setRenderTimeLeft(`${fmt(elapsed)} / ${fmt(audioBuf.duration)}  (${fmt(left)} left)`);
      }
      const bands = computeBands(analyser, freqBuf, 18);
      ctx2d.save();
      ctx2d.scale(scaleX, scaleY);
      drawFrame(ctx2d, bands, progress);
      ctx2d.restore();
    }, 1000 / 30);
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

  // Stop polling on unmount
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const startPolling = useCallback((jobId: string, audioUrl: string, imageUrl: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await fetch(`/api/check-render?jobId=${jobId}`).then(r => r.json()) as { status: string; downloadUrl: string };
        if (result.status === "error") {
          clearInterval(pollRef.current!);
          setRenderState({ phase: "error", message: "Render failed — check GitHub Actions logs" });
        } else if (result.status === "done" && result.downloadUrl) {
          clearInterval(pollRef.current!);
          setRenderState({ phase: "done", jobId, audioUrl, imageUrl, downloadUrl: result.downloadUrl });
        }
      } catch { /* network blip, try again next tick */ }
    }, 6000);
  }, []);

  const handleRender = useCallback(async () => {
    if (!audioFile) return;
    setRenderState({ phase: "uploading" });

    try {
      const jobId = nanoid();
      const ext = audioFile.name.split(".").pop() ?? "mp3";

      // Dynamic import avoids SSR side-effects from @vercel/blob/client
      const { upload } = await import("@vercel/blob/client");

      // Upload audio directly to Vercel Blob CDN via client upload
      const { url: audioUrl } = await upload(`audio/${jobId}.${ext}`, audioFile, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });

      // Upload image directly to Vercel Blob CDN (if any)
      let imageUrl = "";
      if (cfg.image) {
        const imgBlob = await fetch(cfg.image).then(r => r.blob());
        const imgFile = new File([imgBlob], `${jobId}.webp`, { type: "image/webp" });
        const result = await upload(`images/${jobId}.webp`, imgFile, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
        });
        imageUrl = result.url;
      }

      setRenderState({ phase: "queued", jobId, audioUrl, imageUrl });

      const dispatch = await dispatchRenderJob({
        data: {
          jobId, style,
          config: {
            title: cfg.title, eyebrow: cfg.eyebrow, genre: cfg.genre, badge: cfg.badge,
            minutes: cfg.minutes, asmrLabel: cfg.asmrLabel,
            cardLabel: cfg.cardLabel, timeStart: cfg.timeStart,
          },
          audioPath: audioUrl, imagePath: imageUrl, durationSeconds: audioDuration,
        },
      });
      if (!dispatch.ok) throw new Error(dispatch.error ?? "Dispatch failed");

      setRenderState({ phase: "rendering", jobId, audioUrl, imageUrl });
      startPolling(jobId, audioUrl, imageUrl);
    } catch (e: unknown) {
      let msg = "Render failed";
      if (e instanceof Error) msg = e.message;
      else if (e && typeof e === "object" && "message" in e) msg = String((e as { message: unknown }).message);
      else if (typeof e === "string") msg = e;
      setRenderState({ phase: "error", message: msg.slice(0, 120) });
    }
  }, [audioFile, cfg, style, audioDuration, startPolling]);

  const handleDownload = useCallback(() => {
    if (renderState.phase !== "done") return;
    const { downloadUrl, jobId, audioUrl, imageUrl } = renderState;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${style}-teaser-${jobId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Cleanup blobs after download (best-effort)
    const toDelete = [downloadUrl, audioUrl];
    if (imageUrl) toDelete.push(imageUrl);
    fetch("/api/cleanup-render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: toDelete }),
    }).catch(() => {});
    setRenderState({ phase: "idle" });
  }, [renderState, style]);

  const handleDismiss = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setRenderState({ phase: "idle" });
  }, []);

  const colW = 290;
  const scale = colW / CARD_W;
  const displayH = Math.round(CARD_H * scale);
  const isRendering = renderState.phase !== "idle" && renderState.phase !== "error" && renderState.phase !== "done";

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
            onLoad={e => onWindow(style, (e.currentTarget as HTMLIFrameElement).contentWindow)}
            style={{
              width: CARD_W, height: CARD_H, border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left", display: "block",
            }}
            sandbox="allow-scripts"
          />
        )}
      </div>

      {/* Recording buttons */}
      <div style={{ display: "flex", gap: 8, width: colW }}>
        {/* Record Live */}
        <button
          onClick={recState === "live" ? stopRec : () => void startLiveRecording()}
          disabled={recState === "render"}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 8, cursor: recState === "render" ? "default" : "pointer",
            border: recState === "live"
              ? "1px solid rgba(255,90,90,0.7)"
              : "1px solid rgba(255,100,120,0.35)",
            background: recState === "live" ? "rgba(255,60,60,0.14)" : "rgba(255,100,120,0.07)",
            color: recState === "live" ? "#ff9090" : recState === "render" ? INK_DIM : "#ffaabb",
            fontSize: 10, fontFamily: SANS, letterSpacing: "0.18em",
            textTransform: "uppercase",
            animation: recState === "live" ? "recpulse 1.2s ease-in-out infinite" : "none",
            transition: "border 0.2s, background 0.2s",
          }}
        >{recState === "live" ? "■ Stop" : "⏺ Record"}</button>

        {/* Render MP4 */}
        <button
          onClick={recState === "render" ? stopRec : () => void startRenderRecording()}
          disabled={(!audioFile && recState !== "render") || recState === "live"}
          title={!audioFile && recState !== "render" ? "Upload audio first" : undefined}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 8,
            cursor: (recState === "live" || (!audioFile && recState === "idle")) ? "default" : "pointer",
            border: recState === "render"
              ? "1px solid rgba(255,90,90,0.7)"
              : audioFile ? "1px solid rgba(100,210,210,0.4)" : "1px solid rgba(255,255,255,0.1)",
            background: recState === "render" ? "rgba(255,60,60,0.14)" : audioFile ? "rgba(80,200,200,0.07)" : "transparent",
            color: recState === "render" ? "#ff9090" : audioFile && recState === "idle" ? "#88dddd" : INK_DIM,
            fontSize: 10, fontFamily: SANS, letterSpacing: "0.18em",
            textTransform: "uppercase",
            transition: "border 0.2s, background 0.2s",
          }}
        >
          {recState === "render"
            ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, lineHeight: 1.3 }}>
                <span>■ Stop</span>
                {renderTimeLeft && <span style={{ fontSize: 7.5, opacity: 0.75, letterSpacing: "0.04em", textTransform: "none" }}>{renderTimeLeft}</span>}
              </div>
            : "⬇ Render"}
        </button>
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
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          </Section>
        )}
        {style === "soundorb" && (
          <Section title="Orb Caption" accent>
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          </Section>
        )}


        {/* Render MP4 button */}
        <button
          onClick={() => void handleRender()}
          disabled={!audioFile || isRendering}
          title={!audioFile ? "Upload an audio file first" : undefined}
          style={{
            marginTop: 4,
            width: "100%", padding: "11px 0", borderRadius: 9,
            border: `1px solid ${audioFile && !isRendering ? "rgba(200,160,120,0.5)" : LINE}`,
            background: audioFile && !isRendering ? "rgba(200,160,100,0.10)" : "transparent",
            color: audioFile && !isRendering ? "rgba(230,190,140,0.95)" : INK_DIM,
            fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase",
            fontFamily: SANS, cursor: audioFile && !isRendering ? "pointer" : "default",
            opacity: isRendering ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {!audioFile ? "⬛  Render MP4  (upload audio first)" : isRendering ? "◌  Rendering…" : "▶  Render MP4"}
        </button>

        {/* Render status */}
        <RenderStatus
          state={renderState}
          onDownload={handleDownload}
          onDismiss={handleDismiss}
        />
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
  const { hasAudio, fileName, playing, duration, currentTime, load, toggle, seek } = engine;

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
        <input type="file" accept="audio/*" onChange={onFile} style={{ display: "none" }} />
      </label>

      {/* Play / pause */}
      <button
        onClick={toggle}
        disabled={!hasAudio}
        style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          border: `1px solid ${hasAudio ? ROSE : LINE_STR}`,
          background: hasAudio ? "rgba(255,140,170,0.12)" : "transparent",
          color: hasAudio ? ROSE : INK_DIM,
          cursor: hasAudio ? "pointer" : "default",
          fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >{playing ? "❚❚" : "▶"}</button>

      {/* Scrubber + time */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: INK, fontFamily: SERIF,
          marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {hasAudio ? fileName : <span style={{ color: INK_DIM, fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em" }}>No audio loaded — upload a file to drive all three previews</span>}
        </div>
        <input
          type="range"
          min={0} max={duration || 0} step={0.01} value={currentTime}
          onChange={e => seek(Number(e.target.value))}
          disabled={!hasAudio}
          style={{ width: "100%", accentColor: ROSE, cursor: hasAudio ? "pointer" : "default" }}
        />
      </div>

      <div style={{
        flexShrink: 0, fontFamily: SANS, fontSize: 11, color: INK_DIM,
        letterSpacing: "0.06em", minWidth: 86, textAlign: "right",
      }}>{formatTime(currentTime)} / {formatTime(duration)}</div>
    </div>
  );
}


// ── CSS keyframes for spinner ─────────────────────────────────────────────
const spinStyle = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes recpulse { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
`;

// ── Main export ───────────────────────────────────────────────────────────
export function AudioTeaserBuilder() {
  const windowsRef = useRef<Map<string, Window>>(new Map());
  const getTargets = useCallback(() => Array.from(windowsRef.current.values()), []);
  const engine = useAudioEngine(getTargets);
  const [audioFile, setAudioFile] = useState<File | null>(null);

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

      <div style={{
        display: "flex", gap: 24, marginTop: 22,
        justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap",
      }}>
        {STYLES.map(s => (
          <TeaserCard
            key={s.key} style={s.key} kanji={s.kanji} label={s.label}
            onWindow={onWindow} audioMinutes={audioMinutes}
            audioFile={audioFile}
            audioDuration={engine.duration}
          />
        ))}
      </div>

    </div>
  );
}
