import type { ParticleDescriptor } from "./types";

export interface Pool {
  readonly capacity: number;
  count: number;
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
}

/**
 * Snapshot of the particle pool state at a given simulation step.
 * Used for time-travel / scrubbing the simulation timeline.
 */
export interface PoolSnapshot {
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

export function make(capacity: number): Pool {
  return {
    capacity,
    count: 0,
    px: new Float32Array(capacity),
    py: new Float32Array(capacity),
    vx: new Float32Array(capacity),
    vy: new Float32Array(capacity),
    age: new Float32Array(capacity),
    lifetime: new Float32Array(capacity),
    r: new Float32Array(capacity),
    g: new Float32Array(capacity),
    b: new Float32Array(capacity),
    a: new Float32Array(capacity),
    size: new Float32Array(capacity),
  };
}

/**
 * Create a deep snapshot of the current pool contents.
 * Arrays are cloned so that future mutations to the pool
 * do not affect the stored snapshot.
 */
export function snapshot(pool: Pool): PoolSnapshot {
  return {
    count: pool.count,
    px: pool.px.slice(),
    py: pool.py.slice(),
    vx: pool.vx.slice(),
    vy: pool.vy.slice(),
    age: pool.age.slice(),
    lifetime: pool.lifetime.slice(),
    r: pool.r.slice(),
    g: pool.g.slice(),
    b: pool.b.slice(),
    a: pool.a.slice(),
    size: pool.size.slice(),
  };
}

/**
 * Restore pool contents from a previously captured snapshot.
 * Assumes the pool has at least the capacity required by the snapshot.
 */
export function restore(pool: Pool, snap: PoolSnapshot): void {
  pool.count = snap.count;
  pool.px.set(snap.px);
  pool.py.set(snap.py);
  pool.vx.set(snap.vx);
  pool.vy.set(snap.vy);
  pool.age.set(snap.age);
  pool.lifetime.set(snap.lifetime);
  pool.r.set(snap.r);
  pool.g.set(snap.g);
  pool.b.set(snap.b);
  pool.a.set(snap.a);
  pool.size.set(snap.size);
}

export function spawn(pool: Pool, input: ParticleDescriptor): boolean {
  if (pool.count >= pool.capacity) return false;
  const i = pool.count++;
  pool.px[i] = input.position[0];
  pool.py[i] = input.position[1];
  pool.vx[i] = input.velocity[0];
  pool.vy[i] = input.velocity[1];
  pool.age[i] = 0;
  pool.lifetime[i] = input.lifetime;
  pool.r[i] = input.color[0];
  pool.g[i] = input.color[1];
  pool.b[i] = input.color[2];
  pool.a[i] = input.color[3];
  pool.size[i] = input.size;
  return true;
}

/** Add as many descriptors as fit in the pool; returns how many were added. */
export function spawnBatch(
  pool: Pool,
  descriptors: ParticleDescriptor[]
): number {
  const space = pool.capacity - pool.count;
  const n = Math.min(space, descriptors.length);
  for (let i = 0; i < n; i++) {
    const d = descriptors[i];
    const idx = pool.count++;
    pool.px[idx] = d.position[0];
    pool.py[idx] = d.position[1];
    pool.vx[idx] = d.velocity[0];
    pool.vy[idx] = d.velocity[1];
    pool.age[idx] = 0;
    pool.lifetime[idx] = d.lifetime;
    pool.r[idx] = d.color[0];
    pool.g[idx] = d.color[1];
    pool.b[idx] = d.color[2];
    pool.a[idx] = d.color[3];
    pool.size[idx] = d.size;
  }
  return n;
}

export function kill(pool: Pool, index: number): void {
  if (pool.count === 0 || index < 0 || index >= pool.count) return;
  const last = pool.count - 1;
  if (index !== last) {
    pool.px[index] = pool.px[last];
    pool.py[index] = pool.py[last];
    pool.vx[index] = pool.vx[last];
    pool.vy[index] = pool.vy[last];
    pool.age[index] = pool.age[last];
    pool.lifetime[index] = pool.lifetime[last];
    pool.r[index] = pool.r[last];
    pool.g[index] = pool.g[last];
    pool.b[index] = pool.b[last];
    pool.a[index] = pool.a[last];
    pool.size[index] = pool.size[last];
  }
  pool.count--;
}
