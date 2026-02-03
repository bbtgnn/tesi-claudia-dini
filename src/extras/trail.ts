import * as ParticlePool from "../core/particle-pool";
import type { Vec2 } from "../core/types";

//

/**
 * Trail system that tracks particle positions over time.
 * Completely optional and separate from core particle pool.
 */
export interface TrailSystem {
  /**
   * Update trails based on current particle positions.
   * Call this during simulation update.
   */
  update(pool: ParticlePool.Pool, currentTime: number): void;

  /**
   * Get trail points for a particle.
   */
  getTrail(particleIndex: number): Vec2[];

  /**
   * Clear trail for a particle (called when particle is killed).
   */
  clearTrail(particleIndex: number): void;

  /**
   * Remap trail from one particle index to another.
   * Used when particles are swapped during kill operations.
   */
  remapTrail(fromIndex: number, toIndex: number): void;

  /**
   * Clear all trails.
   */
  clearAll(): void;
}

//

export interface Config {
  /**
   * Maximum number of trail points per particle.
   */
  maxLength: number;

  /**
   * Minimum time between trail updates (0 = every frame).
   * Lower values = smoother trails but more CPU.
   */
  updateInterval?: number;
}

/**
 * Create a trail system with circular buffer storage.
 */
export function make(config: Config): TrailSystem {
  const { maxLength, updateInterval = 0.016 } = config;

  // Map: particleIndex -> trail points
  // Using arrays for each particle (could optimize with Float32Array if needed)
  const trails = new Map<number, Vec2[]>();
  const lastUpdate = new Map<number, number>();

  return {
    update(pool: ParticlePool.Pool, currentTime: number) {
      for (let i = 0; i < pool.count; i++) {
        const lastTime = lastUpdate.get(i) ?? 0;

        // Check update interval
        if (updateInterval > 0 && currentTime - lastTime < updateInterval) {
          continue;
        }

        // Get or create trail
        let trail = trails.get(i);
        if (!trail) {
          trail = [];
          trails.set(i, trail);
        }

        // Add current position
        trail.push([pool.px[i], pool.py[i]]);

        // Trim to max length (circular buffer)
        if (trail.length > maxLength) {
          trail.shift(); // Remove oldest point
        }

        lastUpdate.set(i, currentTime);
      }
    },

    getTrail(particleIndex: number): Vec2[] {
      return trails.get(particleIndex) ?? [];
    },

    clearTrail(particleIndex: number) {
      trails.delete(particleIndex);
      lastUpdate.delete(particleIndex);
    },

    remapTrail(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return;
      const trail = trails.get(fromIndex);
      const time = lastUpdate.get(fromIndex);
      if (trail) {
        trails.set(toIndex, trail);
        trails.delete(fromIndex);
      }
      if (time !== undefined) {
        lastUpdate.set(toIndex, time);
        lastUpdate.delete(fromIndex);
      }
    },

    clearAll() {
      trails.clear();
      lastUpdate.clear();
    },
  };
}
