import Sketch from "p5";

new Sketch((p5) => {
  p5.setup = () => {
    p5.createCanvas(400, 400);
  };

  p5.draw = () => {
    p5.background(220);
  };
});
