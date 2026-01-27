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
  const currentTime = getTime();
  const dt = currentTime - simulation.time;
  simulation.time = currentTime;

  const ctx = {
    count: pool.count,
    px: pool.px,
    py: pool.py,
    vx: pool.vx,
    vy: pool.vy,
    dt,
  };

  force.apply(ctx, simulation.forces);

  for (let i = 0; i < pool.count; i++) {
    pool.px[i]! += pool.vx[i]! * dt;
    pool.py[i]! += pool.vy[i]! * dt;
  }

  particlepool.updateAges(pool, dt);

  for (let i = pool.count - 1; i >= 0; ) {
    if (pool.count === 0) break;
    if (pool.age[i] >= pool.lifetime[i]) {
      particlepool.kill(pool, i);
    } else {
      i--;
    }
  }
}

// /**
//  * Single simulation step.
//  * 1. Update erosion activation → new pixel indices
//  * 2. Emit from those pixels (consume + blacken inside emitFromPixels)
//  * 3. Build ForceContext from pool
//  * 4. Apply forces in order
//  * 5. Integrate: p += v * dt
//  * 6. Update ages
//  * 7. Kill expired (swap-with-last, backward iteration)
//  */
// export function simulationStep(
//   image: ImageSystem,
//   activation: ActivationRunner,
//   pool: ParticlePool,
//   pixelToWorld: PixelToWorld,
//   forces: Force[],
//   dt: number,
//   config: SimulationConfig
// ): void {
//   const { indices, count } = activation.step(image);
//   emitFromPixels(image, pixelToWorld, pool, indices, count, config.emission);

//   const ctx = {
//     count: pool.count,
//     px: pool.px,
//     py: pool.py,
//     vx: pool.vx,
//     vy: pool.vy,
//     dt,
//   };
//   apply(ctx, forces);

//   for (let i = 0; i < pool.count; i++) {
//     pool.px[i]! += pool.vx[i]! * dt;
//     pool.py[i]! += pool.vy[i]! * dt;
//   }

// }

// /**
//  * Fill a buffer with render data for all alive particles.
//  * out[i] receives { x, y, size, r, g, b, a } for i in [0, count).
//  * Returns the number of particles written.
//  */
// export function getRenderData(
//   pool: ParticlePool,
//   out: ParticleRenderData[]
// ): number {
//   return pool.fillRenderData(out);
// }
