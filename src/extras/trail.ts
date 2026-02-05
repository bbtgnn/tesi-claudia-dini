import * as ParticlePool from "../core/particle-pool";
import type { StepResult, Vec2 } from "../core/types";

//

/**
 * Trail system that tracks particle positions over time.
 * Hooks into the engine via step result (added indices + swaps); no heuristics.
 * Samples one point per particle per frame and trims to max length.
 */
export interface TrailSystem {
  /**
   * Update trails from the last simulation step.
   * Call with the StepResult from the engine’s onUpdate callback and the current pool.
   * Applies index swaps then records current position for each particle.
   */
  update(stepResult: StepResult, pool: ParticlePool.Pool): void;

  /**
   * Render trails for all particles.
   * Call before rendering particles in your main loop.
   */
  render(
    pool: ParticlePool.Pool,
    renderer: (trail: Vec2[], particleIndex: number) => void
  ): void;

  /** Get trail points for a particle (for custom rendering). */
  getTrail(particleIndex: number): Vec2[];

  /** Clear all trails. */
  clearAll(): void;
}

//

export interface Config {
  /** Maximum number of trail points per particle (sampled every frame). */
  maxLength: number;
}

/**
 * Create a trail system. Uses step result to keep index→trail in sync with the pool.
 */
export function make(config: Config): TrailSystem {
  const { maxLength } = config;
  const trails = new Map<number, Vec2[]>();

  return {
    update(stepResult: StepResult, pool: ParticlePool.Pool) {
      // Apply swaps: trail data moves with the particle
      for (const [from, to] of stepResult.swaps) {
        const trail = trails.get(from);
        if (trail !== undefined) {
          trails.set(to, trail);
          trails.delete(from);
        } else {
          trails.delete(to);
        }
      }

      // Sample current position for every live particle (one point per frame)
      for (let i = 0; i < pool.count; i++) {
        const pos: Vec2 = [pool.px[i], pool.py[i]];
        let trail = trails.get(i);
        if (!trail) {
          trail = [];
          trails.set(i, trail);
        }
        trail.push(pos);
        if (trail.length > maxLength) {
          trail.shift();
        }
      }
    },

    render(
      pool: ParticlePool.Pool,
      renderer: (trail: Vec2[], particleIndex: number) => void
    ) {
      for (let i = 0; i < pool.count; i++) {
        const trail = trails.get(i);
        if (trail && trail.length > 1) {
          renderer(trail, i);
        }
      }
    },

    getTrail(particleIndex: number): Vec2[] {
      return trails.get(particleIndex) ?? [];
    },

    clearAll() {
      trails.clear();
    },
  };
}
