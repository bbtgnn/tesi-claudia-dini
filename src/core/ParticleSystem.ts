import type { Particle } from './Particle';
import type { Context } from './Context';
import type { Renderer } from './Renderer';
import { SimulationContext } from './Context';
import type Sketch from 'p5';

/**
 * ParticleSystem (or World) - Owns all particles, coordinates update + render passes
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private renderer: Renderer;
  private time: number = 0;
  private lastFrameTime: number = 0;
  private gravity: number = 9.8;
  private bounds: { width: number; height: number } = { width: 0, height: 0 };

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  /**
   * Update all particles
   * Delegates motion update to each particle's motion model
   */
  update(p5: Sketch): void {
    const currentTime = p5.millis() / 1000;
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.time = currentTime;

    // Update bounds
    this.bounds = { width: p5.width, height: p5.height };

    // Create context
    const context = new SimulationContext(
      this.time,
      deltaTime,
      this.gravity,
      this.bounds,
      p5.noise.bind(p5)
    );

    // Update particles
    for (const particle of this.particles) {
      // Handle delay
      if (particle.delay > 0) {
        particle.delay--;
        if (particle.delay === 0) {
          particle.activate();
        }
        continue;
      }

      // Skip inactive particles
      if (!particle.isActive()) continue;

      // Delegate motion update to particle's motion model
      particle.motionModel.update(particle, context);

      // Remove particles that are out of bounds (optional cleanup)
      if (
        particle.position.x < -100 ||
        particle.position.x > this.bounds.width + 100 ||
        particle.position.y < -100 ||
        particle.position.y > this.bounds.height + 100
      ) {
        // Mark for removal (we'll filter later)
        particle.active = false;
      }
    }

    // Remove inactive particles that are out of bounds
    this.particles = this.particles.filter((p) => {
      if (!p.isActive()) {
        const outOfBounds =
          p.position.x < -100 ||
          p.position.x > this.bounds.width + 100 ||
          p.position.y < -100 ||
          p.position.y > this.bounds.height + 100;
        return !outOfBounds;
      }
      return true;
    });
  }

  /**
   * Render all particles
   * Delegates drawing to renderer
   */
  render(p5: Sketch): void {
    for (const particle of this.particles) {
      this.renderer.render(particle, p5);
    }
  }

  /**
   * Add particles to the system
   */
  addParticles(particles: Particle[]): void {
    this.particles.push(...particles);
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }

  /**
   * Get current particle count
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Set gravity constant
   */
  setGravity(gravity: number): void {
    this.gravity = gravity;
  }
}
