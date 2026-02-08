import type { ParticlePool } from "./particle-pool";

export type ParticleData = {
  x: number;
  y: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  emissionTime: number;
};

export class RenderBuffer {
  readonly data: ParticleData[];

  constructor(capacity: number) {
    this.data = Array.from({ length: capacity }, () => ({
      x: 0,
      y: 0,
      size: 0,
      r: 0,
      g: 0,
      b: 0,
      a: 0,
      emissionTime: 0,
    }));
  }

  update(pool: ParticlePool): number {
    for (let i = 0; i < pool.count; i++) {
      const o = this.data[i];
      o.x = pool.px[i];
      o.y = pool.py[i];
      o.size = pool.size[i];
      o.r = pool.r[i];
      o.g = pool.g[i];
      o.b = pool.b[i];
      o.a = pool.a[i];
      o.emissionTime = pool.emissionTime[i];
    }
    return pool.count;
  }
}
