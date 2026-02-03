import * as Force from "./force";
import * as Emitter from "./emitter";
import * as ParticlePool from "./particle-pool";

//

export interface TrailSystem {
  update(pool: ParticlePool.Pool, currentTime: number): void;
  getTrail(particleIndex: number): import("./types").Vec2[];
  clearTrail(particleIndex: number): void;
  remapTrail(fromIndex: number, toIndex: number): void;
}

export interface Config {
  forces: Force.Force[];
  emitters: Emitter.Emitter[];
  getTime: () => number;
  trailSystem?: TrailSystem;
}

export interface Simulation extends Config {
  time: number;
}

export function make(config: Config): Simulation {
  return {
    ...config,
    time: 0,
  };
}

export function update(simulation: Simulation, pool: ParticlePool.Pool): void {
  // Update time
  const currentTime = simulation.getTime();
  const dt = currentTime - simulation.time;
  simulation.time = currentTime;

  // Run emitters
  for (const emitter of simulation.emitters) {
    emitter.update();
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

  // Update trail system if provided
  if (simulation.trailSystem) {
    simulation.trailSystem.update(pool, currentTime);
  }

  // Kill particles
  for (let i = pool.count - 1; i >= 0; ) {
    if (pool.count === 0) break;
    if (pool.age[i] >= pool.lifetime[i]) {
      const lastIndex = pool.count - 1;

      // If trail system exists, remap trail from last particle to killed index
      // (because kill() swaps last particle to killed index)
      if (simulation.trailSystem) {
        if (i !== lastIndex) {
          // Remap trail from last particle to killed index
          simulation.trailSystem.remapTrail(lastIndex, i);
        } else {
          // Killing the last particle, just clear it
          simulation.trailSystem.clearTrail(i);
        }
      }

      ParticlePool.kill(pool, i);
      if (i >= pool.count) i--;
    } else {
      i--;
    }
  }
}
