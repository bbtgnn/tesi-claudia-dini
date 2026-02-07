export type Vec2 = readonly [x: number, y: number];

export type RGBA = readonly [r: number, g: number, b: number, a: number];

export interface Context {
  time: { current: number; delta: number };
  rng: {
    random: () => number;
    noise: (x: number, y?: number, z?: number) => number;
  };
  /** Simulation/canvas bounds; forces (e.g. flow-field) can use this for lazy size resolution. */
  bounds: { width: number; height: number };
}

/** Descriptor for a single particle; emitters return these and the simulation adds them to the pool. */
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
