import type { ParticleDescriptor } from "./types";

/** Deep copy of pool state for history/restore. */
export interface ParticlePoolSnapshot {
  count: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  age: Float32Array;
  lifetime: Float32Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  a: Float32Array;
  size: Float32Array;
}

export class ParticlePool {
  readonly capacity: number;
  count: number = 0;
  readonly px: Float32Array;
  readonly py: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly age: Float32Array;
  readonly lifetime: Float32Array;
  readonly r: Float32Array;
  readonly g: Float32Array;
  readonly b: Float32Array;
  readonly a: Float32Array;
  readonly size: Float32Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.px = new Float32Array(capacity);
    this.py = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.lifetime = new Float32Array(capacity);
    this.r = new Float32Array(capacity);
    this.g = new Float32Array(capacity);
    this.b = new Float32Array(capacity);
    this.a = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
  }

  spawn(input: ParticleDescriptor): boolean {
    if (this.count >= this.capacity) return false;
    const i = this.count++;
    this.px[i] = input.position[0];
    this.py[i] = input.position[1];
    this.vx[i] = input.velocity[0];
    this.vy[i] = input.velocity[1];
    this.age[i] = 0;
    this.lifetime[i] = input.lifetime;
    this.r[i] = input.color[0];
    this.g[i] = input.color[1];
    this.b[i] = input.color[2];
    this.a[i] = input.color[3];
    this.size[i] = input.size;
    return true;
  }

  /** Add as many descriptors as fit in the pool; returns how many were added. */
  spawnBatch(descriptors: ParticleDescriptor[]): number {
    const space = this.capacity - this.count;
    const n = Math.min(space, descriptors.length);
    for (let i = 0; i < n; i++) {
      const d = descriptors[i];
      const idx = this.count++;
      this.px[idx] = d.position[0];
      this.py[idx] = d.position[1];
      this.vx[idx] = d.velocity[0];
      this.vy[idx] = d.velocity[1];
      this.age[idx] = 0;
      this.lifetime[idx] = d.lifetime;
      this.r[idx] = d.color[0];
      this.g[idx] = d.color[1];
      this.b[idx] = d.color[2];
      this.a[idx] = d.color[3];
      this.size[idx] = d.size;
    }
    return n;
  }

  kill(index: number): void {
    if (this.count === 0 || index < 0 || index >= this.count) return;
    const last = this.count - 1;
    if (index !== last) {
      this.px[index] = this.px[last];
      this.py[index] = this.py[last];
      this.vx[index] = this.vx[last];
      this.vy[index] = this.vy[last];
      this.age[index] = this.age[last];
      this.lifetime[index] = this.lifetime[last];
      this.r[index] = this.r[last];
      this.g[index] = this.g[last];
      this.b[index] = this.b[last];
      this.a[index] = this.a[last];
      this.size[index] = this.size[last];
    }
    this.count--;
  }

  /** Deep copy of count and all arrays for snapshot. */
  snapshot(): ParticlePoolSnapshot {
    const n = this.count;
    return {
      count: n,
      px: this.px.slice(0, n),
      py: this.py.slice(0, n),
      vx: this.vx.slice(0, n),
      vy: this.vy.slice(0, n),
      age: this.age.slice(0, n),
      lifetime: this.lifetime.slice(0, n),
      r: this.r.slice(0, n),
      g: this.g.slice(0, n),
      b: this.b.slice(0, n),
      a: this.a.slice(0, n),
      size: this.size.slice(0, n),
    };
  }

  /** Restore from snapshot (deep copy into existing arrays up to capacity). */
  restore(snap: ParticlePoolSnapshot): void {
    const n = Math.min(snap.count, this.capacity);
    this.count = n;
    if (n === 0) return;
    this.px.set(snap.px.subarray(0, n));
    this.py.set(snap.py.subarray(0, n));
    this.vx.set(snap.vx.subarray(0, n));
    this.vy.set(snap.vy.subarray(0, n));
    this.age.set(snap.age.subarray(0, n));
    this.lifetime.set(snap.lifetime.subarray(0, n));
    this.r.set(snap.r.subarray(0, n));
    this.g.set(snap.g.subarray(0, n));
    this.b.set(snap.b.subarray(0, n));
    this.a.set(snap.a.subarray(0, n));
    this.size.set(snap.size.subarray(0, n));
  }
}
