import type { MotionModel } from "./MotionModel";
import type { Color, Vector } from "./types";

//

interface ParticleInput {
  position: Vector;
  velocity: Vector;
  color: Color;
  readonly motionModel: MotionModel;
  active?: boolean;
  delay?: number;
  size?: number;
  seed?: number;
}

/**
 * Particle - Data-only object
 * Stores mutable state but knows nothing about how it moves or why
 */
export class Particle {
  public position: Vector;
  public velocity: Vector;
  public color: Color;
  public active: boolean;
  public delay: number;
  public size: number;
  public seed: number;
  public readonly motionModel: MotionModel;

  constructor(props: ParticleInput) {
    this.position = props.position;
    this.velocity = props.velocity;
    this.color = props.color;
    this.motionModel = props.motionModel;
    this.delay = props.delay ?? 0;
    this.size = props.size ?? 1;
    this.seed = props.seed ?? Math.random();
    this.active = this.delay === 0;
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
