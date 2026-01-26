import { Particle } from './Particle';
import type { MotionModel } from './MotionModel';
import type Sketch from 'p5';

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

  /**
   * Set emitter position
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  setPosition(x: number, y: number): void;

  /**
   * Set source (image or geometry)
   * @param source - Image or geometry data
   */
  setSource(source: any): void;
}

/**
 * CircularImageEmitter - Extracts particles from an image in a circular pattern
 */
export class CircularImageEmitter implements Emitter {
  private x: number = 0;
  private y: number = 0;
  private image: any = null; // p5.Image type
  private radius: number = 50;
  private particlesPerEmit: number = 5;
  private motionModelFactory: () => MotionModel;

  constructor(
    motionModelFactory: () => MotionModel,
    radius: number = 50,
    particlesPerEmit: number = 5
  ) {
    this.motionModelFactory = motionModelFactory;
    this.radius = radius;
    this.particlesPerEmit = particlesPerEmit;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setSource(source: any): void {
    if (source && typeof source === 'object' && 'width' in source && 'height' in source) {
      this.image = source;
    }
  }

  emit(p5: Sketch): Particle[] {
    const particles: Particle[] = [];

    for (let i = 0; i < this.particlesPerEmit; i++) {
      const angle = (Math.PI * 2 * i) / this.particlesPerEmit;
      const offsetX = Math.cos(angle) * (Math.random() * this.radius);
      const offsetY = Math.sin(angle) * (Math.random() * this.radius);

      const x = this.x + offsetX;
      const y = this.y + offsetY;

      // Sample color from image if available
      let color = { r: 255, g: 255, b: 255, a: 255 };
      if (this.image && this.image.width && this.image.height) {
        try {
          const imgX = Math.floor(
            Math.max(0, Math.min(((x / p5.width) * this.image.width), this.image.width - 1))
          );
          const imgY = Math.floor(
            Math.max(0, Math.min(((y / p5.height) * this.image.height), this.image.height - 1))
          );
          
          // Use image's get() method if available
          if (this.image && typeof this.image.get === 'function') {
            const pixel = this.image.get(imgX, imgY);
            if (pixel && Array.isArray(pixel) && pixel.length >= 3) {
              color = {
                r: pixel[0] || 255,
                g: pixel[1] || 255,
                b: pixel[2] || 255,
                a: (pixel[3] || 255)
              };
            }
          }
        } catch (e) {
          // Fallback to default color if image access fails
        }
      }

      // Initial velocity based on angle
      const speed = 50 + Math.random() * 50;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };

      const motionModel = this.motionModelFactory();
      const delay = Math.floor(Math.random() * 5);

      particles.push(
        new Particle(
          { x, y },
          velocity,
          color,
          motionModel,
          delay,
          2 + Math.random() * 3,
          Math.random()
        )
      );
    }

    return particles;
  }
}

/**
 * MouseEmitter - Creates particles at mouse position
 */
export class MouseEmitter implements Emitter {
  private x: number = 0;
  private y: number = 0;
  private particlesPerEmit: number = 3;
  private motionModelFactory: () => MotionModel;

  constructor(
    motionModelFactory: () => MotionModel,
    particlesPerEmit: number = 3
  ) {
    this.motionModelFactory = motionModelFactory;
    this.particlesPerEmit = particlesPerEmit;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setSource(_source: any): void {
    // Mouse emitter doesn't use image source
  }

  emit(p5: Sketch): Particle[] {
    const particles: Particle[] = [];

    for (let i = 0; i < this.particlesPerEmit; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 40;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };

      const hue = (p5.frameCount * 2 + i * 60) % 360;
      const color = {
        r: p5.red(p5.color(hue, 80, 90)),
        g: p5.green(p5.color(hue, 80, 90)),
        b: p5.blue(p5.color(hue, 80, 90)),
        a: 200
      };

      const motionModel = this.motionModelFactory();

      particles.push(
        new Particle(
          { x: this.x, y: this.y },
          velocity,
          color,
          motionModel,
          0,
          3 + Math.random() * 2,
          Math.random()
        )
      );
    }

    return particles;
  }
}

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
      const angle = (Math.PI * 2 * i) / this.particleCount;
      const speed = 100 + Math.random() * 50;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      };

      const hue = (i * 360) / this.particleCount;
      const color = {
        r: p5.red(p5.color(hue, 100, 80)),
        g: p5.green(p5.color(hue, 100, 80)),
        b: p5.blue(p5.color(hue, 100, 80)),
        a: 255
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
