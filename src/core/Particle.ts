import type { MotionModel } from './MotionModel';

/**
 * Particle - Data-only object
 * Stores mutable state but knows nothing about how it moves or why
 */
export class Particle {
  public position: { x: number; y: number };
  public velocity: { x: number; y: number };
  public color: { r: number; g: number; b: number; a: number };
  public active: boolean;
  public delay: number;
  public size: number;
  public seed: number;
  public readonly motionModel: MotionModel;

  constructor(
    position: { x: number; y: number },
    velocity: { x: number; y: number },
    color: { r: number; g: number; b: number; a: number },
    motionModel: MotionModel,
    delay: number = 0,
    size: number = 1,
    seed: number = Math.random()
  ) {
    this.position = position;
    this.velocity = velocity;
    this.color = color;
    this.motionModel = motionModel; // Immutable reference
    this.active = delay === 0;
    this.delay = delay;
    this.size = size;
    this.seed = seed;
  }

  /**
   * Activate the particle (called when delay reaches zero)
   */
  activate(): void {
    this.active = true;
  }

  /**
   * Check if particle is active
   */
  isActive(): boolean {
    return this.active;
  }
}
