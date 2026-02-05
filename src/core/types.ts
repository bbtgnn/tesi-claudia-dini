export type Vec2 = readonly [x: number, y: number];

export type RGBA = readonly [r: number, g: number, b: number, a: number];

export type TimeStep = {
  time: number;
  dt: number;
};

/** Descriptor for a single particle; emitters return these and the engine adds them to the pool. */
export interface ParticleDescriptor {
  position: Vec2;
  velocity: Vec2;
  lifetime: number;
  color: RGBA;
  size: number;
}

/** Result of one simulation step: indices added (spawned) and index swaps (from kill). */
export interface StepResult {
  /** Indices that received new particles this step (from emitters). */
  added: number[];
  /** [fromIndex, toIndex]: particle at from moved to to (e.g. swap-on-kill). */
  swaps: ReadonlyArray<readonly [number, number]>;
}
