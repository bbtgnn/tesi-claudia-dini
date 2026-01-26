import type { Particle } from './Particle';
import type { Context } from './Context';

/**
 * Force - Atomic behavior unit
 * Modifies particle acceleration or velocity
 * Forces are additive and order-independent (ideally)
 */
export interface Force {
  /**
   * Apply this force to a particle
   * @param particle - The particle to affect
   * @param context - Global simulation context
   */
  apply(particle: Particle, context: Context): void;
}

/**
 * GravityForce - Applies constant downward acceleration
 */
export class GravityForce implements Force {
  constructor(private readonly strength: number = 1.0) {}

  apply(particle: Particle, context: Context): void {
    particle.velocity.y += context.gravity * this.strength * context.deltaTime;
  }
}

/**
 * DragForce - Applies velocity-dependent resistance
 */
export class DragForce implements Force {
  constructor(private readonly coefficient: number = 0.95) {}

  apply(particle: Particle, context: Context): void {
    particle.velocity.x *= this.coefficient;
    particle.velocity.y *= this.coefficient;
  }
}

/**
 * TurbulenceForce - Applies noise-based random acceleration
 */
export class TurbulenceForce implements Force {
  constructor(
    private readonly strength: number = 1.0,
    private readonly frequency: number = 0.1
  ) {}

  apply(particle: Particle, context: Context): void {
    const noiseX = context.noise(
      particle.position.x * this.frequency,
      particle.position.y * this.frequency,
      context.time * this.frequency
    );
    const noiseY = context.noise(
      particle.position.x * this.frequency + 1000,
      particle.position.y * this.frequency + 1000,
      context.time * this.frequency
    );

    // Map noise from [0, 1] to [-1, 1]
    const forceX = (noiseX - 0.5) * 2 * this.strength;
    const forceY = (noiseY - 0.5) * 2 * this.strength;

    particle.velocity.x += forceX * context.deltaTime;
    particle.velocity.y += forceY * context.deltaTime;
  }
}

/**
 * FlowFieldForce - Applies directional flow based on position
 */
export class FlowFieldForce implements Force {
  constructor(
    private readonly strength: number = 1.0,
    private readonly scale: number = 0.01
  ) {}

  apply(particle: Particle, context: Context): void {
    const angle = context.noise(
      particle.position.x * this.scale,
      particle.position.y * this.scale,
      context.time * 0.1
    ) * Math.PI * 2;

    const forceX = Math.cos(angle) * this.strength;
    const forceY = Math.sin(angle) * this.strength;

    particle.velocity.x += forceX * context.deltaTime;
    particle.velocity.y += forceY * context.deltaTime;
  }
}

/**
 * ImpulseForce - Applies time-based impulse (spike in acceleration)
 */
export class ImpulseForce implements Force {
  constructor(
    private readonly strength: number = 1.0,
    private readonly frequency: number = 1.0,
    private readonly seed: number = 0
  ) {}

  apply(particle: Particle, context: Context): void {
    const phase = (context.time * this.frequency + particle.seed + this.seed) % 1;
    const impulse = Math.sin(phase * Math.PI * 2) * this.strength;

    const angle = context.noise(particle.seed, context.time * 0.1) * Math.PI * 2;
    particle.velocity.x += Math.cos(angle) * impulse * context.deltaTime;
    particle.velocity.y += Math.sin(angle) * impulse * context.deltaTime;
  }
}
