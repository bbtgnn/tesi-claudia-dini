export type Vec2 = readonly [x: number, y: number];

export type RGBA = readonly [r: number, g: number, b: number, a: number];

/** RNG owned by simulation: setSeed/setState are called by simulation only. */
export interface SimulationRng {
  setSeed(seed: number): void;
  setState(state: { stepIndex: number; seed: number }): void;
  random(): number;
  noise(x: number, y?: number, z?: number): number;
}

export interface Context {
  time: { current: number; delta: number };
  rng: SimulationRng;
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

export interface ForceContext {
  count: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  dt: number;
}

export interface Force {
  update(ctx: Context): void;
  apply(ctx: ForceContext): void;
}

export interface Emitter {
  /** Return descriptors for particles to emit; simulation adds them to the pool. */
  emit(ctx: Context): ParticleDescriptor[];
}
