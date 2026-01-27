import * as force from "./force";
import * as particlepool from "./particle-pool";

//

export interface Simulation {
  time: number;
  forces: force.Force[];
}

export function make(forces: force.Force[]): Simulation {
  return {
    time: 0,
    forces,
  };
}

export function update(
  simulation: Simulation,
  pool: particlepool.ParticlePool,
  getTime: () => number
): void {
  // Update time
  const currentTime = getTime();
  const dt = currentTime - simulation.time;
  simulation.time = currentTime;

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
      particlepool.kill(pool, i);
      if (i >= pool.count) i--;
    } else {
      i--;
    }
  }
}
