import { Simulation } from "./core";
import {
  EmittedPixels,
  Forces,
  Frontiers,
  ImageEmitter,
  Trails,
} from "./extras";
import { P5Renderer } from "./renderer";

//

const simulation = new Simulation({
  emitters: [
    new ImageEmitter({
      imageFile: "/images/image-full-size.png",
      polygonsFile: "images/image-full-size.svg",
      lifetime: 20,
      frontiers: [
        Frontiers.line({
          start: [1, 0],
          angle: 0,
          speed: 100,
          activationDistance: 100,
        }),
        // Frontiers.circle({
        //   center: [0.5, 0.5],
        //   speed: 5,
        //   gradientSize: 100,
        // }),
        // Frontiers.circle({
        //   center: [1, 0.5],
        //   speed: 5,
        //   gradientSize: 100,
        // }),
      ],
      boundaryDistance: 100,
      scale: 4,
      loadPolygonsOptions: {
        convertPaths: true,
        pathSamplePoints: 100,
      },
    }),
  ],

  forces: [
    Forces.Flows.swirl({
      type: "calm",
      updateEvery: 2,
      style: {
        patternZoom: 0.00001,
      },
    }),
  ],

  draw: (renderer, particle) => {
    renderer.noStroke();
    renderer.setFill(particle.r, particle.g, particle.b, particle.a);
    renderer.drawEllipse(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  },

  extensions: [
    new EmittedPixels({
      active: true,
      maxLength: 10_000,
      fadeDuration: 0.5,
      draw: (target, pixel, opacity) => {
        target.noStroke();
        target.setFill(0, 0, 0, opacity * 255);
        target.drawRect(pixel.x, pixel.y, pixel.size, pixel.size);
      },
    }),

    new Trails({
      active: true,
      maxLength: 20,
      storeEveryNFrames: 5,
      draw: (renderer, trail) => {
        const { xs, ys, len, particle: p } = trail;
        renderer.setStrokeWeight(2);
        for (let i = 0; i < len - 1; i++) {
          const trailAlpha = (i / len) * p.a * 0.5;
          renderer.setStroke(p.r, p.g, p.b, trailAlpha);
          renderer.drawLine(xs[i], ys[i], xs[i + 1], ys[i + 1]);
        }
      },
    }),
  ],

  // Impostazioni di sistema
  capacity: 10_000,
  renderer: new P5Renderer({ frameRate: 30 }),
  speed: 2,
  maxHistory: 600,
  historyInterval: 10,
  baseSeed: 0,
  frameStepSize: 5,
});

simulation.run();
