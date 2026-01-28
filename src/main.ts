import P5 from "p5";
import { Engine, Emitter, Force } from "./core";
import { ImageEmitter } from "./image-emitter";
import testImagePath from "/images/prova.png?url";

//

new P5((_) => {
  let img: P5.Image;

  const emitters: Emitter.Emitter[] = [];

  const engine = Engine.make({
    capacity: 10_000,
    emitters,
    getTime: () => _.millis() / 1000,
    forces: [
      Force.turbulence(100, () => _.random(0, 1)),
      Force.drag(0.1),
      Force.gravity(0, 9.8),
      // Force.wind(20, 0),
      // Force.vortex(50, 50, 10),
    ],
  });

  _.setup = async () => {
    img = await _.loadImage(testImagePath);
    img.resize(0, 400);
    img.loadPixels();

    emitters.push(
      ImageEmitter.make({
        lifetime: 20,
        image: {
          width: img.width,
          height: img.height,
          pixels: img.pixels,
        },
        polygon: makePolygon(img),
      })
    );

    _.createCanvas(img.width, img.height);
    _.frameRate(30);
  };

  _.draw = () => {
    _.background(20, 20, 30);
    _.image(img, 0, 0);

    Engine.update(engine);

    _.noStroke();

    Engine.render(engine, (p) => {
      _.fill(p.r, p.g, p.b, p.a);
      _.square(p.x - p.size / 2, p.y - p.size / 2, p.size);
    });
  };

  _.mouseClicked = () => {
    emitters.push(
      Emitter.makeSimple({
        position: [_.mouseX, _.mouseY],
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
