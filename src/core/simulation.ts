import * as ParticlePool from "./particle-pool";
import type { ParticleDescriptor, StepResult, TimeStep } from "./types";

//

export interface ForceContext {
  count: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  dt: number;
}

export interface Force {
  update(timeStep: TimeStep): void;
  apply(ctx: ForceContext): void;
}

//

export interface Emitter {
  update(timeStep: TimeStep): void;
  /** Return descriptors for particles to emit; engine adds them to the pool. */
  emit(): ParticleDescriptor[];
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
): StepResult {
  const { dt } = timeStep;
  const added: number[] = [];
  const swaps: [number, number][] = [];

  // Run emitters and add returned particles to the pool
  const countBeforeEmit = pool.count;
  for (const emitter of simulation.emitters) {
    emitter.update(timeStep);
    const descriptors = emitter.emit();
    ParticlePool.spawnBatch(pool, descriptors);
  }
  for (let i = countBeforeEmit; i < pool.count; i++) {
    added.push(i);
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
    force.update(timeStep);
    force.apply(ctx);
  }

  // Update particles
  for (let i = 0; i < pool.count; i++) {
    pool.px[i] += pool.vx[i] * dt;
    pool.py[i] += pool.vy[i] * dt;
    pool.age[i] += dt;
  }

  // Kill particles and record swaps
  for (let i = pool.count - 1; i >= 0; ) {
    if (pool.count === 0) break;
    if (pool.age[i] >= pool.lifetime[i]) {
      const last = pool.count - 1;
      if (i !== last) {
        swaps.push([last, i]);
      }
      ParticlePool.kill(pool, i);
      if (i >= pool.count) i--;
    } else {
      i--;
    }
  }

  return { added, swaps };
}
