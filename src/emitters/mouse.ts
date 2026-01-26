import { Particle } from "../core/Particle";
import type { MotionModel } from "../core/MotionModel";
import type Sketch from "p5";

/**
 * Emitter - Abstract concept for creating particles
 * Assigns initial state and motion model
 */
export interface Emitter {
  emit(p5: Sketch): Particle[];
}

/**
 * MouseEmitter - Creates particles at mouse position
 */
export class MouseEmitter implements Emitter {
  private x: number = 0;
  private y: number = 0;
  private particlesPerEmit: number = 3;
  private motionModelFactory: () => MotionModel;

  constructor(
    motionModelFactory: () => MotionModel,
    particlesPerEmit: number = 3
  ) {
    this.motionModelFactory = motionModelFactory;
    this.particlesPerEmit = particlesPerEmit;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  emit(p5: Sketch): Particle[] {
    const particles: Particle[] = [];

    for (let i = 0; i < this.particlesPerEmit; i++) {
      // Initial velocity - particles fall down with slight horizontal variation
      const velocity = {
        x: (Math.random() - 0.5) * 10, // Small horizontal drift
        y: Math.random() * 5, // Small downward velocity
      };

      const hue = (p5.frameCount * 2 + i * 60) % 360;
      const color = {
        r: p5.red(p5.color(hue, 80, 90)),
        g: p5.green(p5.color(hue, 80, 90)),
        b: p5.blue(p5.color(hue, 80, 90)),
        a: 200,
      };

      const motionModel = this.motionModelFactory();

      particles.push(
        new Particle({
          position: { x: this.x, y: this.y },
          velocity,
          color,
          motionModel,
          size: 3 + Math.random() * 2,
        })
      );
    }

    return particles;
  }
}
