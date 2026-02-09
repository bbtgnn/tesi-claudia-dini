import type { Force } from "../../core";

/**
 * User-facing options for how the flow pattern looks and moves.
 * All properties are optional; defaults give a balanced, smooth flow.
 */
export interface FlowStyle {
  /** How zoomed the pattern is. Small = big smooth swirls, big = busy detail. */
  patternZoom?: number;
  /** Shift in X so the bend doesn’t look like a regular grid. */
  bendShiftX?: number;
  /** Shift in Y so the bend doesn’t look like a regular grid. */
  bendShiftY?: number;
  /** How fast the bending moves over time. */
  bendSpeed?: number;
  /** How much we twist the pattern. 0 = straight, 1 = very twisted. */
  bendAmount?: number;
  /** Tiny step used to measure spin. Smaller = more precise. */
  spinStep?: number;
  /** How many waves fit in the same space. Higher = more stripes. */
  waveDensity?: number;
  /** Size of patches where we mix swirl vs waves. Smaller = finer mix. */
  mixPatchSize?: number;
}

const DEFAULT_FLOW_STYLE: Required<FlowStyle> = {
  patternZoom: 0.002,
  bendShiftX: 10,
  bendShiftY: 20,
  bendSpeed: 0.1,
  bendAmount: 0.6,
  spinStep: 0.01,
  waveDensity: 3,
  mixPatchSize: 0.5,
};

function flowStyleFromConfig(style?: FlowStyle): Required<FlowStyle> {
  return { ...DEFAULT_FLOW_STYLE, ...style };
}

export function flowField(opts: {
  cellSize: number;
  type: "calm" | "chaotic";
  strength?: number;
  timeScale?: number;
  updateEvery?: number;
  /** When true, flow magnitude oscillates (e.g. sin(time)) so particles stay near their position — ripple effect. */
  oscillate?: boolean;
  /** Radians per time unit when oscillate is true. Higher = faster ripples. */
  oscillateSpeed?: number;
  style?: FlowStyle;
}): Force {
  const {
    cellSize,
    type,
    strength = 1,
    timeScale = 0.0005,
    updateEvery = 1,
    oscillate = false,
    oscillateSpeed = 1,
    style: styleOpts,
  } = opts;

  const flowStyle = flowStyleFromConfig(styleOpts);

  let cols = 0;
  let rows = 0;
  let field: Float32Array | null = null;
  let frame = 0;
  let time = 0;

  // -----------------------------
  // field generation
  // -----------------------------

  function updateField(noise: Noise) {
    if (!field || cols === 0 || rows === 0) return;
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const wx = x * cellSize;
        const wy = y * cellSize;

        const f = flowFunction(wx, wy, time, noise, flowStyle);

        field[i++] = f.x;
        field[i++] = f.y;
      }
    }
  }

  // -----------------------------
  // bilinear sampler
  // -----------------------------

  function sampleField(x: number, y: number): { x: number; y: number } {
    if (!field || cols <= 1 || rows <= 1) return { x: 0, y: 0 };

    const gx = x / cellSize;
    const gy = y / cellSize;

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);

    if (x0 < 0 || y0 < 0 || x0 >= cols - 1 || y0 >= rows - 1) {
      return { x: 0, y: 0 };
    }

    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const sx = gx - x0;
    const sy = gy - y0;

    const i00 = (y0 * cols + x0) * 2;
    const i10 = (y0 * cols + x1) * 2;
    const i01 = (y1 * cols + x0) * 2;
    const i11 = (y1 * cols + x1) * 2;

    const fx =
      field[i00] * (1 - sx) * (1 - sy) +
      field[i10] * sx * (1 - sy) +
      field[i01] * (1 - sx) * sy +
      field[i11] * sx * sy;

    const fy =
      field[i00 + 1] * (1 - sx) * (1 - sy) +
      field[i10 + 1] * sx * (1 - sy) +
      field[i01 + 1] * (1 - sx) * sy +
      field[i11 + 1] * sx * sy;

    return { x: fx, y: fy };
  }

  // -----------------------------
  // the actual Force
  // -----------------------------

  return {
    update(ctx) {
      frame++;
      time += timeScale * ctx.time.delta;

      const w = ctx.bounds.width;
      const h = ctx.bounds.height;
      const newCols = w > 0 ? Math.ceil(w / cellSize) : 0;
      const newRows = h > 0 ? Math.ceil(h / cellSize) : 0;

      if (newCols !== cols || newRows !== rows) {
        cols = newCols;
        rows = newRows;
        field = cols > 0 && rows > 0 ? new Float32Array(cols * rows * 2) : null;
      }

      if (frame % updateEvery === 0) {
        const noiseFn =
          type === "calm" ? ctx.rng.noise : () => ctx.rng.random();
        updateField(noiseFn);
      }
    },
    apply(ctx) {
      if (!field) return;
      const { count, px, py, vx, vy, dt } = ctx;
      const oscillation = oscillate ? Math.sin(time * oscillateSpeed) : 1;
      const k = strength * dt * oscillation;

      for (let i = 0; i < count; i++) {
        const f = sampleField(px[i], py[i]);
        vx[i] += f.x * k;
        vy[i] += f.y * k;
      }
    },
  };
}

//

/**
 * Computes the flow direction at a point (x, y) at time t.
 * Uses named constants so we can expose them in config later.
 *
 * Simple explanations (think of the flow like wind or water currents):
 *
 * - spatialScale: How "zoomed in" the pattern is. Small = big, smooth swirls;
 *   big = tiny, busy detail (like looking at a map from far away vs up close).
 *
 * - warpOffsetX, warpOffsetY: We shift where we read the noise by these amounts
 *   so the bending doesn’t look like a boring grid—like stirring the soup in
 *   a slightly different place each time.
 *
 * - warpTimeScale: How fast the bending moves over time. Higher = flow changes
 *   shape quicker (like faster wind).
 *
 * - warpStrength: How much we bend the pattern. 0 = no bend, 1 = lots of
 *   twist and swirl.
 *
 * - curlEpsilon: A tiny step we use to measure "how much the flow is spinning"
 *   at a point (like checking how fast a leaf spins in a eddy). Smaller = more
 *   precise but we need to be careful with the math.
 *
 * - waveFrequency: How many waves fit in the same space. Higher = more
 *   wavy stripes, lower = gentler, longer waves.
 *
 * - blendNoiseScale: How big the blobs are where we mix "swirl" vs "waves".
 *   Smaller = finer mix, bigger = large patches of swirl and large patches
 *   of waves.
 */
function flowFunction(
  x: number,
  y: number,
  t: number,
  noise: Noise,
  style: Required<FlowStyle>
) {
  const spatialScale = style.patternZoom;

  let px = x * spatialScale;
  let py = y * spatialScale;

  // domain warp
  const warpOffsetX = style.bendShiftX;
  const warpOffsetY = style.bendShiftY;
  const warpTimeScale = style.bendSpeed;
  const warpStrength = style.bendAmount;
  px += noise(px + warpOffsetX, py + t * warpTimeScale) * warpStrength;
  py += noise(px, py + warpOffsetY + t * warpTimeScale) * warpStrength;

  // curl (finite-difference step for numerical derivative)
  const curlEpsilon = style.spinStep;
  const n1 = noise(px, py + curlEpsilon);
  const n2 = noise(px, py - curlEpsilon);
  const n3 = noise(px + curlEpsilon, py);
  const n4 = noise(px - curlEpsilon, py);

  const curlX = (n1 - n2) / (2 * curlEpsilon);
  const curlY = -(n3 - n4) / (2 * curlEpsilon);

  // waves
  const waveFrequency = style.waveDensity;
  const waveX = Math.sin(py * waveFrequency);
  const waveY = Math.cos(px * waveFrequency);

  // blend between curl and waves (noise scale controls blend spatial variation)
  const blendNoiseScale = style.mixPatchSize;
  const m = noise(px * blendNoiseScale, py * blendNoiseScale);

  return {
    x: curlX * m + waveX * (1 - m),
    y: curlY * m + waveY * (1 - m),
  };
}

type Noise = (x: number, y?: number, z?: number) => number;
