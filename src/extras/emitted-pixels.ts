import type { OnUpdatePayload } from "../core/simulation";

//

export interface EmittedPixel {
  x: number;
  y: number;
  size: number;
  emissionTime: number;
}

interface Config {
  maxLength?: number;
}

export class EmittedPixels {
  private readonly maxLength: number;
  private readonly pixels: EmittedPixel[] = [];

  constructor(config: Config = {}) {
    this.maxLength = config.maxLength ?? 10_000;
  }

  update(payload: OnUpdatePayload): void {
    const { particles: pool, context, stepResult } = payload;
    const dt = context.time.delta;

    for (const i of stepResult.added) {
      const startX = pool.px[i] - pool.vx[i] * dt;
      const startY = pool.py[i] - pool.vy[i] * dt;
      this.pixels.push({
        x: startX,
        y: startY,
        size: pool.size[i],
        emissionTime: pool.emissionTime[i],
      });
    }

    while (this.pixels.length > this.maxLength) {
      this.pixels.shift();
    }
  }

  snapshot(): EmittedPixel[] {
    return this.pixels.map((p) => ({
      x: p.x,
      y: p.y,
      size: p.size,
      emissionTime: p.emissionTime,
    }));
  }

  restore(snap: unknown): void {
    const arr = snap as EmittedPixel[];
    this.pixels.length = 0;
    for (const p of arr) {
      this.pixels.push({
        x: p.x,
        y: p.y,
        size: p.size,
        emissionTime: p.emissionTime,
      });
    }
  }

  getEmittedPixels(): EmittedPixel[] {
    return this.pixels;
  }
}
