import {
  Simulation,
  type Emitter,
  type Force,
  type ParticleDrawItem,
} from "./core";
import {
  EmittedPixels,
  Forces,
  Frontiers,
  ImageEmitter,
  Trails,
  type TrailDrawItem,
} from "./extras";
import { P5Renderer } from "./renderer";

//

const imageEmitter = new ImageEmitter({
  imageFile: "/images/image-full-size.png",
  polygonsFile: "images/image-full-size.svg",
  lifetime: 20,
  frontiers: [
    Frontiers.circle({
      center: [0.5, 0.5],
      speed: 5,
      gradientSize: 100,
    }),
    Frontiers.circle({
      center: [1, 0.5],
      speed: 5,
      gradientSize: 100,
    }),
  ],
  boundaryDistance: 100,
  scale: 4,
  loadPolygonsOptions: {
    convertPaths: true,
    pathSamplePoints: 100,
  },
});

const emitters: Emitter[] = [imageEmitter];

const forces: Force[] = [
  Forces.Flows.swirl({
    type: "chaotic",
    updateEvery: 2,
    style: {
      patternZoom: 0.0001,
    },
  }),
];

const emittedPixelsCollector = new EmittedPixels({
  maxLength: 10_000,
  fadeDuration: 0.5,
  draw: (target, pixel, opacity) => {
    target.noStroke();
    target.setFill(0, 0, 0, opacity * 255);
    target.drawRect(pixel.x, pixel.y, pixel.size, pixel.size);
  },
  active: true,
});

const trailsSystem = new Trails({
  maxLength: 20,
  storeEveryNFrames: 5,
  active: true,
  draw: (renderer, trail: TrailDrawItem) => {
    const { xs, ys, len, particle: p } = trail;
    renderer.setStrokeWeight(2);
    for (let i = 0; i < len - 1; i++) {
      const trailAlpha = (i / len) * p.a * 0.5;
      renderer.setStroke(p.r, p.g, p.b, trailAlpha);
      renderer.drawLine(xs[i], ys[i], xs[i + 1], ys[i + 1]);
    }
  },
});

const simulation = new Simulation({
  capacity: 10_000,
  emitters,
  forces,
  fixedDt: 1 / 10,
  maxHistory: 600,
  historyInterval: 10,
  baseSeed: 0,
  frameStepSize: 5,
  extensions: [emittedPixelsCollector, trailsSystem],
  draw: (renderer, particle: ParticleDrawItem) => {
    renderer.noStroke();
    renderer.setFill(particle.r, particle.g, particle.b, particle.a);
    renderer.drawEllipse(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  },
});

const renderer = new P5Renderer({ frameRate: 30 });

simulation.addRenderer(renderer, {
  async setup(renderer, sim) {
    await imageEmitter.init(renderer);
    renderer.createCanvas(imageEmitter.image.width, imageEmitter.image.height);
    sim.setBounds(renderer.getBounds());
    sim.setRng(renderer.createRng(sim.baseSeed));
  },
  background: (renderer) => renderer.drawImage(imageEmitter.image, 0, 0),
});

simulation.run();
