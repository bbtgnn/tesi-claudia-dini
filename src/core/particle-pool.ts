import type { RGBA, Vec2 } from "./types";

export interface ParticlePool {
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

export function make(capacity: number): ParticlePool {
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

export function spawn(
  pool: ParticlePool,
  input: {
    position: Vec2;
    velocity: Vec2;
    lifetime: number;
    color: RGBA;
    size: number;
  }
): boolean {
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

export function kill(pool: ParticlePool, index: number): void {
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
