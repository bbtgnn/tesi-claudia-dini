import type { Force } from "../../core";

/** How the fluid is driven: circle = spinning at centers, chaotic = noise-driven wander, random = random bursts. */
export type SmokeActivation = "circle" | "chaotic" | "random";

/** Options for the smoke/fluid force (Stam-style 2D incompressible fluid). */
export interface SmokeOptions {
  /** Grid resolution (e.g. 64). Higher = finer, heavier. */
  resolution?: number;
  /** Time step for the fluid solver (e.g. 0.1). */
  dt?: number;
  /** Diffusion of velocity (e.g. 0.00001). */
  viscosity?: number;
  /** Diffusion of density (e.g. 0.0000001). Not used for particle force, only internal. */
  diffusion?: number;
  /** Gauss–Seidel iterations per step (e.g. 4). */
  iter?: number;
  /** How strongly the fluid velocity affects particles (e.g. 1). */
  strength?: number;
  /** How the fluid is driven: "circle" (spinning), "chaotic" (noise wander), "random" (random bursts). */
  activation?: SmokeActivation;
  /** Radius of the circular injection path, in [0,1] of half the grid (e.g. 0.4). Used for circle. */
  circleRadius?: number;
  /** Angular speed of the injection point in radians per time unit (e.g. 0.8). Used for circle. */
  circleSpeed?: number;
  /** Velocity injected at the moving point (e.g. 2). */
  injectVelocity?: number;
  /** Center of the injection circle, normalized 0–1 (same as frontiers). Default [0.5, 0.5]. */
  center?: [number, number];
  /** Multiple injection circles. Normalized 0–1. If set, overrides `center`. */
  centers?: [number, number][];
  /** Chaos: how far injection wanders from center (0–1). Used for chaotic. Default 0.35. */
  chaosWander?: number;
  /** Chaos: speed of noise in time. Higher = faster change. Used for chaotic. Default 1.5. */
  chaosSpeed?: number;
  /** Number of random injection points per frame. Used for random. Default 8. */
  randomPoints?: number;
}

const DEFAULTS: Required<Omit<SmokeOptions, "center" | "centers">> = {
  resolution: 64,
  dt: 0.1,
  viscosity: 0.00001,
  diffusion: 0.0000001,
  iter: 4,
  strength: 1,
  activation: "circle",
  circleRadius: 0.4,
  circleSpeed: 0.8,
  injectVelocity: 2,
  chaosWander: 0.35,
  chaosSpeed: 1.5,
  randomPoints: 8,
};

/**
 * 2D incompressible fluid force (Stam-style solver). The fluid is driven by an
 * automatic circular "mouse" that injects velocity, so smoke swirls without user input.
 */
export function smoke(opts: SmokeOptions = {}): Force {
  const o = { ...DEFAULTS, ...opts };
  const centers: [number, number][] =
    o.centers ?? (o.center !== undefined ? [o.center] : [[0.5, 0.5]]);
  const N = o.resolution;
  const total = (N + 2) * (N + 2);

  let Vx = new Float64Array(total);
  let Vy = new Float64Array(total);
  let Vx0 = new Float64Array(total);
  let Vy0 = new Float64Array(total);
  let s = new Float64Array(total);
  let density = new Float64Array(total);

  let lastBounds = { width: 0, height: 0 };
  let time = 0;

  function IX(x: number, y: number): number {
    return x + (N + 2) * y;
  }

  function setBnd(b: number, x: Float64Array) {
    for (let i = 1; i <= N; i++) {
      x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
      x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
    }
    for (let j = 1; j <= N; j++) {
      x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)];
      x[IX(N + 1, j)] = b === 1 ? -x[IX(N, j)] : x[IX(N, j)];
    }
    x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
    x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
    x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
  }

  function linSolve(
    b: number,
    x: Float64Array,
    x0: Float64Array,
    a: number,
    c: number
  ) {
    const cRecip = 1 / c;
    for (let k = 0; k < o.iter; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] =
            (x0[IX(i, j)] +
              a *
                (x[IX(i - 1, j)] +
                  x[IX(i + 1, j)] +
                  x[IX(i, j - 1)] +
                  x[IX(i, j + 1)])) *
            cRecip;
        }
      }
      setBnd(b, x);
    }
  }

  function diffuse(
    b: number,
    x: Float64Array,
    x0: Float64Array,
    diff: number,
    dt: number
  ) {
    const a = dt * diff * N * N;
    linSolve(b, x, x0, a, 1 + 6 * a);
  }

  function project(
    velocX: Float64Array,
    velocY: Float64Array,
    p: Float64Array,
    div: Float64Array
  ) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] =
          (-0.5 *
            (velocX[IX(i + 1, j)] -
              velocX[IX(i - 1, j)] +
              velocY[IX(i, j + 1)] -
              velocY[IX(i, j - 1)])) /
          N;
        p[IX(i, j)] = 0;
      }
    }
    setBnd(0, div);
    setBnd(0, p);
    linSolve(0, p, div, 1, 6);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        velocX[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
        velocY[IX(i, j)] -= 0.5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
      }
    }
    setBnd(1, velocX);
    setBnd(2, velocY);
  }

  function advect(
    b: number,
    d: Float64Array,
    d0: Float64Array,
    velocX: Float64Array,
    velocY: Float64Array,
    dt: number
  ) {
    const dtx = dt * N;
    const dty = dt * N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        let x = i - dtx * velocX[IX(i, j)];
        let y = j - dty * velocY[IX(i, j)];

        x = Math.max(0.5, Math.min(N + 0.5, x));
        y = Math.max(0.5, Math.min(N + 0.5, y));

        const i0 = Math.floor(x);
        const i1 = i0 + 1;
        const j0 = Math.floor(y);
        const j1 = j0 + 1;

        const s1 = x - i0;
        const s0 = 1 - s1;
        const t1 = y - j0;
        const t0 = 1 - t1;

        d[IX(i, j)] =
          s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
          s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
      }
    }
    setBnd(b, d);
  }

  function step() {
    const { dt, viscosity, diffusion } = o;

    diffuse(1, Vx0, Vx, viscosity, dt);
    diffuse(2, Vy0, Vy, viscosity, dt);
    project(Vx0, Vy0, Vx, Vy);

    advect(1, Vx, Vx0, Vx0, Vy0, dt);
    advect(2, Vy, Vy0, Vx0, Vy0, dt);
    project(Vx, Vy, Vx0, Vy0);

    diffuse(0, s, density, diffusion, dt);
    advect(0, density, s, Vx, Vy, dt);
  }

  /** Inject velocity at grid cell (gx, gy) with optional density. */
  function addVelocity(
    gx: number,
    gy: number,
    amountX: number,
    amountY: number
  ) {
    const i = Math.max(1, Math.min(N, Math.floor(gx)));
    const j = Math.max(1, Math.min(N, Math.floor(gy)));
    const idx = IX(i, j);
    Vx[idx] += amountX;
    Vy[idx] += amountY;
  }

  function addDensity(gx: number, gy: number, amount: number) {
    const i = Math.max(1, Math.min(N, Math.floor(gx)));
    const j = Math.max(1, Math.min(N, Math.floor(gy)));
    density[IX(i, j)] += amount;
  }

  /** Sample velocity at normalized grid coords (0..N, 0..N) with bilinear interpolation. */
  function sampleVelocity(gx: number, gy: number): { vx: number; vy: number } {
    if (gx < 0 || gx > N || gy < 0 || gy > N) return { vx: 0, vy: 0 };

    const i0 = Math.max(1, Math.min(N - 1, Math.floor(gx)));
    const i1 = i0 + 1;
    const j0 = Math.max(1, Math.min(N - 1, Math.floor(gy)));
    const j1 = j0 + 1;

    const sx = gx - i0;
    const sy = gy - j0;

    const vx =
      (1 - sx) * (1 - sy) * Vx[IX(i0, j0)] +
      sx * (1 - sy) * Vx[IX(i1, j0)] +
      (1 - sx) * sy * Vx[IX(i0, j1)] +
      sx * sy * Vx[IX(i1, j1)];

    const vy =
      (1 - sx) * (1 - sy) * Vy[IX(i0, j0)] +
      sx * (1 - sy) * Vy[IX(i1, j0)] +
      (1 - sx) * sy * Vy[IX(i0, j1)] +
      sx * sy * Vy[IX(i1, j1)];

    return { vx, vy };
  }

  function injectAt(gx: number, gy: number, vx: number, vy: number) {
    addVelocity(gx, gy, vx, vy);
    addDensity(gx, gy, 50);
  }

  return {
    update(ctx) {
      time += ctx.time.delta;
      lastBounds = { ...ctx.bounds };

      const w = ctx.bounds.width;
      const h = ctx.bounds.height;
      if (w <= 0 || h <= 0) return;

      const inj = o.injectVelocity;
      const noise = ctx.rng.noise;
      const random = ctx.rng.random;

      if (o.activation === "circle") {
        const radius = (N / 2) * o.circleRadius;
        const angle = time * o.circleSpeed;
        const tangX = -Math.sin(angle) * inj;
        const tangY = Math.cos(angle) * inj;
        for (const [cxNorm, cyNorm] of centers) {
          const cx = 1 + cxNorm * (N - 1);
          const cy = 1 + cyNorm * (N - 1);
          const gx = cx + radius * Math.cos(angle);
          const gy = cy + radius * Math.sin(angle);
          injectAt(gx, gy, tangX, tangY);
        }
      } else if (o.activation === "chaotic") {
        const wander = o.chaosWander * N * 0.5;
        const t = time * o.chaosSpeed;
        for (const [cxNorm, cyNorm] of centers) {
          const cx = 1 + cxNorm * (N - 1);
          const cy = 1 + cyNorm * (N - 1);
          const gx =
            cx +
            wander * (noise(t, cxNorm * 10) * 2 - 1) +
            wander * 0.5 * (noise(cxNorm * 5, t * 0.7) * 2 - 1);
          const gy =
            cy +
            wander * (noise(cyNorm * 10, t + 100) * 2 - 1) +
            wander * 0.5 * (noise(t * 0.7 + 50, cyNorm * 5) * 2 - 1);
          const angle = noise(t + 200, cxNorm + cyNorm) * Math.PI * 2;
          const vx = Math.cos(angle) * inj;
          const vy = Math.sin(angle) * inj;
          injectAt(gx, gy, vx, vy);
        }
      } else {
        const n = Math.max(1, o.randomPoints);
        for (let i = 0; i < n; i++) {
          const gx = 1 + random() * (N - 1);
          const gy = 1 + random() * (N - 1);
          const angle = random() * Math.PI * 2;
          const vx = Math.cos(angle) * inj;
          const vy = Math.sin(angle) * inj;
          injectAt(gx, gy, vx, vy);
        }
      }

      step();
    },

    apply(ctx) {
      const { count, px, py, vx, vy, dt } = ctx;
      const w = lastBounds.width;
      const h = lastBounds.height;
      if (w <= 0 || h <= 0) return;

      const k = o.strength * dt;
      const toGridX = N / w;
      const toGridY = N / h;
      const toWorldX = w / N;
      const toWorldY = h / N;

      for (let i = 0; i < count; i++) {
        const gx = px[i] * toGridX;
        const gy = py[i] * toGridY;
        const { vx: fx, vy: fy } = sampleVelocity(gx, gy);
        vx[i] += fx * toWorldX * k;
        vy[i] += fy * toWorldY * k;
      }
    },
  };
}
