import { Particle } from "./Particle";
import type Sketch from "p5";

/**
 * Emitter - Abstract concept for creating particles
 * Assigns initial state and motion model
 */
export interface Emitter {
  /**
   * Create and return new particles
   * @param p5 - p5.js instance (for accessing image data, etc.)
   * @returns Array of new particles
   */
  emit(p5: Sketch): Particle[];
}
