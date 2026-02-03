import * as ParticlePool from "../core/particle-pool";
import type { Vec2 } from "../core/types";

//

/**
 * Trail system that tracks particle positions over time.
 * Completely optional and separate from core particle pool.
 * The core system is completely agnostic about trails.
 */
export interface TrailSystem {
  /**
   * Update trails based on current particle positions.
   * Call this AFTER Engine.update() in your main loop.
   * Automatically handles particle death/remapping.
   */
  update(pool: ParticlePool.Pool, currentTime: number): void;

  /**
   * Render trails for all particles.
   * Call this BEFORE rendering particles in your main loop.
   */
  render(
    pool: ParticlePool.Pool,
    renderer: (trail: Vec2[], particleIndex: number) => void
  ): void;

  /**
   * Get trail points for a particle (for custom rendering).
   */
  getTrail(particleIndex: number): Vec2[];

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

  /**
   * Maximum distance a particle can move between updates before we assume
   * it's a different particle (due to index swapping).
   * Default: 200 pixels (adjust based on your particle speeds).
   * Lower values = more aggressive swap detection (may clear trails on fast movement).
   */
  maxJumpDistance?: number;
}

/**
 * Create a trail system with circular buffer storage.
 */
export function make(config: Config): TrailSystem {
  const { maxLength, updateInterval = 0.016, maxJumpDistance = 200 } = config;

  // Map: particleIndex -> trail points
  // Using arrays for each particle (could optimize with Float32Array if needed)
  const trails = new Map<number, Vec2[]>();
  const lastUpdate = new Map<number, number>();
  const lastPositions = new Map<number, Vec2>(); // Track last known position per index
  let previousCount = 0;

  return {
    update(pool: ParticlePool.Pool, currentTime: number) {
      // When count decreases, particles were killed and swapped
      // We need to validate all trails to detect swaps
      if (pool.count < previousCount) {
        // Clear trails for indices beyond current count
        for (let i = pool.count; i < previousCount; i++) {
          trails.delete(i);
          lastUpdate.delete(i);
          lastPositions.delete(i);
        }

        // When count decreases, particles were swapped
        // Validate all trails - check if positions jumped suspiciously
        for (let i = 0; i < pool.count; i++) {
          const currentPos: Vec2 = [pool.px[i], pool.py[i]];
          const lastPos = lastPositions.get(i);
          const lastTime = lastUpdate.get(i);

          if (lastPos && lastTime !== undefined) {
            const dx = currentPos[0] - lastPos[0];
            const dy = currentPos[1] - lastPos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            const dt = currentTime - lastTime;

            // Calculate max reasonable distance based on time elapsed
            // Assume max velocity of ~500 pixels/second (adjust if your particles are faster)
            const maxVelocity = 500;
            const maxExpectedDistance = maxVelocity * dt;

            // If position jumped beyond reasonable distance, clear trail
            // When count decreases, be more aggressive (use lower threshold)
            const threshold = Math.max(
              maxJumpDistance * 0.6,
              maxExpectedDistance * 1.1
            );
            if (distance > threshold) {
              trails.delete(i);
              lastUpdate.delete(i);
              lastPositions.delete(i);
            }
          }
        }
      }

      // Update trails for all current particles
      for (let i = 0; i < pool.count; i++) {
        const currentPos: Vec2 = [pool.px[i], pool.py[i]];
        const lastPos = lastPositions.get(i);

        // Detect particle swap: if position jumped too far, it's a different particle
        // This happens when a particle is killed and another is swapped to this index
        if (lastPos) {
          const lastTime = lastUpdate.get(i);
          const dx = currentPos[0] - lastPos[0];
          const dy = currentPos[1] - lastPos[1];
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Use velocity-based detection for more accuracy
          let threshold = maxJumpDistance;
          if (lastTime !== undefined) {
            const dt = currentTime - lastTime;
            const maxVelocity = 500; // pixels/second
            const maxExpectedDistance = maxVelocity * dt;
            threshold = Math.max(maxJumpDistance, maxExpectedDistance * 1.2);
          }

          if (distance > threshold) {
            // This is likely a different particle (swapped in), clear its trail
            trails.delete(i);
            lastUpdate.delete(i);
            lastPositions.delete(i);
          }
        }

        const lastTime = lastUpdate.get(i) ?? 0;

        // Check update interval
        if (updateInterval > 0 && currentTime - lastTime < updateInterval) {
          // Still update lastPositions even if we skip trail update
          // This helps with swap detection
          if (!lastPositions.has(i)) {
            lastPositions.set(i, currentPos);
          }
          continue;
        }

        // Get or create trail
        let trail = trails.get(i);
        if (!trail) {
          trail = [];
          trails.set(i, trail);
        }

        // Add current position
        trail.push(currentPos);

        // Trim to max length (circular buffer)
        if (trail.length > maxLength) {
          trail.shift(); // Remove oldest point
        }

        lastUpdate.set(i, currentTime);
        lastPositions.set(i, currentPos);
      }

      previousCount = pool.count;
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
      lastUpdate.clear();
      lastPositions.clear();
      previousCount = 0;
    },
  };
}
