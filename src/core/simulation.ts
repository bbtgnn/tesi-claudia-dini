import type { ParticlePool } from "./particle-pool";
import type { Context, ParticleDescriptor, StepResult } from "./types";

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
  update(ctx: Context): void;
  apply(ctx: ForceContext): void;
}

//

export interface Emitter {
  /** Return descriptors for particles to emit; engine adds them to the pool. */
  emit(ctx: Context): ParticleDescriptor[];
}

//

export interface SimulationConfig {
  forces: Force[];
  emitters: Emitter[];
}

export class Simulation {
  readonly forces: Force[];
  readonly emitters: Emitter[];

  constructor(config: SimulationConfig) {
    this.forces = config.forces;
    this.emitters = config.emitters;
  }

  update(pool: ParticlePool, context: Context): StepResult {
    const dt = context.time.delta;
    const added: number[] = [];
    const swaps: [number, number][] = [];

    // Run emitters and add returned particles to the pool
    const countBeforeEmit = pool.count;
    for (const emitter of this.emitters) {
      const descriptors = emitter.emit(context);
      pool.spawnBatch(descriptors);
    }
    for (let i = countBeforeEmit; i < pool.count; i++) {
      added.push(i);
    }

    // Apply forces
    const forceCtx: ForceContext = {
      count: pool.count,
      px: pool.px,
      py: pool.py,
      vx: pool.vx,
      vy: pool.vy,
      dt,
    };
    for (const force of this.forces) {
      force.update(context);
      force.apply(forceCtx);
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
        pool.kill(i);
        if (i >= pool.count) i--;
      } else {
        i--;
      }
    }

    return { added, swaps };
  }
}
