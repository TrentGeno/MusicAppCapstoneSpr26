import React, { useEffect, useRef, useState } from "react";

// ─── Icons ───────────────────────────────────────────────────────────────────
const WaveformIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h2M6 6v12M10 3v18M14 7v10M18 5v14M22 12h-2" />
  </svg>
);

// ─── Visualizer types ─────────────────────────────────────────────────────────
const TYPES = [
  { id: "psp-eq",    label: "PSP EQ" },
  { id: "waveform",  label: "Waveform" },
  { id: "circle-eq", label: "Circle EQ" },
  { id: "spectrum-tunnel", label: "Spectrum Tunnel" },
  { id: "starfield-pulse", label: "Starfield Pulse" },
  { id: "ribbon-trails", label: "Ribbon Trails" },
  { id: "album-orbit", label: "Album Orbit" },
  { id: "matrix-columns", label: "Matrix Columns" },
  { id: "kaleidoscope", label: "Kaleidoscope" },
  { id: "retro-dot", label: "Retro Dot Scope" },
  { id: "fluid-blob", label: "Fluid Blob" },
];

// ─── Web Audio singletons ─────────────────────────────────────────────────────
let _audioCtx = null;
const _sourceMap = new WeakMap(); // audio element → MediaElementSource

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function getOrCreateSource(audio, ctx) {
  if (_sourceMap.has(audio)) return _sourceMap.get(audio);
  const src = ctx.createMediaElementSource(audio);
  src.connect(ctx.destination);
  _sourceMap.set(audio, src);
  return src;
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function getCSSVar(name, el) {
  return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();
}

function parseColor(str) {
  if (!str) return null;
  str = str.trim();
  if (str.startsWith("#")) {
    const h = str.replace("#", "");
    if (h.length === 3)
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    if (h.length === 6)
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

function lerpColor(a, b, t) {
  const ra = parseColor(a), rb = parseColor(b);
  if (!ra || !rb) return a;
  return `rgb(${Math.round(ra[0] + (rb[0] - ra[0]) * t)},${Math.round(ra[1] + (rb[1] - ra[1]) * t)},${Math.round(ra[2] + (rb[2] - ra[2]) * t)})`;
}

function withAlpha(color, alpha) {
  const p = parseColor(color);
  if (!p) return color;
  return `rgba(${p[0]},${p[1]},${p[2]},${alpha})`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VisualizerPage({ currentSong }) {
  const [activeType, setActiveType] = useState("psp-eq");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeTypeRef = useRef("psp-eq");
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const currentSongRef = useRef(currentSong || null);
  const coverImageRef = useRef(null);

  // Keep ref in sync so the animation loop always reads the current type
  useEffect(() => { activeTypeRef.current = activeType; }, [activeType]);

  useEffect(() => {
    currentSongRef.current = currentSong || null;
  }, [currentSong]);

  useEffect(() => {
    if (!currentSong?.cover) {
      coverImageRef.current = null;
      return;
    }
    const img = new Image();
    img.src = currentSong.cover;
    coverImageRef.current = img;
  }, [currentSong?.cover]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch (_) {
      // Ignore fullscreen request failures (platform/browser restrictions).
    }
  };

  // Set up Web Audio analyser whenever the audio element changes
  useEffect(() => {
    if (!currentSong?.audio) return;
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const src = getOrCreateSource(currentSong.audio, ctx);
    src.connect(analyser);

    return () => {
      try { src.disconnect(analyser); } catch (_) {}
      analyserRef.current = null;
    };
  }, [currentSong?.audio]);

  // Animation loop — runs once on mount, reads everything via refs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    const c2d = canvas.getContext("2d");
    const BAR_COUNT = 80;
    const state = {
      peaks:        new Array(BAR_COUNT).fill(0),
      peakVelocity: new Array(BAR_COUNT).fill(0),
      starfield: null,
      matrixOffsets: null,
      matrixSeed: 0,
      tunnelPhase: 0,
      blobPhase: 0,
    };

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width, H = canvas.height;
      const purple = getCSSVar("--accent-purple", canvas);
      const pink   = getCSSVar("--accent-pink",   canvas);
      const blue   = getCSSVar("--accent-blue",   canvas);
      const time = performance.now() * 0.001;

      c2d.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      switch (activeTypeRef.current) {
        case "psp-eq":    drawPSPEQ(c2d, analyser, W, H, purple, pink, blue, state, BAR_COUNT); break;
        case "waveform":  drawWaveform(c2d, analyser, W, H, purple, pink, blue); break;
        case "circle-eq": drawCircleEQ(c2d, analyser, W, H, purple, pink, blue); break;
        case "spectrum-tunnel": drawSpectrumTunnel(c2d, analyser, W, H, purple, pink, blue, state, time); break;
        case "starfield-pulse": drawStarfieldPulse(c2d, analyser, W, H, purple, pink, blue, state, time); break;
        case "ribbon-trails": drawRibbonTrails(c2d, analyser, W, H, purple, pink, blue, state, time); break;
        case "album-orbit": drawAlbumOrbit(c2d, analyser, W, H, purple, pink, blue, currentSongRef.current, coverImageRef.current, time); break;
        case "matrix-columns": drawMatrixColumns(c2d, analyser, W, H, purple, pink, blue, state, time); break;
        case "kaleidoscope": drawKaleidoscope(c2d, analyser, W, H, purple, pink, blue, time); break;
        case "retro-dot": drawRetroDotScope(c2d, analyser, W, H, purple, pink, blue, time); break;
        case "fluid-blob": drawFluidBlob(c2d, analyser, W, H, purple, pink, blue, state, time); break;
        default: break;
      }
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", color: "var(--text-primary)", flex: 1, minHeight: 0 }}>
      {/* Full-page canvas surface */}
      <div ref={containerRef} style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", background: "rgba(0,0,0,0.35)" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

        {/* Overlay controls */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "1rem 1.25rem",
            background: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.08) 70%, transparent)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <WaveformIcon size={24} color="var(--accent-purple)" />
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, background: "var(--h1-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Visualizer
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, pointerEvents: "auto" }}>
              <button
                onClick={toggleFullscreen}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.35)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(6px)",
                }}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? "🗗" : "⛶"}
              </button>

              {currentSong && (
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.86rem", color: "var(--text-primary)" }}>{currentSong.name}</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-secondary)" }}>{currentSong.artist}</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", pointerEvents: "auto" }}>
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                style={{
                  padding: "0.35rem 1rem",
                  borderRadius: 20,
                  border: "1px solid",
                  borderColor: activeType === t.id ? "var(--accent-purple)" : "var(--border)",
                  background: activeType === t.id ? "var(--accent-purple)" : "rgba(0,0,0,0.28)",
                  color: activeType === t.id ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: activeType === t.id ? 700 : 400,
                  fontSize: "0.82rem",
                  transition: "all 0.2s",
                  backdropFilter: "blur(4px)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {!currentSong && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.4, pointerEvents: "none" }}>
            <WaveformIcon size={64} color="var(--accent-purple)" />
            <p style={{ margin: 0, fontSize: "1rem", color: "var(--text-secondary)" }}>Play a song to start the visualizer</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── PSP-style EQ ─────────────────────────────────────────────────────────────
function drawPSPEQ(c2d, analyser, W, H, purple, pink, blue, state, BAR_COUNT) {
  const { peaks, peakVelocity } = state;
  let data = new Uint8Array(BAR_COUNT);

  if (analyser) {
    const full = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(full);
    for (let i = 0; i < BAR_COUNT; i++) {
      // Use first ~75% of spectrum (drop ultra-high freq)
      data[i] = full[Math.floor((i / BAR_COUNT) * full.length * 0.75)];
    }
  }

  const SEG_H = 4, SEG_GAP = 1, UNIT = SEG_H + SEG_GAP;

  for (let i = 0; i < BAR_COUNT; i++) {
    const value = data[i] / 255;
    const bw = (W / BAR_COUNT) * 0.72;
    const x  = (i / BAR_COUNT) * W;
    const totalH = Math.max(UNIT, value * H * 0.88);
    const totalSegs = Math.floor(totalH / UNIT);

    // Draw segmented bar with gradient
    for (let s = 0; s < totalSegs; s++) {
      const sy = H - (s + 1) * UNIT;
      const t  = 1 - sy / H; // 0 = bottom, 1 = top
      const segColor = t < 0.5 ? lerpColor(blue, purple, t * 2) : lerpColor(purple, pink, (t - 0.5) * 2);
      c2d.fillStyle = segColor;
      c2d.fillRect(x, sy, bw, SEG_H);
    }

    // Falling peak dot
    const barH = totalH;
    if (barH > peaks[i]) {
      peaks[i]        = barH;
      peakVelocity[i] = 0;
    } else {
      peakVelocity[i] += 0.35;
      peaks[i] = Math.max(0, peaks[i] - peakVelocity[i]);
    }
    if (peaks[i] > UNIT) {
      c2d.fillStyle   = pink;
      c2d.shadowColor = pink;
      c2d.shadowBlur  = 8;
      c2d.fillRect(x, H - peaks[i] - 2, bw, 3);
      c2d.shadowBlur  = 0;
    }
  }
}

// ─── Waveform / Lightning ─────────────────────────────────────────────────────
function drawWaveform(c2d, analyser, W, H, purple, pink, blue) {
  let data;
  if (analyser) {
    data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
  }

  const grad = c2d.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   blue);
  grad.addColorStop(0.5, purple);
  grad.addColorStop(1,   pink);

  // Multi-pass glow: wide blurry → sharp bright
  const passes = [
    { blur: 24, alpha: 0.12, width: 10 },
    { blur: 12, alpha: 0.25, width:  5 },
    { blur:  5, alpha: 0.5,  width:  3 },
    { blur:  0, alpha: 1.0,  width:  1.5 },
  ];

  const horizontalSpread = 1.45;
  const spreadOffset = (W * (horizontalSpread - 1)) / 2;

  for (const pass of passes) {
    c2d.save();
    c2d.globalAlpha = pass.alpha;
    c2d.lineWidth   = pass.width;
    c2d.strokeStyle = grad;
    c2d.shadowColor = purple;
    c2d.shadowBlur  = pass.blur;
    c2d.lineJoin    = "round";
    c2d.lineCap     = "round";
    c2d.beginPath();

    if (data) {
      const maxIdx = data.length - 1;
      for (let i = 0; i < W; i++) {
        const idx = Math.floor((i / Math.max(1, W - 1)) * maxIdx);
        const v = (data[idx] / 128) - 1;
        const x = ((i / Math.max(1, W - 1)) * (W * horizontalSpread)) - spreadOffset;
        const y = H / 2 + v * H * 0.42;
        if (i === 0) c2d.moveTo(x, y); else c2d.lineTo(x, y);
      }
    } else {
      c2d.moveTo(0, H / 2);
      c2d.lineTo(W, H / 2);
    }
    c2d.stroke();
    c2d.restore();
  }

  // Soft mirror reflection below
  if (data) {
    c2d.save();
    c2d.globalAlpha = 0.15;
    c2d.scale(1, -1);
    c2d.translate(0, -H);
    c2d.lineWidth   = 1.5;
    c2d.strokeStyle = grad;
    c2d.beginPath();
    const maxIdx = data.length - 1;
    for (let i = 0; i < W; i++) {
      const idx = Math.floor((i / Math.max(1, W - 1)) * maxIdx);
      const v = (data[idx] / 128) - 1;
      const x = ((i / Math.max(1, W - 1)) * (W * horizontalSpread)) - spreadOffset;
      const y = H - (H / 2 + v * H * 0.42);
      if (i === 0) c2d.moveTo(x, y); else c2d.lineTo(x, y);
    }
    c2d.stroke();
    c2d.restore();
  }
}

// ─── Circle EQ ───────────────────────────────────────────────────────────────
function drawCircleEQ(c2d, analyser, W, H, purple, pink, blue) {
  const cx = W / 2, cy = H / 2;
  const radius = Math.min(W, H) * 0.22;
  const BAR_COUNT = 128;
  const data = new Uint8Array(BAR_COUNT);

  if (analyser) {
    const full = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(full);
    for (let i = 0; i < BAR_COUNT; i++) {
      data[i] = full[Math.floor((i / BAR_COUNT) * full.length * 0.75)];
    }
  }

  const barW = Math.max(1, (Math.PI * 2 * radius / BAR_COUNT) * 0.65);

  for (let i = 0; i < BAR_COUNT; i++) {
    const angle  = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
    const value  = data[i] / 255;
    const barH   = value * Math.min(W, H) * 0.28 + 2;

    const x1 = cx + Math.cos(angle) * radius;
    const y1 = cy + Math.sin(angle) * radius;
    const x2 = cx + Math.cos(angle) * (radius + barH);
    const y2 = cy + Math.sin(angle) * (radius + barH);

    const color = value < 0.5 ? lerpColor(blue, purple, value * 2) : lerpColor(purple, pink, (value - 0.5) * 2);
    c2d.strokeStyle = color;
    c2d.lineWidth   = barW;
    c2d.lineCap     = "round";

    if (value > 0.5) {
      c2d.shadowColor = color;
      c2d.shadowBlur  = 8;
    }
    c2d.beginPath();
    c2d.moveTo(x1, y1);
    c2d.lineTo(x2, y2);
    c2d.stroke();
    c2d.shadowBlur = 0;
  }

  // Filled center gradient
  const radGrad = c2d.createRadialGradient(cx, cy, 0, cx, cy, radius);
  radGrad.addColorStop(0, withAlpha(purple, 0.35));
  radGrad.addColorStop(1, withAlpha(purple, 0.05));
  c2d.beginPath();
  c2d.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  c2d.fillStyle = radGrad;
  c2d.fill();

  // Glowing ring outline
  c2d.beginPath();
  c2d.arc(cx, cy, radius, 0, Math.PI * 2);
  c2d.strokeStyle = withAlpha(purple, 0.6);
  c2d.lineWidth   = 1.5;
  c2d.shadowColor = purple;
  c2d.shadowBlur  = 10;
  c2d.stroke();
  c2d.shadowBlur  = 0;
}

function getFrequencyData(analyser, count, maxSpectrum = 0.75) {
  const data = new Uint8Array(count);
  if (!analyser) return data;
  const full = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(full);
  for (let i = 0; i < count; i++) {
    data[i] = full[Math.floor((i / count) * full.length * maxSpectrum)];
  }
  return data;
}

function getWaveData(analyser, points = 512) {
  const data = new Uint8Array(points);
  if (!analyser) return data;
  const full = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(full);
  const step = Math.max(1, Math.floor(full.length / points));
  for (let i = 0; i < points; i++) data[i] = full[i * step];
  return data;
}

function getBandEnergy(freqData, startPct, endPct) {
  const start = Math.floor(freqData.length * startPct);
  const end = Math.max(start + 1, Math.floor(freqData.length * endPct));
  let sum = 0;
  for (let i = start; i < end; i++) sum += freqData[i];
  return (sum / (end - start)) / 255;
}

function drawSpectrumTunnel(c2d, analyser, W, H, purple, pink, blue, state, time) {
  const freq = getFrequencyData(analyser, 96, 0.8);
  const bass = getBandEnergy(freq, 0, 0.15);
  const cx = W / 2;
  const cy = H / 2;
  const layers = 34;
  state.tunnelPhase += 0.01 + bass * 0.025;

  for (let i = 0; i < layers; i++) {
    const z = ((i / layers) + state.tunnelPhase) % 1;
    const perspective = 0.12 + z * z;
    const ringR = Math.min(W, H) * 0.1 + perspective * Math.min(W, H) * 0.52;
    const alpha = 1 - z;

    const segments = 48;
    const idxScale = Math.floor((i / layers) * (freq.length - 1));
    const energy = freq[idxScale] / 255;
    const color = energy < 0.5 ? lerpColor(blue, purple, energy * 2) : lerpColor(purple, pink, (energy - 0.5) * 2);

    c2d.strokeStyle = withAlpha(color, 0.1 + alpha * 0.35);
    c2d.lineWidth = 1 + alpha * 2.2;
    c2d.beginPath();
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2 + time * 0.18;
      const wobble = 1 + Math.sin(a * 6 + time * 1.5) * 0.04 * energy;
      const x = cx + Math.cos(a) * ringR * wobble;
      const y = cy + Math.sin(a) * ringR * wobble;
      if (s === 0) c2d.moveTo(x, y); else c2d.lineTo(x, y);
    }
    c2d.stroke();
  }

  const rays = 72;
  for (let i = 0; i < rays; i++) {
    const pct = i / rays;
    const angle = pct * Math.PI * 2;
    const bin = Math.floor(pct * (freq.length - 1));
    const e = freq[bin] / 255;
    const len = e * Math.min(W, H) * 0.28;
    const x2 = cx + Math.cos(angle) * (Math.min(W, H) * 0.12 + len);
    const y2 = cy + Math.sin(angle) * (Math.min(W, H) * 0.12 + len);
    c2d.strokeStyle = withAlpha(lerpColor(blue, pink, pct), 0.1 + e * 0.7);
    c2d.lineWidth = 1.2;
    c2d.beginPath();
    c2d.moveTo(cx, cy);
    c2d.lineTo(x2, y2);
    c2d.stroke();
  }
}

function drawStarfieldPulse(c2d, analyser, W, H, purple, pink, blue, state, time) {
  const freq = getFrequencyData(analyser, 96);
  const bass = getBandEnergy(freq, 0, 0.2);

  if (!state.starfield || state.starfield.length !== 260) {
    state.starfield = Array.from({ length: 260 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 0.08,
      speed: 0.001 + Math.random() * 0.005,
      size: 0.6 + Math.random() * 2,
    }));
  }

  const cx = W / 2;
  const cy = H / 2;
  const burst = 0.3 + bass * 2.1;

  for (const star of state.starfield) {
    star.dist += star.speed * burst;
    if (star.dist > 1.35) {
      star.dist = 0.02;
      star.angle = Math.random() * Math.PI * 2;
    }

    const d = star.dist * Math.min(W, H);
    const x = cx + Math.cos(star.angle) * d;
    const y = cy + Math.sin(star.angle) * d;
    const glow = Math.min(1, star.dist);
    c2d.fillStyle = withAlpha(lerpColor(blue, pink, (Math.sin(time + star.angle) + 1) / 2), 0.35 + glow * 0.55);
    c2d.beginPath();
    c2d.arc(x, y, star.size + glow * 2.2, 0, Math.PI * 2);
    c2d.fill();
  }

  const ringR = Math.min(W, H) * (0.07 + bass * 0.08);
  c2d.strokeStyle = withAlpha(purple, 0.35 + bass * 0.4);
  c2d.lineWidth = 2 + bass * 8;
  c2d.shadowColor = purple;
  c2d.shadowBlur = 16;
  c2d.beginPath();
  c2d.arc(cx, cy, ringR, 0, Math.PI * 2);
  c2d.stroke();
  c2d.shadowBlur = 0;
}

function drawRibbonTrails(c2d, analyser, W, H, purple, pink, blue, state, time) {
  const wave = getWaveData(analyser, 420);
  const trails = [
    { offset: -H * 0.18, colorA: blue, colorB: purple, amp: 0.28, width: 2.5, alpha: 0.55 },
    { offset: 0, colorA: purple, colorB: pink, amp: 0.34, width: 3, alpha: 0.75 },
    { offset: H * 0.18, colorA: pink, colorB: blue, amp: 0.25, width: 2.2, alpha: 0.45 },
  ];

  c2d.fillStyle = "rgba(0,0,0,0.08)";
  c2d.fillRect(0, 0, W, H);

  for (const trail of trails) {
    c2d.beginPath();
    for (let i = 0; i < wave.length; i++) {
      const x = (i / (wave.length - 1)) * W;
      const w = (wave[i] / 128) - 1;
      const warp = Math.sin((x / W) * Math.PI * 3 + time * 1.1) * 0.08;
      const y = H / 2 + trail.offset + (w + warp) * H * trail.amp;
      if (i === 0) c2d.moveTo(x, y); else c2d.lineTo(x, y);
    }
    const grad = c2d.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, trail.colorA);
    grad.addColorStop(1, trail.colorB);
    c2d.strokeStyle = grad;
    c2d.globalAlpha = trail.alpha;
    c2d.lineWidth = trail.width;
    c2d.shadowColor = trail.colorB;
    c2d.shadowBlur = 12;
    c2d.stroke();
    c2d.shadowBlur = 0;
    c2d.globalAlpha = 1;
  }
}

function drawAlbumOrbit(c2d, analyser, W, H, purple, pink, blue, currentSong, coverImage, time) {
  const freq = getFrequencyData(analyser, 128);
  const bass = getBandEnergy(freq, 0, 0.18);
  const cx = W / 2;
  const cy = H / 2;
  const baseR = Math.min(W, H) * 0.16;

  const ringCount = 4;
  for (let r = 0; r < ringCount; r++) {
    const pct = r / (ringCount - 1 || 1);
    const radius = baseR + r * (Math.min(W, H) * 0.065) + bass * 18;
    const orbitColor = lerpColor(blue, pink, pct);
    c2d.strokeStyle = withAlpha(orbitColor, 0.2 + (1 - pct) * 0.3);
    c2d.lineWidth = 1.5 + (1 - pct) * 2;
    c2d.beginPath();
    for (let i = 0; i <= 220; i++) {
      const a = (i / 220) * Math.PI * 2;
      const mod = 1 + Math.sin(a * (3 + r) + time * (0.9 + r * 0.2)) * 0.06;
      const x = cx + Math.cos(a) * radius * mod;
      const y = cy + Math.sin(a) * radius * mod;
      if (i === 0) c2d.moveTo(x, y); else c2d.lineTo(x, y);
    }
    c2d.stroke();
  }

  if (coverImage && coverImage.complete) {
    const size = baseR * 1.45;
    c2d.save();
    c2d.beginPath();
    c2d.arc(cx, cy, size / 2, 0, Math.PI * 2);
    c2d.clip();
    c2d.drawImage(coverImage, cx - size / 2, cy - size / 2, size, size);
    c2d.restore();
  } else {
    c2d.fillStyle = withAlpha(purple, 0.35);
    c2d.beginPath();
    c2d.arc(cx, cy, baseR * 0.72, 0, Math.PI * 2);
    c2d.fill();
  }
}

function drawMatrixColumns(c2d, analyser, W, H, purple, pink, blue, state, time) {
  const columns = 74;
  const freq = getFrequencyData(analyser, columns, 0.78);
  if (!state.matrixOffsets || state.matrixOffsets.length !== columns) {
    state.matrixOffsets = Array.from({ length: columns }, () => Math.random() * H);
    state.matrixSeed += 1;
  }

  const cell = Math.max(8, Math.floor(W / columns));
  for (let i = 0; i < columns; i++) {
    const x = i * cell;
    const e = freq[i] / 255;
    const speed = 1.2 + e * 5.8;
    state.matrixOffsets[i] = (state.matrixOffsets[i] + speed) % (H + 28);
    const y = state.matrixOffsets[i] - 28;

    const color = e < 0.5 ? lerpColor(blue, purple, e * 2) : lerpColor(purple, pink, (e - 0.5) * 2);
    c2d.fillStyle = withAlpha(color, 0.8);
    c2d.fillRect(x, y, cell - 2, 24);

    const tail = 5;
    for (let t = 1; t <= tail; t++) {
      c2d.fillStyle = withAlpha(color, 0.35 / t);
      c2d.fillRect(x, y - t * 18, cell - 2, 16);
    }
  }

  c2d.fillStyle = withAlpha(lerpColor(blue, pink, (Math.sin(time) + 1) / 2), 0.08);
  c2d.fillRect(0, 0, W, H);
}

function drawKaleidoscope(c2d, analyser, W, H, purple, pink, blue, time) {
  const wave = getWaveData(analyser, 240);
  const slices = 12;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.44;

  c2d.save();
  c2d.translate(cx, cy);

  for (let s = 0; s < slices; s++) {
    c2d.save();
    const sliceAngle = (Math.PI * 2) / slices;
    c2d.rotate(s * sliceAngle + time * 0.05);
    if (s % 2) c2d.scale(1, -1);
    c2d.beginPath();
    c2d.moveTo(0, 0);
    c2d.arc(0, 0, radius, -sliceAngle / 2, sliceAngle / 2);
    c2d.closePath();
    c2d.clip();

    c2d.beginPath();
    for (let i = 0; i < wave.length; i++) {
      const x = (i / (wave.length - 1)) * radius;
      const n = (wave[i] / 128) - 1;
      const y = n * radius * 0.42 + Math.sin(time * 1.8 + i * 0.08) * 6;
      if (i === 0) c2d.moveTo(x, y); else c2d.lineTo(x, y);
    }
    const grad = c2d.createLinearGradient(0, -radius * 0.5, radius, radius * 0.5);
    grad.addColorStop(0, blue);
    grad.addColorStop(0.5, purple);
    grad.addColorStop(1, pink);
    c2d.strokeStyle = grad;
    c2d.lineWidth = 2;
    c2d.shadowColor = purple;
    c2d.shadowBlur = 8;
    c2d.stroke();
    c2d.restore();
  }

  c2d.restore();
}

function drawRetroDotScope(c2d, analyser, W, H, purple, pink, blue, time) {
  const wave = getWaveData(analyser, 180);
  const freq = getFrequencyData(analyser, 180);
  const useWave = Math.floor(time * 0.5) % 2 === 0;

  c2d.fillStyle = "rgba(7, 16, 10, 0.18)";
  c2d.fillRect(0, 0, W, H);

  const grid = 14;
  c2d.strokeStyle = "rgba(120,255,120,0.06)";
  c2d.lineWidth = 1;
  for (let x = 0; x <= W; x += grid) {
    c2d.beginPath();
    c2d.moveTo(x, 0);
    c2d.lineTo(x, H);
    c2d.stroke();
  }
  for (let y = 0; y <= H; y += grid) {
    c2d.beginPath();
    c2d.moveTo(0, y);
    c2d.lineTo(W, y);
    c2d.stroke();
  }

  const data = useWave ? wave : freq;
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * W;
    const n = useWave ? (data[i] / 128) - 1 : (data[i] / 255) * 2 - 1;
    const y = H / 2 + n * H * 0.34;
    const color = lerpColor(blue, pink, i / (data.length - 1));
    c2d.fillStyle = withAlpha(color, 0.9);
    c2d.beginPath();
    c2d.arc(x, y, 1.8, 0, Math.PI * 2);
    c2d.fill();
  }

  const scanY = (time * 90) % H;
  c2d.fillStyle = "rgba(170,255,170,0.08)";
  c2d.fillRect(0, scanY, W, 3);
}

function drawFluidBlob(c2d, analyser, W, H, purple, pink, blue, state, time) {
  const freq = getFrequencyData(analyser, 128);
  const bass = getBandEnergy(freq, 0, 0.18);
  const mid = getBandEnergy(freq, 0.18, 0.55);
  const high = getBandEnergy(freq, 0.55, 1);
  const cx = W / 2;
  const cy = H / 2;
  const base = Math.min(W, H) * 0.2;

  state.blobPhase += 0.02 + high * 0.06;

  const points = 120;
  c2d.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const ripple = Math.sin(a * 3 + state.blobPhase) * (bass * 30 + 10)
      + Math.cos(a * 5 - state.blobPhase * 0.7) * (mid * 18 + 5);
    const r = base + ripple;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) c2d.moveTo(x, y); else c2d.lineTo(x, y);
  }
  c2d.closePath();

  const grad = c2d.createRadialGradient(cx, cy, base * 0.2, cx, cy, base * 1.35);
  grad.addColorStop(0, withAlpha(pink, 0.55));
  grad.addColorStop(0.5, withAlpha(purple, 0.4));
  grad.addColorStop(1, withAlpha(blue, 0.2));
  c2d.fillStyle = grad;
  c2d.shadowColor = purple;
  c2d.shadowBlur = 24;
  c2d.fill();
  c2d.shadowBlur = 0;

  c2d.strokeStyle = withAlpha(lerpColor(blue, pink, (Math.sin(time) + 1) / 2), 0.8);
  c2d.lineWidth = 2;
  c2d.stroke();
}
