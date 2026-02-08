import P5 from "p5";
import { Simulation, type Emitter, type Force } from "./core";
import {
  EmittedPixels,
  Forces,
  ImageEmitter,
  Frontiers,
  Trails,
} from "./extras";

//

const imageEmitter = new ImageEmitter({
  imageFile: "/images/image-full-size.png",
  polygonsFile: "images/image-full-size.svg",
  lifetime: 20,
  frontier: (width, height) =>
    Frontiers.circle({
      center: [width / 2, height / 2],
      speed: 5,
      gradientSize: 100,
    }),
  boundaryDistance: 100,
  scale: 4,
  loadPolygonsOptions: {
    convertPaths: true,
    pathSamplePoints: 100,
  },
});

const emitters: Emitter[] = [imageEmitter];

const forces: Force[] = [
  Forces.swirlFlow({
    type: "chaotic",
    updateEvery: 2, // regenerate flow every 2 frames to reduce CPU
    style: {
      patternZoom: 0.0001,
    },
  }),
  // Forces.wind(1, -1),
];

const emittedPixelsCollector = new EmittedPixels({
  maxLength: 10_000,
  fadeDuration: 0.5,
  draw: (_, pixel, opacity) => {
    _.noStroke();
    _.fill(0, 0, 0, opacity * 255);
    _.square(pixel.x, pixel.y, pixel.size);
  },
});

const trailsSystem = new Trails({ maxLength: 20, storeEveryNFrames: 5 });

const simulation = new Simulation({
  capacity: 10_000,
  emitters,
  forces,
  fixedDt: 1 / 10,
  maxHistory: 600,
  historyInterval: 10, // store every 10 steps to reduce GC stutter
  baseSeed: 0,
  extensions: [emittedPixelsCollector, trailsSystem],
});

const FRAME_STEP_SIZE = 5;

new P5((_) => {
  _.setup = async () => {
    await imageEmitter.init(_);

    _.createCanvas(imageEmitter.image.width, imageEmitter.image.height);
    _.frameRate(30);

    simulation.loadDependenciesFromP5(_);
  };

  _.draw = () => {
    _.image(imageEmitter.image, 0, 0);

    simulation.update();

    // emittedPixelsCollector.render(_);

    // Render trails (forEachTrail = zero allocation; avoid getTrails() in draw)
    trailsSystem.forEachTrail((particleIndex, xs, ys, len) => {
      const p = simulation.getParticle(particleIndex);
      _.strokeWeight(2);
      for (let i = 0; i < len - 1; i++) {
        const trailAlpha = (i / len) * p.a * 0.5;
        _.stroke(p.r, p.g, p.b, trailAlpha);
        _.line(xs[i], ys[i], xs[i + 1], ys[i + 1]);
      }
    });

    // Render particles (forEachParticle reads directly from pool, no copy)
    _.noStroke();
    simulation.forEachParticle((_i, x, y, size, r, g, b, a) => {
      _.fill(r, g, b, a);
      _.ellipse(x - size / 2, y - size / 2, size);
    });
  };

  _.keyPressed = () => {
    if (_.key === " ") {
      simulation.isPaused() ? simulation.play() : simulation.pause();
    } else if (_.key === "ArrowRight" && simulation.isPaused()) {
      simulation.stepForward(FRAME_STEP_SIZE);
    } else if (_.key === "ArrowLeft" && simulation.isPaused()) {
      simulation.stepBackward(FRAME_STEP_SIZE);
    }
  };
});
