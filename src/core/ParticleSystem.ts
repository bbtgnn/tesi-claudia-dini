import type { Particle } from "./Particle";
import type { Renderer } from "./Renderer";
import { SimulationContext } from "./Context";
import type Sketch from "p5";

/**
 * ParticleSystem (or World) - Owns all particles, coordinates update + render passes
 */
export class ParticleSystem {
  private context: SimulationContext;
  private renderer: Renderer;
  private particles: Particle[] = [];

  constructor(context: SimulationContext, renderer: Renderer) {
    this.context = context;
    this.renderer = renderer;
  }

  update(p5: Sketch): void {
    this.context.update(p5);

    for (const particle of this.particles) {
      this.handleDelayedActivation(particle);
      if (!particle.isActive()) continue;

      particle.motionModel.update(particle, this.context);

      if (this.isParticleOutOfBounds(particle)) {
        particle.active = false;
      }
    }

    this.particles = this.particles.filter((p) => {
      return p.isActive() || !this.isParticleOutOfBounds(p);
    });
  }

  render(p5: Sketch): void {
    for (const particle of this.particles) {
      this.renderer.render(particle, p5);
    }
  }

  addParticles(particles: Particle[]): void {
    this.particles.push(...particles);
  }

  clearParticles(): void {
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  //

  private handleDelayedActivation(particle: Particle): void {
    if (particle.delay > 0) {
      particle.delay--;
      if (particle.delay === 0) {
        particle.activate();
      }
    }
  }

  private OUT_OF_BOUNDS_MARGIN = 100;

  private isParticleOutOfBounds(particle: Particle): boolean {
    return (
      particle.position.x < -this.OUT_OF_BOUNDS_MARGIN ||
      particle.position.x >
        this.context.bounds.width + this.OUT_OF_BOUNDS_MARGIN ||
      particle.position.y < -this.OUT_OF_BOUNDS_MARGIN ||
      particle.position.y >
        this.context.bounds.height + this.OUT_OF_BOUNDS_MARGIN
    );
  }
}
