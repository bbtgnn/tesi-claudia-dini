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
