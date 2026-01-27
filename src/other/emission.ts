/**
 * One-shot emission from activated pixels.
 * Position from pixel-to-world; color from source pixel; pixel consumed after emit.
 */

import type { ImageSystem } from "./image.js";
import type { ParticlePool } from "./particle-pool.js";
import type { PixelToWorld } from "./pixel-to-world.js";
import { spawn } from "./particle-pool.js";

export interface EmissionConfig {
  velocityX: number;
  velocityY: number;
  lifetime: number;
  particleSize: number;
  /** Max particles to spawn per frame (0 = no limit). */
  maxPerFrame?: number;
}

const DEFAULTS: EmissionConfig = {
  velocityX: 0,
  velocityY: 0,
  lifetime: 2,
  particleSize: 4,
};

/**
 * Emit one particle per activated pixel.
 * For each index: world position from pixelToWorld, color from image; spawn; then consume pixel.
 * Returns the number of particles spawned.
 */
export function emitFromPixels(
  image: ImageSystem,
  pixelToWorld: PixelToWorld,
  pool: ParticlePool,
  indices: Uint32Array,
  count: number,
  config: Partial<EmissionConfig> = {}
): number {
  const cfg = { ...DEFAULTS, ...config };
  const limit =
    cfg.maxPerFrame && cfg.maxPerFrame > 0
      ? Math.min(count, cfg.maxPerFrame)
      : count;
  let spawned = 0;

  for (let i = 0; i < count; i++) {
    const idx = indices[i]!;
    const doEmit = i < limit;

    if (doEmit) {
      const { x, y } = pixelToWorld(idx);
      const [r, g, b, a] = image.getColor(idx);
      const ok = spawn(
        pool,
        x,
        y,
        cfg.velocityX,
        cfg.velocityY,
        cfg.lifetime,
        r,
        g,
        b,
        a,
        cfg.particleSize
      );
      if (ok) spawned++;
      if (!ok && pool.count >= pool.capacity) break;
    }

    image.consume(idx);
  }

  return spawned;
}
