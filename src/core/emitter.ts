import * as particlepool from "./particle-pool";

//

export interface Emitter {
  emit(pool: particlepool.ParticlePool): void;
}

export function makeSimple() {
  return {
    emit(pool: particlepool.ParticlePool): void {
      for (let i = 0; i < 1; i++) {
        particlepool.spawn(pool, {
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
