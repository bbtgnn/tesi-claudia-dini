import Sketch from "p5";
import {
  ParticleSystem,
  DefaultRenderer,
  SimulationContext,
  type Renderer,
  LiquidMotionModel,
  DustMotionModel,
} from "./core";
import { MouseEmitter } from "./emitters/mouse";

//

new Sketch((p5) => {
  let context: SimulationContext;
  let renderer: Renderer;
  let particleSystem: ParticleSystem;
  let mouseEmitter: MouseEmitter;

  p5.setup = async () => {
    p5.createCanvas(800, 600);
    p5.colorMode(p5.RGB, 255, 255, 255, 255);

    context = new SimulationContext(p5);
    renderer = new DefaultRenderer();
    particleSystem = new ParticleSystem(context, renderer);
    mouseEmitter = new MouseEmitter(() => new DustMotionModel(), 5);

    // image = await p5.loadImage(
    //   "https://plus.unsplash.com/premium_photo-1671656349322-41de944d259b?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    // );
    // if (image) {
    //   gridNoiseEmitter.setSource(image);
    // }
  };

  p5.draw = () => {
    p5.background(20, 20, 30, 30);

    // // Draw image behind everything
    // if (image) {
    //   p5.push();
    //   p5.imageMode(p5.CORNER);
    //   // Scale image to fit canvas while maintaining aspect ratio
    //   const scale = Math.min(p5.width / image.width, p5.height / image.height);
    //   const scaledWidth = image.width * scale;
    //   const scaledHeight = image.height * scale;
    //   const x = (p5.width - scaledWidth) / 2;
    //   const y = (p5.height - scaledHeight) / 2;
    //   p5.image(image, x, y, scaledWidth, scaledHeight);
    //   p5.pop();
    // }
    // // Emit particles from grid noise emitter (continuous)
    // if (image) {
    //   const gridParticles = gridNoiseEmitter.emit(p5);
    //   particleSystem.addParticles(gridParticles);
    // }

    if (p5.mouseIsPressed) {
      mouseEmitter.setPosition(p5.mouseX, p5.mouseY);
      particleSystem.addParticles(mouseEmitter.emit(p5));
    }

    particleSystem.update(p5);
    particleSystem.render(p5);

    // Display info
    p5.push();
    p5.fill(255, 255, 255, 200);
    p5.textSize(14);
    p5.text(`Particles: ${particleSystem.getParticleCount()}`, 10, 20);
    // p5.text(`Motion: ${currentMotionModel}`, 10, 40);
    p5.text("Press 1/2/3 to switch motion models", 10, 60);
    p5.text("Click and drag to emit particles", 10, 80);
    p5.text("Grid noise emitter active", 10, 100);
    p5.pop();
  };

  p5.keyPressed = () => {
    if (p5.key === "c" || p5.key === "C") {
      particleSystem.clearParticles();
    }
  };
});
