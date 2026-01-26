import type { Particle } from './Particle';
import type Sketch from 'p5';

/**
 * Renderer - Visual representation of particles
 * Must NOT alter particle physics or depend on emitter/force logic
 */
export interface Renderer {
  /**
   * Render a single particle
   * @param particle - The particle to render
   * @param p5 - p5.js instance
   */
  render(particle: Particle, p5: Sketch): void;
}

/**
 * DefaultRenderer - Renders particles as colored circles
 * May use particle color, velocity magnitude, age, size
 */
export class DefaultRenderer implements Renderer {
  render(particle: Particle, p5: Sketch): void {
    if (!particle.isActive()) return;

    p5.push();
    p5.noStroke();
    p5.fill(
      particle.color.r,
      particle.color.g,
      particle.color.b,
      particle.color.a
    );

    // Optional: size based on velocity magnitude
    const velocityMag = Math.sqrt(
      particle.velocity.x ** 2 + particle.velocity.y ** 2
    );
    const size = particle.size * (1 + velocityMag * 0.1);

    p5.circle(particle.position.x, particle.position.y, size);
    p5.pop();
  }
}

/**
 * TrailRenderer - Renders particles with motion trails
 */
export class TrailRenderer implements Renderer {
  private readonly trailLength: number;

  constructor(trailLength: number = 10) {
    this.trailLength = trailLength;
  }

  render(particle: Particle, p5: Sketch): void {
    if (!particle.isActive()) return;

    // Simple trail effect using velocity
    const velocityMag = Math.sqrt(
      particle.velocity.x ** 2 + particle.velocity.y ** 2
    );
    const trailSize = particle.size * (1 + velocityMag * 0.05);

    p5.push();
    p5.noStroke();
    p5.fill(
      particle.color.r,
      particle.color.g,
      particle.color.b,
      particle.color.a * 0.5
    );
    p5.circle(particle.position.x, particle.position.y, trailSize);
    p5.pop();
  }
}
