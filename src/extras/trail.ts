import type { ParticlePool } from "../core/particle-pool";
import type { StepResult, Vec2 } from "../core/types";

//

interface Config {
  maxLength: number;
}

export class Trails {
  private readonly maxLength: number;
  private readonly trails = new Map<number, Vec2[]>();

  constructor(config: Config) {
    this.maxLength = config.maxLength;
  }

  update(pool: ParticlePool, stepResult: StepResult): void {
    for (const [from, to] of stepResult.swaps) {
      const trail = this.trails.get(from);
      if (trail !== undefined) {
        this.trails.set(to, trail);
        this.trails.delete(from);
      } else {
        this.trails.delete(to);
      }
    }

    for (let i = 0; i < pool.count; i++) {
      const pos: Vec2 = [pool.px[i], pool.py[i]];
      let trail = this.trails.get(i);
      if (!trail) {
        trail = [];
        this.trails.set(i, trail);
      }
      trail.push(pos);
      if (trail.length > this.maxLength) {
        trail.shift();
      }
    }
  }

  render(renderer: (trail: Vec2[], particleIndex: number) => void): void {
    for (const [particleIndex, trail] of this.trails) {
      if (trail.length > 1) {
        renderer(trail, particleIndex);
      }
    }
  }
}
