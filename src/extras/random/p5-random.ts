import type P5 from "p5";
import type { RandomState, SimulationRandom } from "../../core/random";
import { seedForStep } from "../../core/random";

/**
 * p5-based implementation of SimulationRandom.
 * Uses p5's randomSeed and noiseSeed for reproducibility.
 *
 * Because p5 does not expose internal RNG state, deterministic replay uses
 * step-index reseeding: before each step you call setSeed(seedForStep(baseSeed, stepIndex)).
 * When you restore a snapshot, call setState(snap.rngState); this implementation will
 * reseed so the next step matches the original run.
 */
export function makeP5Random(p: P5): SimulationRandom {
  return {
    setSeed(seed: number) {
      p.randomSeed(seed);
      p.noiseSeed(seed);
    },

    random(minOrMax?: number, max?: number): number {
      if (max !== undefined && minOrMax !== undefined) {
        return p.random(minOrMax, max);
      }
      if (minOrMax !== undefined) {
        return p.random(minOrMax);
      }
      return p.random();
    },

    noise(x: number, y?: number, z?: number): number {
      if (z !== undefined && y !== undefined) {
        return p.noise(x, y, z);
      }
      if (y !== undefined) {
        return p.noise(x, y);
      }
      return p.noise(x);
    },

    setState(state: RandomState) {
      const nextStep = state.stepIndex + 1;
      const seed = seedForStep(state.seed, nextStep);
      p.randomSeed(seed);
      p.noiseSeed(seed);
    },
  };
}
