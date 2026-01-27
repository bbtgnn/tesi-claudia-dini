import * as Force from "./force";
import * as Emitter from "./emitter";
import * as ParticlePool from "./particle-pool";
import type { Getter } from "./types";

//

export interface Config {
  forces: Getter<Force.Force[]>;
  emitters: Getter<Emitter.Emitter[]>;
  getTime: () => number;
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
  for (const emitter of simulation.emitters()) {
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
  for (const force of simulation.forces()) {
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
