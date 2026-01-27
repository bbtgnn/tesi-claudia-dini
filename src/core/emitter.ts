import * as ParticlePool from "./particle-pool";

//

export interface Emitter {
  emit(pool: ParticlePool.Pool): void;
}

export function makeSimple() {
  return {
    emit(pool: ParticlePool.Pool): void {
      for (let i = 0; i < 1; i++) {
        ParticlePool.spawn(pool, {
          position: [0, 0],
          velocity: [20, 20],
          lifetime: 10,
          color: [1, 1, 1, 1],
          size: 1,
        });
      }
    },
  };
}
