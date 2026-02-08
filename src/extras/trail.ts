import type { OnUpdatePayload } from "../core/simulation";
import type { Vec2 } from "../core/types";

/** Deep copy of trail map for snapshot/restore. */
export type TrailsSnapshot = Map<number, Vec2[]>;

export interface TrailsConfig {
  /** Maximum number of points per trail. */
  maxLength: number;
  /** Store a new point every N frames (default 1 = every frame). */
  storeEveryNFrames?: number;
}

export class Trails {
  private readonly maxLength: number;
  private readonly storeEveryNFrames: number;
  private readonly trails = new Map<number, Vec2[]>();

  constructor(config: TrailsConfig) {
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
      const pos: Vec2 = [pool.px[i], pool.py[i]];
      let trail = this.trails.get(i);
      if (!trail) {
        trail = [];
        this.trails.set(i, trail);
      }
      trail.push(pos);
      if (trail.length > this.maxLength) {
        trail.shift();
      }
    }
  }

  /** Deep copy of trail map (particle index → array of Vec2). */
  snapshot(): TrailsSnapshot {
    const out = new Map<number, Vec2[]>();
    for (const [k, arr] of this.trails) {
      out.set(
        k,
        arr.map((p): Vec2 => [p[0], p[1]])
      );
    }
    return out;
  }

  /** Restore from snapshot; replaces internal trail map. (SimulationExtension) */
  restore(snap: unknown): void {
    const s = snap as TrailsSnapshot;
    this.trails.clear();
    for (const [k, arr] of s) {
      this.trails.set(
        k,
        arr.map((p): Vec2 => [p[0], p[1]])
      );
    }
  }

  /** Read-only view for drawing; returns a copy so host cannot mutate. */
  getTrails(): Map<number, Vec2[]> {
    const out = new Map<number, Vec2[]>();
    for (const [k, arr] of this.trails) {
      out.set(
        k,
        arr.map((p): Vec2 => [p[0], p[1]])
      );
    }
    return out;
  }
}
