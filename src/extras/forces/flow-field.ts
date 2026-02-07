import type { Force } from "../../core";

export function flowField(opts: {
  cellSize: number;
  strength?: number;
  timeScale?: number;
  updateEvery?: number;
}): Force {
  const { cellSize, strength = 1, timeScale = 0.0005, updateEvery = 1 } = opts;

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

        const f = flowFunction(wx, wy, time, noise);

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
        // TODO: use noise
        // updateField(ctx.rng.noise);
        updateField(ctx.rng.random);
      }
    },
    apply(ctx) {
      if (!field) return;
      const { count, px, py, vx, vy, dt } = ctx;
      const k = strength * dt;

      for (let i = 0; i < count; i++) {
        const f = sampleField(px[i], py[i]);
        vx[i] += f.x * k;
        vy[i] += f.y * k;
      }
    },
  };
}

//

function flowFunction(x: number, y: number, t: number, noise: Noise) {
  const s = 0.002;

  let px = x * s;
  let py = y * s;

  // domain warp
  px += noise(px + 10, py + t * 0.1) * 0.6;
  py += noise(px, py + 20 + t * 0.1) * 0.6;

  // curl
  const eps = 0.01;
  const n1 = noise(px, py + eps);
  const n2 = noise(px, py - eps);
  const n3 = noise(px + eps, py);
  const n4 = noise(px - eps, py);

  const curlX = (n1 - n2) / (2 * eps);
  const curlY = -(n3 - n4) / (2 * eps);

  // waves
  const waveX = Math.sin(py * 3);
  const waveY = Math.cos(px * 3);

  // blend
  const m = noise(px * 0.5, py * 0.5);

  return {
    x: curlX * m + waveX * (1 - m),
    y: curlY * m + waveY * (1 - m),
  };
}

type Noise = (x: number, y?: number, z?: number) => number;
