<script lang="ts" module>
	export const title = "Parenti";
</script>
<script lang="ts">
	import {
		Simulation,
		EmittedPixels,
		Forces,
		Frontiers,
		ImageEmitter,
		Trails,
		P5Renderer
	} from '$lib/particle-system';

	import image from './image.png';
	import polygons from './polygons.svg';

	//

	const simulation = new Simulation({
		emitters: [
			new ImageEmitter({
				imageFile: image,
				polygonsFile: polygons,
				lifetime: 80,
				gradientSize: 100,
				pixelSize: 4,
				frontiers: [
					Frontiers.circle({
						start: [0.5, 0.5],
						speed: 20,
						gradientSize: 80,
						irregularity: 1.2
					})
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
				]
			})
		],   

		forces: [
			Forces.gravity(0, 9.8),
			// Forces.drag(0.01),
			// Forces.turbulence(10),
			Forces.flowField({
				cellSize: 30,
				type: 'chaotic',
				strength: 1,
				timeScale: 0.0005,
				updateEvery: 1,
				oscillate: true
			})
			// Forces.smoke({
			//   activation: "chaotic",
			//   resolution: 200,
			//   centers: [
			//     [0.75, 0.25],
			//     [1, 0.5],
			//     [0.5, 0.5],
			//   ],
			// }),
		],

		draw: (p5, particle) => {
			p5.noStroke();
			p5.setFill(particle.r, particle.g, particle.b, particle.a);
			p5.drawEllipse(
				particle.x - particle.size / 2,
				particle.y - particle.size / 2,
				particle.size,
				particle.size
			);
		},

		extensions: [
			new EmittedPixels({
				active: false,
				maxLength: 10_000,
				fadeDuration: 0.5,
				draw: (p5, pixel, opacity) => {
					p5.noStroke();
					p5.setFill(255, 255, 255, opacity * 255);
					p5.drawEllipse(pixel.x, pixel.y, pixel.size, pixel.size);
					for (let i = 0; i < 3; i++) {
						p5.drawEllipse(
							pixel.x + p5.random(-1, 1),
							pixel.y + p5.random(-1, 1),
							pixel.size / 2,
							pixel.size / 2
						);
					}
				}
			}),

			new Trails({
				active: false,
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
				}
			})
		],

		// Impostazioni di sistema
		capacity: 30_000,
		renderer: new P5Renderer({ frameRate: 30 }),
		speed: 1,
		maxHistory: 600,
		historyInterval: 10,
		baseSeed: 0,
		frameStepSize: 20
	});

	simulation.run();
</script>
