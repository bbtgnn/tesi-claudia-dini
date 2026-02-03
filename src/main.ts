import P5 from "p5";
import { Engine, Emitter, Force } from "./core";
import { ImageEmitter } from "./image-emitter";
import testImagePath from "/images/prova.png?url";
import { FlowField, Trail } from "./extras";

//

new P5((_) => {
  let img: P5.Image;
  let imageEmitter: ImageEmitter.ImageEmitter | null = null;

  const emitters: Emitter.Emitter[] = [];
  const forces: Force.Force[] = [];

  // Create optional trail system
  const trailSystem = Trail.make({
    maxLength: 20,
    updateInterval: 0.016, // Update every ~16ms (60fps)
  });

  const engine = Engine.make({
    capacity: 10_000,
    emitters,
    forces,
    getTime: () => _.millis() / 1000,
    trailSystem, // Pass trail system (can be omitted to disable trails)
  });

  _.setup = async () => {
    img = await _.loadImage(testImagePath);
    img.resize(0, 400);
    img.loadPixels();

    forces.push(
      Force.gravity(0, -1),
      Force.wind(-1, 0),
      FlowField.make({
        width: img.width,
        height: img.height,
        cellSize: 30,
        strength: 1,
        timeScale: 0.0005,
        updateEvery: 1,
        noise: () => _.random(0, 1),
      })
    );

    imageEmitter = ImageEmitter.make({
      lifetime: 20,
      image: {
        width: img.width,
        height: img.height,
        pixels: img.pixels,
      },
      polygon: makePolygon(img),
      frontier: ImageEmitter.makeLineMovingUp({
        rowsPerStep: 0.25,
        activationDistance: 20,
      }),
      boundaryDistance: 20,
    });
    emitters.push(imageEmitter);

    _.createCanvas(img.width, img.height);
    _.frameRate(30);
  };

  _.draw = () => {
    _.background(20, 20, 30);
    _.image(img, 0, 0);

    Engine.update(engine);

    // Draw emitted pixels white
    if (imageEmitter) {
      const emittedPixels = imageEmitter.getEmittedPixels();
      _.fill(255, 255, 255);
      _.noStroke();
      for (const [x, y] of emittedPixels) {
        _.rect(x, y, 1, 1);
      }
    }

    _.noStroke();

    Engine.render(engine, (p) => {
      // Draw trail
      if (p.trail.length > 1) {
        _.strokeWeight(1);
        for (let i = 0; i < p.trail.length - 1; i++) {
          const [x1, y1] = p.trail[i];
          const [x2, y2] = p.trail[i + 1];
          // Fade trail from head to tail
          const alpha = (i / p.trail.length) * p.a * 0.5; // Trail is more transparent
          _.stroke(p.r, p.g, p.b, alpha);
          _.line(x1, y1, x2, y2);
        }
      }

      // Draw particle
      _.noStroke();
      _.fill(p.r, p.g, p.b, p.a);
      _.square(p.x - p.size / 2, p.y - p.size / 2, p.size);
    });
  };

  _.mouseClicked = () => {
    emitters.push(
      Emitter.makeSimple({
        position: [_.mouseX, _.mouseY],
        lifetime: 10,
      })
    );
  };
});

//

export function makePolygon(image: P5.Image): ImageEmitter.Polygon {
  const x = 0.2 * image.width;
  const y = 0.2 * image.height;
  const w = 0.3 * image.width;
  const h = 0.3 * image.height;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}
