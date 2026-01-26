import type P5 from "p5";
import type { NoiseFunction, Size } from "./types";

/**
 * Context - Shared read-only state for the particle system
 * Provides global simulation information to forces and motion models
 */
export interface Context {
  readonly time: number;
  readonly deltaTime: number;
  readonly gravity: number;
  readonly bounds: Size;
  readonly noise: NoiseFunction;
}

export class SimulationContext implements Context {
  #currentTime = 0;
  #deltaTime = 0;
  #gravity = 9.8;
  #bounds = { width: 0, height: 0 };
  #noise: NoiseFunction;

  constructor(p5: P5) {
    this.#currentTime = p5.millis() / 1000;
    this.#bounds = { width: p5.width, height: p5.height };
    this.#noise = p5.noise.bind(p5);
  }

  update(p5: P5): void {
    const currentTime = p5.millis() / 1000;
    this.#deltaTime = currentTime - this.#currentTime;
    this.#currentTime = currentTime;
    this.#bounds = { width: p5.width, height: p5.height };
  }

  get time(): number {
    return this.#currentTime;
  }

  get deltaTime(): number {
    return this.#deltaTime;
  }

  get gravity(): number {
    return this.#gravity;
  }

  get bounds(): Size {
    return this.#bounds;
  }

  get noise(): NoiseFunction {
    return this.#noise;
  }

  setGravity(gravity: number): void {
    this.#gravity = gravity;
  }
}
