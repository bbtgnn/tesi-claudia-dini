/**
 * Context - Shared read-only state for the particle system
 * Provides global simulation information to forces and motion models
 */
export interface Context {
  readonly time: number;
  readonly deltaTime: number;
  readonly gravity: number;
  readonly bounds: {
    readonly width: number;
    readonly height: number;
  };
  readonly noise: {
    (x: number, y?: number, z?: number): number;
  };
}

export class SimulationContext implements Context {
  constructor(
    public readonly time: number,
    public readonly deltaTime: number,
    public readonly gravity: number,
    public readonly bounds: { readonly width: number; readonly height: number },
    public readonly noise: (x: number, y?: number, z?: number) => number
  ) {}
}
