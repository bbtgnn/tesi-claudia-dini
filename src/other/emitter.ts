import * as particlepool from "./particle-pool";

//

export interface Emitter {
  emit(pool: particlepool.ParticlePool): void;
}

export function makeSimple() {
  return {
    emit(pool: particlepool.ParticlePool): void {
      for (let i = 0; i < 3; i++) {
        particlepool.spawn(pool, 0, 0, 20, 20, 1000, 1, 1, 1, 1, 1);
      }
    },
  };
}
