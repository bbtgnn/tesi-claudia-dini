import type { OnUpdatePayload } from "../core/simulation";
import type { Vec2 } from "../core/types";

/** Single trail as ring buffer: no per-point allocation, O(1) push instead of shift(). */
interface TrailBuffer {
  x: Float32Array;
  y: Float32Array;
  len: number;
  writeIndex: number;
}

/** Deep copy for snapshot/restore. */
export type TrailsSnapshot = Map<number, TrailBuffer>;

export interface TrailsConfig {
  /** Maximum number of points per trail. */
  maxLength: number;
  /** Store a new point every N frames (default 1 = every frame). */
  storeEveryNFrames?: number;
  /** If false, this extension is excluded from the simulation. */
  active: boolean;
}

function createTrailBuffer(maxLength: number): TrailBuffer {
  return {
    x: new Float32Array(maxLength),
    y: new Float32Array(maxLength),
    len: 0,
    writeIndex: 0,
  };
}

function copyTrailBuffer(src: TrailBuffer): TrailBuffer {
  const x = new Float32Array(src.x.length);
  const y = new Float32Array(src.y.length);
  x.set(src.x);
  y.set(src.y);
  return { x, y, len: src.len, writeIndex: src.writeIndex };
}

export class Trails {
  readonly active: boolean;
  private readonly maxLength: number;
  private readonly storeEveryNFrames: number;
  private readonly trails = new Map<number, TrailBuffer>();

  constructor(config: TrailsConfig) {
    this.active = config.active;
    this.maxLength = config.maxLength;
    this.storeEveryNFrames = Math.max(1, config.storeEveryNFrames ?? 1);
  }

  update(payload: OnUpdatePayload): void {
    const { particles: pool, stepResult, frame } = payload;
    for (const [from, to] of stepResult.swaps) {
      const trail = this.trails.get(from);
      if (trail !== undefined) {
        this.trails.set(to, trail);
        this.trails.delete(from);
      } else {
        this.trails.delete(to);
      }
    }

    const shouldStore = frame % this.storeEveryNFrames === 0;
    if (!shouldStore) return;

    for (let i = 0; i < pool.count; i++) {
      let trail = this.trails.get(i);
      if (!trail) {
        trail = createTrailBuffer(this.maxLength);
        this.trails.set(i, trail);
      }
      const w = trail.writeIndex;
      trail.x[w] = pool.px[i];
      trail.y[w] = pool.py[i];
      trail.writeIndex = (w + 1) % this.maxLength;
      trail.len = Math.min(trail.len + 1, this.maxLength);
    }
  }

  /** Zero-allocation iteration for drawing. Callback receives (particleIndex, xArray, yArray, pointCount). Points are in chronological order (oldest first). */
  forEachTrail(
    cb: (
      particleIndex: number,
      xs: Float32Array,
      ys: Float32Array,
      len: number
    ) => void
  ): void {
    const maxLen = this.maxLength;
    for (const [i, t] of this.trails) {
      if (t.len === 0) continue;
      const { x, y, len, writeIndex } = t;
      // Chronological order: oldest at (writeIndex - len + maxLen) % maxLen
      const start = (writeIndex - len + maxLen) % maxLen;
      if (start + len <= maxLen) {
        // Contiguous: pass views, no allocation
        cb(
          i,
          x.subarray(start, start + len),
          y.subarray(start, start + len),
          len
        );
      } else {
        // Wrapped: copy to temp so host sees single contiguous range (only alloc when wrapped)
        const xOut = new Float32Array(len);
        const yOut = new Float32Array(len);
        for (let j = 0; j < len; j++) {
          const idx = (start + j) % maxLen;
          xOut[j] = x[idx];
          yOut[j] = y[idx];
        }
        cb(i, xOut, yOut, len);
      }
    }
  }

  /** Deep copy of trail map (for snapshot). */
  snapshot(): TrailsSnapshot {
    const out = new Map<number, TrailBuffer>();
    for (const [k, t] of this.trails) {
      out.set(k, copyTrailBuffer(t));
    }
    return out;
  }

  restore(snap: unknown): void {
    const s = snap as TrailsSnapshot;
    this.trails.clear();
    for (const [k, t] of s) {
      this.trails.set(k, copyTrailBuffer(t));
    }
  }

  /** Read-only view for drawing; returns a copy (expensive). Prefer forEachTrail() for zero-allocation drawing. */
  getTrails(): Map<number, Vec2[]> {
    const out = new Map<number, Vec2[]>();
    this.forEachTrail((i, xs, ys, len) => {
      const arr: Vec2[] = [];
      for (let j = 0; j < len; j++) arr.push([xs[j], ys[j]]);
      out.set(i, arr);
    });
    return out;
  }
}
