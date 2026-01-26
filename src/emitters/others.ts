/**
 * BurstEmitter - Creates a burst of particles in all directions
 */
export class BurstEmitter implements Emitter {
  private x: number = 0;
  private y: number = 0;
  private particleCount: number = 20;
  private motionModelFactory: () => MotionModel;

  constructor(
    motionModelFactory: () => MotionModel,
    particleCount: number = 20
  ) {
    this.motionModelFactory = motionModelFactory;
    this.particleCount = particleCount;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setSource(_source: any): void {
    // Burst emitter doesn't use image source
  }

  emit(p5: Sketch): Particle[] {
    const particles: Particle[] = [];

    for (let i = 0; i < this.particleCount; i++) {
      // Initial velocity - particles fall down with slight horizontal variation
      const velocity = {
        x: (Math.random() - 0.5) * 10, // Small horizontal drift
        y: Math.random() * 5, // Small downward velocity
      };

      const hue = (i * 360) / this.particleCount;
      const color = {
        r: p5.red(p5.color(hue, 100, 80)),
        g: p5.green(p5.color(hue, 100, 80)),
        b: p5.blue(p5.color(hue, 100, 80)),
        a: 255,
      };

      const motionModel = this.motionModelFactory();

      particles.push(
        new Particle(
          { x: this.x, y: this.y },
          velocity,
          color,
          motionModel,
          0,
          4 + Math.random() * 3,
          Math.random()
        )
      );
    }

    return particles;
  }
}

/**
 * GridNoiseEmitter - Grid-based emitter using noise to determine emission locations
 * Uses image as source, overlays a grid, and emits from cells where noise > 0.7
 */
export class GridNoiseEmitter implements Emitter {
  private image: Sketch.Image | null = null;
  private gridWidth: number = 20;
  private gridHeight: number = 20;
  private cellWidth: number = 0;
  private cellHeight: number = 0;
  private motionModelFactory: () => MotionModel;
  private particlesPerCell: number = 1;
  private noiseScale: number = 0.1;
  private noiseTimeScale: number = 0.05;
  private threshold: number = 0.7;

  // Grid cell state: [noiseValue, isEmitting]
  private gridCells: Map<string, { noise: number; emitting: boolean }> =
    new Map();

  constructor(
    motionModelFactory: () => MotionModel,
    gridWidth: number = 20,
    gridHeight: number = 20,
    particlesPerCell: number = 1,
    noiseScale: number = 0.1,
    noiseTimeScale: number = 0.05
  ) {
    this.motionModelFactory = motionModelFactory;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.particlesPerCell = particlesPerCell;
    this.noiseScale = noiseScale;
    this.noiseTimeScale = noiseTimeScale;
  }

  setPosition(_x: number, _y: number): void {
    // Grid emitter doesn't use a single position
  }

  setSource(source: Sketch.Image): void {
    this.image = source;
  }

  /**
   * Get grid cell key from grid coordinates
   */
  private getCellKey(gridX: number, gridY: number): string {
    return `${gridX},${gridY}`;
  }

  /**
   * Update noise values for all grid cells
   */
  private updateGridNoise(p5: Sketch): void {
    // Use absolute time from p5.millis() for smooth noise animation
    const time = p5.millis() / 1000;

    if (!this.image) {
      this.cellWidth = p5.width / this.gridWidth;
      this.cellHeight = p5.height / this.gridHeight;
    } else {
      this.cellWidth = this.image.width / this.gridWidth;
      this.cellHeight = this.image.height / this.gridHeight;
    }

    for (let gridY = 0; gridY < this.gridHeight; gridY++) {
      for (let gridX = 0; gridX < this.gridWidth; gridX++) {
        const key = this.getCellKey(gridX, gridY);

        // Calculate noise value (smoothly changing over time)
        const noiseX = gridX * this.noiseScale;
        const noiseY = gridY * this.noiseScale;
        const noiseZ = time * this.noiseTimeScale;
        const noiseValue = p5.noise(noiseX, noiseY, noiseZ);

        // Get or create cell state
        const cell = this.gridCells.get(key) || { noise: 0, emitting: false };
        cell.noise = noiseValue;

        // Update emitting state
        cell.emitting = noiseValue > this.threshold;

        // Store cell state
        this.gridCells.set(key, cell);
      }
    }
  }

  emit(p5: Sketch): Particle[] {
    const particles: Particle[] = [];

    // Update grid noise values
    this.updateGridNoise(p5);

    // Emit particles from eligible cells
    for (let gridY = 0; gridY < this.gridHeight; gridY++) {
      for (let gridX = 0; gridX < this.gridWidth; gridX++) {
        const key = this.getCellKey(gridX, gridY);
        const cell = this.gridCells.get(key);

        if (!cell || !cell.emitting) continue;

        // Calculate cell center position
        const cellCenterX = (gridX + 0.5) * this.cellWidth;
        const cellCenterY = (gridY + 0.5) * this.cellHeight;

        // Map to canvas coordinates if using image
        const canvasX = this.image
          ? (cellCenterX / this.image.width) * p5.width
          : cellCenterX;
        const canvasY = this.image
          ? (cellCenterY / this.image.height) * p5.height
          : cellCenterY;

        // Emit particles from this cell
        for (let i = 0; i < this.particlesPerCell; i++) {
          // Random position within cell
          const offsetX = (Math.random() - 0.5) * this.cellWidth * 0.8;
          const offsetY = (Math.random() - 0.5) * this.cellHeight * 0.8;
          const x = canvasX + offsetX;
          const y = canvasY + offsetY;

          // Sample color from image if available
          let color = { r: 255, g: 255, b: 255, a: 255 };
          if (this.image) {
            try {
              const imgX = Math.floor(
                Math.max(0, Math.min(cellCenterX, this.image.width - 1))
              );
              const imgY = Math.floor(
                Math.max(0, Math.min(cellCenterY, this.image.height - 1))
              );

              const pixel = this.image.get(imgX, imgY);
              if (pixel && Array.isArray(pixel) && pixel.length >= 3) {
                color = {
                  r: pixel[0] || 255,
                  g: pixel[1] || 255,
                  b: pixel[2] || 255,
                  a: pixel[3] || 255,
                };
              }
            } catch (e) {
              // Fallback to default color
            }
          } else {
            // Use noise value to create color variation
            const hue = (cell.noise * 360) % 360;
            color = {
              r: p5.red(p5.color(hue, 80, 90)),
              g: p5.green(p5.color(hue, 80, 90)),
              b: p5.blue(p5.color(hue, 80, 90)),
              a: 200,
            };
          }

          // Initial velocity - particles fall down with slight horizontal variation
          const velocity = {
            x: (Math.random() - 0.5) * 10, // Small horizontal drift
            y: Math.random() * 5, // Small downward velocity
          };

          const motionModel = this.motionModelFactory();

          particles.push(
            new Particle(
              { x, y },
              velocity,
              color,
              motionModel,
              0,
              2 + Math.random() * 2,
              Math.random()
            )
          );
        }
      }
    }

    return particles;
  }
}
