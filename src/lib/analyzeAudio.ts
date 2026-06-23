/**
 * Deterministic, frame-by-frame audio analysis for video export.
 *
 * The live preview (useAudioEngine) drives the visualizers from a real-time
 * Web Audio AnalyserNode. For export we need the SAME numbers, but computed
 * deterministically for every output frame so the rendered video matches the
 * preview exactly and is reproducible.
 *
 * This mirrors the live engine's settings:
 *   fftSize 256, 32 bands, smoothingTimeConstant ~0.82,
 *   amp = clamp(mean(bands) * 1.7, 0..1)
 * and replicates AnalyserNode's byte-frequency scaling (dB range -100..-30).
 */

const FFT_SIZE = 256;          // matches analyser.fftSize
const BINS = FFT_SIZE / 2;     // 128 magnitude bins
const BANDS = 32;              // matches the live broadcast payload
const SMOOTH = 0.82;           // matches analyser.smoothingTimeConstant
const MIN_DB = -100;
const MAX_DB = -30;

export type AudioAnalysis = {
  fps: number;
  frameCount: number;
  duration: number;
  /** frameCount × BANDS, values 0..1 (row-major: frame f at [f*BANDS .. f*BANDS+BANDS]) */
  bands: Float32Array;
  /** frameCount, overall amplitude 0..1 */
  amp: Float32Array;
  bandsPerFrame: number;
};

// ── Mix all channels to mono ────────────────────────────────────────────────
function mixToMono(buffer: AudioBuffer): Float32Array {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const out = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += data[i];
  }
  if (ch > 1) for (let i = 0; i < len; i++) out[i] /= ch;
  return out;
}

// ── In-place iterative radix-2 FFT (real input via re/im arrays) ────────────
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wpr = Math.cos(ang);
    const wpi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1, wi = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tr = wr * re[b] - wi * im[b];
        const ti = wr * im[b] + wi * re[b];
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr;        im[a] += ti;
        const nwr = wr * wpr - wi * wpi;
        wi = wr * wpi + wi * wpr;
        wr = nwr;
      }
    }
  }
}

// Precomputed Hann window
const HANN = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) {
  HANN[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
}

/**
 * Analyze an entire decoded AudioBuffer into per-frame band + amplitude data.
 * Synchronous; fine for the clip lengths involved (runs in a few seconds).
 */
export function analyzeAudioBuffer(buffer: AudioBuffer, fps: number): AudioAnalysis {
  const mono = mixToMono(buffer);
  const sampleRate = buffer.sampleRate;
  const duration = buffer.duration;
  const frameCount = Math.max(1, Math.ceil(duration * fps));

  const bands = new Float32Array(frameCount * BANDS);
  const amp = new Float32Array(frameCount);

  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  // Smoothed linear magnitudes carried across frames (mimics analyser smoothing).
  const smoothed = new Float32Array(BINS);
  const binsPerBand = BINS / BANDS; // 4

  for (let f = 0; f < frameCount; f++) {
    const center = Math.round((f / fps) * sampleRate);
    const start = center - FFT_SIZE / 2;

    // Window the samples into the FFT buffers.
    for (let i = 0; i < FFT_SIZE; i++) {
      const idx = start + i;
      const s = idx >= 0 && idx < mono.length ? mono[idx] : 0;
      re[i] = s * HANN[i];
      im[i] = 0;
    }

    fft(re, im);

    // Per-bin magnitude (normalized by FFT size, like AnalyserNode), smoothed,
    // then dB-scaled to 0..1 over [MIN_DB, MAX_DB].
    let bandAcc = 0;
    for (let b = 0; b < BANDS; b++) {
      let acc = 0;
      for (let k = 0; k < binsPerBand; k++) {
        const bin = b * binsPerBand + k;
        const mag = Math.hypot(re[bin], im[bin]) / FFT_SIZE;
        smoothed[bin] = SMOOTH * smoothed[bin] + (1 - SMOOTH) * mag;
        const db = 20 * Math.log10(smoothed[bin] + 1e-12);
        let v = (db - MIN_DB) / (MAX_DB - MIN_DB);
        if (v < 0) v = 0; else if (v > 1) v = 1;
        acc += v;
      }
      const val = acc / binsPerBand;
      bands[f * BANDS + b] = val;
      bandAcc += val;
    }
    let a = (bandAcc / BANDS) * 1.7;
    if (a > 1) a = 1;
    amp[f] = a;
  }

  return { fps, frameCount, duration, bands, amp, bandsPerFrame: BANDS };
}
