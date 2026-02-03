import * as ParticlePool from "./particle-pool";
import type { Vec2 } from "./types";
import type { RGBA } from "./types";

//

export type Emitter = (pool: ParticlePool.Pool) => void;

//

interface SimpleEmitterConfig {
  position: Vec2;
  velocity: Vec2;
  lifetime: number;
  color: RGBA;
  size: number;
}

const DEFAULTS: SimpleEmitterConfig = {
  position: [0, 0],
  velocity: [0, 0],
  lifetime: 10,
  color: [1, 1, 1, 1],
  size: 1,
};

export function makeSimple(config: Partial<SimpleEmitterConfig> = {}): Emitter {
  const { position, velocity, lifetime, color, size } = {
    ...DEFAULTS,
    ...config,
  };
  return (pool) => {
    for (let i = 0; i < 1; i++) {
      ParticlePool.spawn(pool, {
        position,
        velocity,
        lifetime,
        color,
        size,
      });
    }
  };
}
