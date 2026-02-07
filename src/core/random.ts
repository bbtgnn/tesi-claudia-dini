/**
 * Simulation random interface.
 *
 * Abstracts both uniform random (random) and Perlin-style noise (noise) so you can
 * plug different implementations (e.g. p5 with randomSeed/noiseSeed, or a
 * deterministic RNG with getState/setState for full replay).
 *
 * For deterministic replay with p5: we can't read p5's internal RNG state, so we
 * use step-index reseeding. State is { stepIndex, seed }. Before each simulation step,
 * call setSeed(seedForStep(baseSeed, stepIndex)). When restoring a snapshot, call
 * setState(snap.rngState); the implementation will reseed so the *next* step uses the
 * same sequence. Use seedForStep() from this module to derive per-step seeds.
 */

/** State to save in a snapshot and restore for time-travel. */
export interface RandomState {
  stepIndex: number;
  seed: number;
}

/**
 * Derive a seed for a given step so that step N always gets the same sequence
 * when you call setSeed(seedForStep(base, N)).
 */
export function seedForStep(baseSeed: number, stepIndex: number): number {
  return baseSeed + stepIndex * 0x9e3779b9;
}

export interface SimulationRandom {
  /** Set seed for both uniform random and noise (e.g. p5 randomSeed + noiseSeed). */
  setSeed(seed: number): void;

  /** Uniform random in [0, 1). */
  random(): number;
  /** Uniform random in [0, max). */
  random(max: number): number;
  /** Uniform random in [min, max). */
  random(min: number, max: number): number;

  /**
   * Perlin-style noise. 1D, 2D, or 3D.
   * Typical range is [0, 1] but implementation-dependent.
   */
  noise(x: number): number;
  noise(x: number, y: number): number;
  noise(x: number, y: number, z: number): number;

  /**
   * Restore RNG state from a snapshot (e.g. after stepping back in time).
   * The implementation should reseed so that the *next* step produces the same
   * sequence as when we first ran that step.
   */
  setState(state: RandomState): void;
}
