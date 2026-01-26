import type { Particle } from "./Particle";
import type { Context } from "./Context";
import type { Force } from "./Force";
import {
  GravityForce,
  DragForce,
  TurbulenceForce,
  FlowFieldForce,
  ImpulseForce,
} from "./Force";

/**
 * MotionModel - Pluggable, immutable per particle
 * Updates a particle's motion every frame by applying forces
 */
export interface MotionModel {
  /**
   * Update particle motion by applying forces
   * @param particle - The particle to update
   * @param context - Global simulation context
   */
  update(particle: Particle, context: Context): void;

  /**
   * Get the forces that compose this motion model
   * @returns Array of forces
   */
  getForces(): Force[];
}

/**
 * Base implementation that applies a list of forces
 */
export class MotionModel implements MotionModel {
  protected forces: Force[];

  constructor(forces: Force[] = []) {
    this.forces = forces;
  }

  update(particle: Particle, context: Context): void {
    // Apply all forces additively
    for (const force of this.forces) {
      force.apply(particle, context);
    }

    // Update position based on velocity
    particle.position.x += particle.velocity.x * context.deltaTime;
    particle.position.y += particle.velocity.y * context.deltaTime;
  }

  getForces(): Force[] {
    return [...this.forces];
  }
}

/**
 * LiquidMotionModel - Softened gravity, viscous drag, low-frequency flow field
 * Strong velocity continuity, minimal randomness after birth
 */
export class LiquidMotionModel extends MotionModel {
  constructor() {
    super([
      new GravityForce(1), // Softened gravity
      new DragForce(0.98), // Viscous drag
      new FlowFieldForce(0.5, 0.005), // Low-frequency flow
    ]);
  }
}

/**
 * DustMotionModel - Weak gravity, strong drag, high-frequency turbulence
 * Fragile motion, constant micro-variation
 */
export class DustMotionModel extends MotionModel {
  constructor() {
    super([
      new GravityForce(1), // Weak gravity
      new DragForce(0.92), // Strong drag
      new TurbulenceForce(2.0, 0.2), // High-frequency turbulence
    ]);
  }
}

/**
 * ChaosMotionModel - Optional gravity, noise-driven impulses, time-based instability
 * Unpredictable acceleration, occasional energy spikes
 */
export class ChaosMotionModel extends MotionModel {
  constructor() {
    super([
      new GravityForce(0.2), // Optional gravity
      new ImpulseForce(5.0, 2.0), // Noise-driven impulses
      new TurbulenceForce(3.0, 0.15), // Time-based instability
    ]);
  }
}
