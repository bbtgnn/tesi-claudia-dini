import type { Force } from "../../core";
import { flowField } from "./flow-field";
import type { FlowStyle } from "./flow-field";

type FlowFieldOptions = Parameters<typeof flowField>[0];

const merge = (
  base: FlowFieldOptions,
  overrides?: Partial<FlowFieldOptions>
): FlowFieldOptions => ({
  ...base,
  ...overrides,
  style: { ...base.style, ...overrides?.style },
});

/** Calm, smooth flow. Good default. */
export function calmFlow(opts?: Partial<FlowFieldOptions>): Force {
  return flowField(
    merge(
      {
        cellSize: 30,
        type: "calm",
        strength: 1,
        timeScale: 0.0005,
        updateEvery: 1,
      },
      opts
    )
  );
}

/** Chaotic, noisy flow. */
export function chaoticFlow(opts?: Partial<FlowFieldOptions>): Force {
  return flowField(
    merge(
      {
        cellSize: 30,
        type: "chaotic",
        strength: 1,
        timeScale: 0.0005,
        updateEvery: 1,
      },
      opts
    )
  );
}

/** Gentle waves, less swirl. */
export function wavyFlow(opts?: Partial<FlowFieldOptions>): Force {
  const style: FlowStyle = {
    waveDensity: 5,
    bendAmount: 0.3,
    patternZoom: 0.0015,
  };
  return flowField(
    merge(
      {
        cellSize: 30,
        type: "calm",
        strength: 1,
        timeScale: 0.0003,
        updateEvery: 1,
        style,
      },
      opts
    )
  );
}

/** Strong swirls, more twist. */
export function swirlFlow(opts?: Partial<FlowFieldOptions>): Force {
  const style: FlowStyle = {
    bendAmount: 0.85,
    bendSpeed: 0.15,
    patternZoom: 0.0025,
    mixPatchSize: 0.4,
  };
  return flowField(
    merge(
      {
        cellSize: 28,
        type: "calm",
        strength: 1,
        timeScale: 0.0005,
        updateEvery: 1,
        style,
      },
      opts
    )
  );
}

/** Slow, soft drift. Big gentle swirls, low waves. */
export function smokeFlow(opts?: Partial<FlowFieldOptions>): Force {
  const style: FlowStyle = {
    patternZoom: 0.0012,
    bendAmount: 0.45,
    bendSpeed: 0.06,
    waveDensity: 2,
    mixPatchSize: 0.6,
  };
  return flowField(
    merge(
      {
        cellSize: 32,
        type: "calm",
        strength: 0.85,
        timeScale: 0.0002,
        updateEvery: 1,
        style,
      },
      opts
    )
  );
}
