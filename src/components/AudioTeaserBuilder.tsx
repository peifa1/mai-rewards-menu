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
function TeaserCard({ style, kanji, label, onWindow, audioMinutes, onBroadcast, audioFile, audioDuration }: {
  style: TeaserStyle; kanji: string; label: string;
  onWindow: (style: TeaserStyle, win: Window | null) => void;
  audioMinutes: string | null;
  onBroadcast: (src: string, style: TeaserStyle, cfg: AudioTeaserConfig) => void;
  audioFile: File | null;
  audioDuration: number;
}) {
  const [cfg, setCfg] = useState<AudioTeaserConfig>(() => loadStored(style));
  const [previewSrc, setPreviewSrc] = useState("");
  const blobRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renderState, setRenderState] = useState<RenderPhase>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      {/* Broadcast for OBS */}
      <button
        onClick={() => previewSrc && onBroadcast(previewSrc, style, cfg)}
        disabled={!previewSrc}
        style={{
          width: colW, padding: "10px 0", borderRadius: 9,
          border: `1px solid ${ROSE}`, background: "rgba(255,140,170,0.10)",
          color: ROSE, fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase",
          fontFamily: SANS, cursor: previewSrc ? "pointer" : "default",
        }}
      >●  Broadcast for OBS</button>

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
            <Field label="Time Start" value={cfg.timeStart} onChange={v => set("timeStart", v)} placeholder="03:12" />
          </Section>
        )}
        {style === "soundorb" && (
          <Section title="Orb Caption" accent>
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          </Section>
        )}

        {/* Bottom strip fields */}
        <Section title="Bottom Strip">
          <Field label="Title"          value={cfg.title}   onChange={v => set("title", v)}   placeholder="Whisper & Rain" />
          <Field label="Eyebrow"        value={cfg.eyebrow} onChange={v => set("eyebrow", v)} placeholder="New Drop" />
          <Field label="Genre"          value={cfg.genre}   onChange={v => set("genre", v)}   placeholder="ASMR Roleplay" />
          <Field label="Badge"          value={cfg.badge}   onChange={v => set("badge", v)}   placeholder="Exclusive" />
          <Field label="Duration (min)" value={cfg.minutes} onChange={v => set("minutes", v)} placeholder="24" />
        </Section>

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

// ── Broadcast (OBS) overlay ───────────────────────────────────────────────
const MIC_BANDS = 32;

function BroadcastOverlay({ src, style, cfg, onClose }: {
  src: string;
  style: TeaserStyle;
  cfg: AudioTeaserConfig;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [micStatus, setMicStatus] = useState<"pending" | "active" | "denied">("pending");
  const [pulse, setPulse] = useState(false);
  const [copied, setCopied] = useState(false);

  const templateFile = style === "waveform" ? "audio_waveform.html"
    : style === "nowplaying" ? "audio_nowplaying.html"
    : "audio_soundorb.html";

  const handleCopyObsUrl = useCallback(() => {
    // Store full config (including image data URL) in localStorage so the
    // OBS Browser Source (same origin) can read it without URL length limits.
    const storageKey = `obs_teaser_${style}`;
    localStorage.setItem(storageKey, JSON.stringify(cfg));
    const url = `${window.location.origin}/${templateFile}?obsKey=${encodeURIComponent(storageKey)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [cfg, style, templateFile]);

  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Mic capture + analyser loop — all internal, doesn't touch the audio engine
  useEffect(() => {
    let rafId: number | null = null;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new Ctx();
        // Resume immediately — AudioContext can start suspended if created outside a direct user gesture
        void ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        const micSrc = ctx.createMediaStreamSource(s);
        micSrc.connect(analyser);
        // intentionally not connected to destination — no mic playback
        const freq = new Uint8Array(analyser.frequencyBinCount);

        setMicStatus("active");

        const tick = () => {
          rafId = requestAnimationFrame(tick);
          // Re-resume each tick in case context got suspended again
          if (ctx!.state === "suspended") void ctx!.resume();
          analyser.getByteFrequencyData(freq);
          const per = Math.floor(freq.length / MIC_BANDS);
          const bands: number[] = new Array(MIC_BANDS);
          let sum = 0;
          for (let b = 0; b < MIC_BANDS; b++) {
            let acc = 0;
            for (let k = 0; k < per; k++) acc += freq[b * per + k];
            const v = acc / per / 255;
            bands[b] = v;
            sum += v;
          }
          const amp = Math.min(1, (sum / MIC_BANDS) * 1.7);
          try { iframeRef.current?.contentWindow?.postMessage({ type: "aud", s: bands, amp }, "*"); } catch {}
        };
        rafId = requestAnimationFrame(tick);
      })
      .catch(() => { if (!cancelled) setMicStatus("denied"); });

    // Pulse the indicator dot every second while active
    const pulseInterval = setInterval(() => setPulse(p => !p), 800);

    return () => {
      cancelled = true;
      clearInterval(pulseInterval);
      if (rafId != null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach(t => t.stop());
      ctx?.close().catch(() => {});
    };
  }, []);

  const SIDEBAR_W = 160;
  const availW = vp.w - SIDEBAR_W - 24;
  const availH = vp.h - 24;
  const scale = Math.min(availH / CARD_H, availW / CARD_W);
  const dispW = Math.round(CARD_W * scale);
  const dispH = Math.round(CARD_H * scale);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Card — clean area for OBS to capture */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%",
      }}>
        <div style={{ width: dispW, height: dispH, position: "relative", flexShrink: 0 }}>
          <iframe
            key={src}
            src={src}
            ref={iframeRef}
            allow="microphone"
            style={{
              width: CARD_W, height: CARD_H, border: "none",
              transform: `scale(${scale})`, transformOrigin: "top left", display: "block",
            }}
          />
        </div>
      </div>

      {/* Right sidebar — controls outside the card, OBS ignores this column */}
      <div style={{
        width: SIDEBAR_W, height: "100%", flexShrink: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 28,
        padding: "24px 12px",
        borderLeft: "1px solid rgba(255,150,180,0.07)",
      }}>
        {/* Mic status indicator */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 9, height: 9, borderRadius: "50%", margin: "0 auto 8px",
            background: micStatus === "active"
              ? (pulse ? "#e8c878" : "rgba(232,200,120,0.45)")
              : micStatus === "denied" ? "#c87878" : "#555",
            boxShadow: micStatus === "active" && pulse ? "0 0 8px #e8c878" : "none",
            transition: "background 0.4s, box-shadow 0.4s",
          }} />
          <div style={{
            fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase",
            fontFamily: SANS, color: micStatus === "active" ? INK_DIM : "#c87878",
          }}>
            {micStatus === "pending" ? "Mic…" : micStatus === "active" ? "Mic Live" : "Mic Denied"}
          </div>
          {micStatus === "denied" && (
            <div style={{
              fontSize: 7, color: "rgba(200,120,120,0.7)", fontFamily: SANS,
              marginTop: 6, letterSpacing: "0.1em", lineHeight: 1.5,
            }}>Allow mic in<br/>browser settings</div>
          )}
        </div>

        {/* Dimensions hint */}
        <div style={{
          fontSize: 8, color: "rgba(255,255,255,0.18)", fontFamily: SANS,
          letterSpacing: "0.12em", textAlign: "center", lineHeight: 1.8,
        }}>
          OBS: capture<br/>left area<br/>{dispW}×{dispH}
        </div>

        {/* Copy OBS URL */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleCopyObsUrl}
            style={{
              padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${copied ? "rgba(140,220,160,0.5)" : LINE_STR}`,
              background: copied ? "rgba(120,200,140,0.12)" : "rgba(255,140,170,0.08)",
              color: copied ? "rgba(160,230,180,0.95)" : ROSE,
              fontSize: 8, letterSpacing: "0.2em",
              textTransform: "uppercase", fontFamily: SANS, cursor: "pointer",
              transition: "all 0.25s", width: "100%",
            }}
          >{copied ? "✓ Copied" : "⧉ OBS URL"}</button>
          <div style={{
            fontSize: 7, color: "rgba(255,255,255,0.2)", fontFamily: SANS,
            marginTop: 5, letterSpacing: "0.1em", lineHeight: 1.6,
          }}>Add as Browser<br/>Source · 390×488</div>
        </div>

        {/* Exit */}
        <button
          onClick={onClose}
          style={{
            padding: "8px 16px", borderRadius: 8,
            border: `1px solid ${LINE_STR}`,
            background: "rgba(0,0,0,0.5)",
            color: INK_DIM, fontSize: 9, letterSpacing: "0.22em",
            textTransform: "uppercase", fontFamily: SANS, cursor: "pointer",
          }}
        >✕  Exit</button>
      </div>
    </div>
  );
}

// ── CSS keyframes for spinner ─────────────────────────────────────────────
const spinStyle = `@keyframes spin { to { transform: rotate(360deg); } }`;

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

  const [broadcast, setBroadcast] = useState<{ src: string; style: TeaserStyle; cfg: AudioTeaserConfig } | null>(null);

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
            onBroadcast={(src, style, cfg) => setBroadcast({ src, style, cfg })}
            audioFile={audioFile}
            audioDuration={engine.duration}
          />
        ))}
      </div>

      {broadcast && (
        <BroadcastOverlay
          src={broadcast.src}
          style={broadcast.style}
          cfg={broadcast.cfg}
          onClose={() => setBroadcast(null)}
        />
      )}
    </div>
  );
}
