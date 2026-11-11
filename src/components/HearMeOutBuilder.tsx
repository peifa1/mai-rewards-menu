import { useEffect, useRef, useState } from "react";
import { htmlToBlobUrl } from "@/lib/buildOverlay";
import {
  buildHearMeOutDownloadHtml,
  buildHearMeOutPreviewHtml,
  HMO_DEFAULT_CAKE,
  HMO_DEFAULT_CONFIG,
  HMO_TUTORIAL_VIDEO,
  loadHearMeOutTemplate,
  newHmoPicId,
  normalizeHearMeOutConfig,
  shrinkImageFile,
  type HearMeOutConfig,
} from "@/lib/buildHearMeOut";

// Palette — shared with the rest of the site.
const INK = "#fbe0e7";
const INK_SOFT = "#f0a8b8";
const KANJI = "#ffb8c8";
const BRIGHT = "#fff0f4";
const LINE = "rgba(255,180,200,0.16)";
const LINE_STRONG = "rgba(255,180,200,0.30)";
const PANEL = "rgba(20,5,12,0.5)";
const CARD = "rgba(255,240,244,0.035)";
const SEAL = "linear-gradient(135deg,#c8132a,#8a0a1c)";

const STORAGE_KEY = "hear-me-out-cfg";

export function HearMeOutBuilder() {
  const [template, setTemplate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<HearMeOutConfig>(() => {
    if (typeof window === "undefined") return HMO_DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeHearMeOutConfig(JSON.parse(raw));
    } catch { /* storage unavailable: keep defaults */ }
    return HMO_DEFAULT_CONFIG;
  });
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const blobUrlRef = useRef<string | null>(null);
  const picInput = useRef<HTMLInputElement | null>(null);
  const cakeInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadHearMeOutTemplate().then(setTemplate).catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      setSaveError(false);
    } catch {
      setSaveError(true); // too many uploaded pictures for the browser's storage
    }
  }, [cfg]);

  useEffect(() => {
    if (!template) return;
    const handle = window.setTimeout(() => {
      const url = htmlToBlobUrl(buildHearMeOutPreviewHtml(template, cfg, window.location.origin));
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [template, cfg]);

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const move = (i: number, d: number) =>
    setCfg((c) => {
      const pics = [...c.pics];
      const j = i + d;
      if (j < 0 || j >= pics.length) return c;
      [pics[i], pics[j]] = [pics[j], pics[i]];
      return { ...c, pics };
    });
  const removePic = (id: string) => setCfg((c) => ({ ...c, pics: c.pics.filter((p) => p.id !== id) }));

  const addPics = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const added = await Promise.all([...files].filter((f) => f.type.startsWith("image/")).map(async (f) => ({ id: newHmoPicId(), src: await shrinkImageFile(f) })));
      setCfg((c) => ({ ...c, pics: [...c.pics, ...added] }));
    } finally {
      setBusy(false);
    }
  };
  const replaceCake = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const src = await shrinkImageFile(f, 900);
    setCfg((c) => ({ ...c, cake: src }));
  };

  const handleDownload = async () => {
    if (!template) return;
    setBusy(true);
    try {
      const html = await buildHearMeOutDownloadHtml(template, cfg);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "hear_me_out_cake.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      alert(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-6">
      {/* PREVIEW */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className="font-hakkou text-xl leading-none" style={{ color: KANJI }}>実演</span>
            <h2 className="font-menu italic text-xl tracking-wide" style={{ color: BRIGHT }}>Live Preview</h2>
            <span className="text-[11px] opacity-60" style={{ color: INK_SOFT }}>press the pink + to try it</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={!template || busy || !cfg.pics.length}
            className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-[0.2em] uppercase transition hover:scale-105 disabled:opacity-50"
            style={{ background: SEAL, color: BRIGHT, border: "1px solid rgba(255,200,215,0.4)", boxShadow: "0 6px 24px rgba(200,19,42,0.4)" }}
          >
            {busy ? "Working…" : "Download HTML"}
          </button>
        </div>
        <div
          className="relative w-full rounded-2xl overflow-hidden border"
          style={{ aspectRatio: "16 / 9", background: "repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 28px 28px", borderColor: LINE }}
        >
          {loadError && <div className="absolute inset-0 flex items-center justify-center text-sm text-red-200 p-4 text-center">{loadError}</div>}
          {!template && !loadError && <div className="absolute inset-0 flex items-center justify-center text-sm opacity-70" style={{ color: "#ffd0dc" }}>Loading…</div>}
          {previewUrl && (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Hear-me-out cake preview"
              className="absolute top-0 left-0"
              style={{ width: 1920, height: 1080, transform: "scale(var(--scale))", transformOrigin: "top left", border: 0, background: "transparent" }}
              ref={(el) => {
                if (!el) return;
                const update = () => el.style.setProperty("--scale", String((el.parentElement?.clientWidth ?? 1280) / 1920));
                update();
                const ro = new ResizeObserver(update);
                if (el.parentElement) ro.observe(el.parentElement);
              }}
            />
          )}
        </div>
        <p className="text-[11px] opacity-60 px-1" style={{ color: INK_SOFT }}>
          Click a picture to select it: drag to move · pink knob = rotate · blue dot = stick length · × = take it off. Everything is remembered.
        </p>

        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: LINE_STRONG, background: PANEL, color: INK }}>
          <div className="flex items-baseline gap-3">
            <span className="font-hakkou text-xl leading-none" style={{ color: KANJI }}>案内</span>
            <h2 className="font-menu italic text-xl tracking-wide" style={{ color: BRIGHT }}>Tutorial</h2>
            <span className="text-[11px] opacity-60" style={{ color: INK_SOFT }}>setting it up in OBS</span>
          </div>
          <video src={HMO_TUTORIAL_VIDEO} controls preload="metadata" className="w-full rounded-xl" style={{ background: "#000" }} />
          <ol className="text-xs leading-relaxed list-decimal pl-5 opacity-80" style={{ color: INK }}>
            <li>Press “Download HTML” and keep the file somewhere permanent.</li>
            <li>OBS: Sources → + → Browser. Tick “Local file”, pick the file. Width 1920 · Height 1080.</li>
            <li>Right-click the source → Interact, then press the pink + next to the cake.</li>
          </ol>
        </div>
      </div>

      {/* EDITOR */}
      <div className="rounded-2xl p-5 flex flex-col gap-6 border" style={{ background: PANEL, borderColor: LINE, color: INK }}>
        <div>
          <SectionTitle kanji="菓">Cake</SectionTitle>
          <div className="flex items-center gap-3">
            <img src={cfg.cake} alt="" className="w-24 h-20 object-contain rounded-lg border" style={{ borderColor: LINE, background: CARD }} />
            <div className="flex flex-col gap-2 text-[11px]">
              <SmallBtn onClick={() => cakeInput.current?.click()}>Replace cake</SmallBtn>
              {cfg.cake !== HMO_DEFAULT_CAKE && <SmallBtn onClick={() => setCfg((c) => ({ ...c, cake: HMO_DEFAULT_CAKE }))}>Use default cake</SmallBtn>}
            </div>
            <input ref={cakeInput} type="file" accept="image/*" hidden onChange={(e) => { replaceCake(e.target.files); e.target.value = ""; }} />
          </div>
        </div>

        <div>
          <SectionTitle kanji="顔">Pictures</SectionTitle>
          <p className="text-[11px] mb-3" style={{ color: INK_SOFT }}>
            {cfg.pics.length} pictures · the + adds them in this order
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {cfg.pics.map((p, i) => (
              <div key={p.id} className="relative rounded-lg border overflow-hidden group" style={{ borderColor: LINE, background: CARD }}>
                <img src={p.src} alt="" className="w-full aspect-square object-cover" />
                <span className="absolute left-1 top-1 text-[10px] font-bold px-1.5 rounded" style={{ background: "rgba(20,5,12,0.75)", color: BRIGHT }}>{i + 1}</span>
                <button
                  onClick={() => removePic(p.id)}
                  title="Remove"
                  className="absolute right-1 top-1 w-6 h-6 rounded-full text-xs"
                  style={{ background: "rgba(20,5,12,0.8)", color: "#ff9fb0" }}
                >
                  ✕
                </button>
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => move(i, -1)} title="Earlier" className="w-6 h-6 rounded-full text-xs" style={{ background: "rgba(20,5,12,0.8)", color: INK }}>←</button>
                  <button onClick={() => move(i, 1)} title="Later" className="w-6 h-6 rounded-full text-xs" style={{ background: "rgba(20,5,12,0.8)", color: INK }}>→</button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => picInput.current?.click()}
            disabled={busy}
            className="mt-3 w-full rounded-xl py-2.5 text-[11px] uppercase tracking-[0.25em] border border-dashed transition hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: LINE_STRONG, color: INK }}
          >
            + Add pictures
          </button>
          <input ref={picInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addPics(e.target.files); e.target.value = ""; }} />
          {saveError && (
            <p className="text-[11px] mt-2 text-red-200">Too many uploaded pictures to remember in this browser. They still work for this download.</p>
          )}
        </div>

        <button
          onClick={() => setCfg(HMO_DEFAULT_CONFIG)}
          className="text-[11px] uppercase tracking-[0.25em] opacity-60 hover:opacity-100 self-start transition"
          style={{ color: INK_SOFT }}
        >
          Reset to default pictures
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ kanji, children }: { kanji: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="font-hakkou text-base leading-none" style={{ color: KANJI }}>{kanji}</span>
      <span className="text-xs uppercase tracking-[0.25em] whitespace-nowrap" style={{ color: INK_SOFT }}>{children}</span>
      <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,180,200,0.22), transparent)" }} />
    </div>
  );
}

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg border transition hover:bg-white/5 text-left" style={{ borderColor: LINE_STRONG, color: INK }}>
      {children}
    </button>
  );
}
