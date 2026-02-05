import * as ParticlePool from "./particle-pool";
import type { TimeStep } from "./types";

//

export interface ForceContext {
  count: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  dt: number;
}

export type Force = (ctx: ForceContext) => void;

//

export interface Emitter {
  update(timeStep: TimeStep): void;
  emit(pool: ParticlePool.Pool): void;
}

//

export interface Config {
  forces: Force[];
  emitters: Emitter[];
}

export interface Simulation extends Config {}

export function make(config: Config): Simulation {
  return {
    ...config,
  };
}

export function update(
  simulation: Simulation,
  pool: ParticlePool.Pool,
  timeStep: TimeStep
): void {
  const { dt } = timeStep;

  // Run emitters
  for (const emitter of simulation.emitters) {
    emitter.update(timeStep);
    emitter.emit(pool);
  }

  // Apply forces
  const ctx = {
    count: pool.count,
    px: pool.px,
    py: pool.py,
    vx: pool.vx,
    vy: pool.vy,
    dt,
  };
  for (const force of simulation.forces) {
    force(ctx);
  }

  // Update particles
  for (let i = 0; i < pool.count; i++) {
    // position
    pool.px[i] += pool.vx[i] * dt;
    pool.py[i] += pool.vy[i] * dt;
    // age
    pool.age[i] += dt;
  }

  // Kill particles
  for (let i = pool.count - 1; i >= 0; ) {
    if (pool.count === 0) break;
    if (pool.age[i] >= pool.lifetime[i]) {
      ParticlePool.kill(pool, i);
      if (i >= pool.count) i--;
    } else {
      i--;
    }
  }
}
