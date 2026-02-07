import P5 from "p5";
import { Simulation, type Emitter, type Force } from "./core";
import { Trails, Forces, Emitters } from "./extras";

import testImagePath from "/images/prova.png?url";
import testSvgPath from "/images/prova.svg?url";

//

const imageEmitter = new Emitters.ImageEmitter({
  imageFile: testImagePath,
  polygonsFile: testSvgPath,
  lifetime: 20,
  frontier: (width, height) =>
    Emitters.makeLineFrontier({
      start: [width / 2, (height / 5) * 4],
      angle: 90,
      speed: 10,
      activationDistance: 50,
    }),
  boundaryDistance: 20,
  scale: 2,
  imageMaxHeight: 400,
  loadPolygonsOptions: {
    convertPaths: true,
    pathSamplePoints: 100,
  },
});

const emitters: Emitter[] = [imageEmitter];

const forces: Force[] = [
  Forces.flowField({
    cellSize: 30,
    strength: 1,
    timeScale: 0.0005,
    updateEvery: 1,
  }),
];

const FRAME_STEP_SIZE = 5;

const trailSystem = new Trails({ maxLength: 20 });

const simulation = new Simulation({
  capacity: 10_000,
  emitters,
  forces,
  fixedDt: 1 / 10,
  maxHistory: 600,
  baseSeed: 0,
  extensions: [trailSystem],
});

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

    // Draw emitted pixels white with fade-in
    const emittedPixels = imageEmitter.getEmittedPixels();
    for (const pixel of emittedPixels) {
      const timeSinceEmission = simulation.getTime() - pixel.emissionTime;
      const fadeDuration = 0.5;
      const a = Math.min(1, Math.max(0, timeSinceEmission / fadeDuration));
      _.fill(255, 255, 255, a * 255);
      _.rect(pixel.x, pixel.y, pixel.size);
    }

    // Render trails (host owns Trails; it's a playback participant for snapshot/restore)
    const trails = trailSystem.getTrails();
    for (const [particleIndex, trail] of trails) {
      const p = simulation.getParticle(particleIndex);
      _.strokeWeight(1);
      for (let i = 0; i < trail.length - 1; i++) {
        const [x1, y1] = trail[i];
        const [x2, y2] = trail[i + 1];
        const trailAlpha = (i / trail.length) * p.a * 0.5;
        _.stroke(p.r, p.g, p.b, trailAlpha);
        _.line(x1, y1, x2, y2);
      }
    }

    // Render particles
    _.noStroke();
    for (const p of simulation.getParticles()) {
      _.fill(p.r, p.g, p.b, p.a);
      _.square(p.x - p.size / 2, p.y - p.size / 2, p.size);
    }
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
