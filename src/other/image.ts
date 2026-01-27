/**
 * Image system: color buffer + pixel state buffer.
 * Pixel state is authoritative; color is visual only.
 */

import type { RGBA } from "./types.js";
import { PixelState } from "./types.js";

const BLACK: RGBA = [0, 0, 0, 1];

/** Linear index: pixelIndex = x + y * imageWidth. */
export function pixelIndex(x: number, y: number, width: number): number {
  return (x | 0) + (y | 0) * width;
}

/** Decode linear index to (x, y). */
export function pixelCoords(index: number, width: number): { x: number; y: number } {
  const x = index % width;
  const y = (index / width) | 0;
  return { x, y };
}

export interface ImageSystem {
  readonly width: number;
  readonly height: number;
  readonly color: Float32Array;   // RGBA flat: [r,g,b,a, r,g,b,a, ...]
  readonly state: Uint8Array;    // PixelState per pixel
  getColor(index: number): RGBA;
  setColor(index: number, rgba: RGBA): void;
  getState(index: number): PixelState;
  setState(index: number, s: PixelState): void;
  blacken(index: number): void;
  isAvailable(index: number): boolean;
  consume(index: number): void;
}

/**
 * Create image system from RGBA source.
 * color: flat [r,g,b,a,...] in [0,1], length = width*height*4.
 * All pixels start as Available.
 */
export function createImageSystem(
  width: number,
  height: number,
  colorSource: Float32Array | number[]
): ImageSystem {
  const n = width * height;
  const color = new Float32Array(n * 4);
  const state = new Uint8Array(n);

  const src = colorSource instanceof Float32Array ? colorSource : new Float32Array(colorSource);
  const len = Math.min(src.length, color.length);
  color.set(src.subarray(0, len));

  function getColor(index: number): RGBA {
    const i = index * 4;
    return [color[i]!, color[i + 1]!, color[i + 2]!, color[i + 3]!];
  }

  function setColor(index: number, rgba: RGBA): void {
    const i = index * 4;
    color[i]! = rgba[0];
    color[i + 1]! = rgba[1];
    color[i + 2]! = rgba[2];
    color[i + 3]! = rgba[3];
  }

  function getState(index: number): PixelState {
    return state[index]! as PixelState;
  }

  function setState(index: number, s: PixelState): void {
    state[index] = s;
  }

  function blacken(index: number): void {
    setColor(index, BLACK);
  }

  function isAvailable(index: number): boolean {
    return getState(index) === PixelState.Available;
  }

  function consume(index: number): void {
    setState(index, PixelState.Consumed);
    blacken(index);
  }

  return {
    width,
    height,
    color,
    state,
    getColor,
    setColor,
    getState,
    setState,
    blacken,
    isAvailable,
    consume,
  };
}
