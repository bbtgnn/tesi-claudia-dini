/**
 * Erosion / burning activation: frontier-based wave propagation.
 * Multiple seeds expand independently; activation is deterministic.
 */

import type { BurnSeed } from "./types.js";
import type { ImageSystem } from "./image.js";
import { pixelIndex } from "./image.js";

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

interface SeedState {
  seed: BurnSeed;
  frontier: Uint32Array;
  n: number;
}

export interface ActivationRunner {
  /** Run one step; returns indices to emit from and their count. */
  step(image: ImageSystem): { indices: Uint32Array; count: number };
}

/**
 * Create activation runner with given seeds.
 * Each seed's center becomes the initial frontier.
 * No per-frame allocations.
 */
export function createActivation(
  width: number,
  height: number,
  seeds: BurnSeed[]
): ActivationRunner {
  const n = width * height;
  const activated = new Uint32Array(n);
  const inActivatedThisFrame = new Uint8Array(n);
  const nextFrontier = new Uint32Array(n);
  const inNext = new Uint8Array(n);

  const seedStates: SeedState[] = seeds.map((seed) => {
    const cx = (seed.centerX | 0);
    const cy = (seed.centerY | 0);
    const frontier = new Uint32Array(n);
    let count = 0;
    if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
      frontier[0] = pixelIndex(cx, cy, width);
      count = 1;
    }
    return { seed, frontier, n: count };
  });

  function step(image: ImageSystem): { indices: Uint32Array; count: number } {
    let activatedCount = 0;
    inActivatedThisFrame.fill(0);

    for (const ss of seedStates) {
      inNext.fill(0);
      let nextN = 0;

      for (let i = 0; i < ss.n; i++) {
        const idx = ss.frontier[i]!;
        const x = idx % width;
        const y = (idx / width) | 0;

        if (inActivatedThisFrame[idx]! === 0) {
          inActivatedThisFrame[idx] = 1;
          activated[activatedCount++] = idx;
        }

        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d]!;
          const ny = y + DY[d]!;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nidx = pixelIndex(nx, ny, width);
          if (!image.isAvailable(nidx)) continue;
          if (inNext[nidx]!) continue;
          inNext[nidx] = 1;
          nextFrontier[nextN++] = nidx;
        }
      }

      ss.frontier.set(nextFrontier.subarray(0, nextN));
      ss.n = nextN;
    }

    return { indices: activated, count: activatedCount };
  }

  return { step };
}
