import * as ParticlePool from "./particle-pool";
import type { ParticleRenderData } from "./types";

//

export type Buffer = ParticleRenderData[];

export function make(capacity: number): Buffer {
  return Array.from({ length: capacity }, () => ({
    x: 0,
    y: 0,
    size: 0,
    r: 0,
    g: 0,
    b: 0,
    a: 0,
  }));
}

export function update(pool: ParticlePool.Pool, buffer: Buffer): number {
  for (let i = 0; i < pool.count; i++) {
    const o = buffer[i];
    // if (!o) break;
    o.x = pool.px[i];
    o.y = pool.py[i];
    o.size = pool.size[i];
    o.r = pool.r[i];
    o.g = pool.g[i];
    o.b = pool.b[i];
    o.a = pool.a[i];
  }
  return pool.count;
}
