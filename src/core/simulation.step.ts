import { ParticlePool } from "./particle-pool";
import type { Context, Emitter, Force, ForceContext } from "./types";

//

export interface Result {
  added: number[];
  swaps: ReadonlyArray<readonly [number, number]>;
}

export function run(
  context: Context,
  pool: ParticlePool,
  forces: Force[],
  emitters: Emitter[]
): Result {
  const dt = context.time.delta;
  const added: number[] = [];
  const swaps: [number, number][] = [];

  const countBeforeEmit = pool.count;
  const emissionTime = context.time.current;
  for (const emitter of emitters) {
    const descriptors = emitter.emit(context);
    pool.spawnBatch(descriptors, emissionTime);
  }
  for (let i = countBeforeEmit; i < pool.count; i++) {
    added.push(i);
  }

  const forceCtx: ForceContext = {
    count: pool.count,
    px: pool.px,
    py: pool.py,
    vx: pool.vx,
    vy: pool.vy,
    dt,
  };
  for (const force of forces) {
    force.update(context);
    force.apply(forceCtx);
  }

  for (let i = 0; i < pool.count; i++) {
    pool.px[i] += pool.vx[i] * dt;
    pool.py[i] += pool.vy[i] * dt;
  }

  const endTime = context.time.current + dt;
  for (let i = pool.count - 1; i >= 0; ) {
    if (pool.count === 0) break;
    if (endTime - pool.emissionTime[i] >= pool.lifetime[i]) {
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
