<script lang="ts" module>
	export const title = 'Cena anniversario';
</script>

<script lang="ts">
	import { Canvas } from '$lib/canvas';
	import {
		EmittedPixels,
		Forces,
		Frontiers,
		ImageEmitter,
		P5Renderer,
		Simulation,
		Trails
	} from '$lib/particle-system';

	import { setCurrentSimulation } from '../../+layout.svelte';
	import image from './image.png';
	import polygons from './polygons.svg';

	//

	const simulation = new Simulation({
		emitters: [
			new ImageEmitter({
				imageFile: image,
				polygonsFile: polygons,
				lifetime: 100,
				gradientSize: 0,
				pixelSize: 4,
				frontiers: [
					// Frontiers.line({
					// 	start: [0, 0],
					// 	angle: 270,
					// 	speed: 10,
					// 	gradientSize: 100
					// })
					Frontiers.circle({
						start: [0.5, 0.5],
						speed: 10,
						gradientSize: 100
					})
					// Frontiers.circle({
					// 	start: [1, 0.5],
					// 	speed: 5,
					// 	gradientSize: 0
					// })
					// Frontiers.circle({
					//   center: [1, 0.5],
					//   speed: 5,
					//   gradientSize: 100,
					// }),
				]
			})
		],

		forces: [
			// Gravità più morbida e diagonale verso l'alto
			Forces.gravity(0.3, -0.4),

			// Maggiore resistenza per traiettorie più controllate
			Forces.drag(0.02),

			// Campo di flusso caotico che introduce movimenti vorticosi
			Forces.flowField({
				cellSize: 40,
				type: 'chaotic',
				strength: 0.7,
				timeScale: 0.0003,
				updateEvery: 2,
				oscillate: true
			}),

			// Turbolenza leggera per evitare traiettorie troppo regolari
			Forces.turbulence(5),

			// Fumo multi-sorgente per effetti più ricchi
			Forces.smoke({
				activation: 'chaotic',
				resolution: 220,
				centers: [
					[0.75, 0.25],
					[1, 0.5],
					[0.5, 0.5],
					[0.25, 0.75]
				]
			})
		],

		draw: (p5, particle) => {
			// p5.noStroke();
			// p5.setFill(particle.r, particle.g, particle.b, particle.a);
			// p5.drawRect(
			// 	particle.x - particle.size / 2,
			// 	particle.y - particle.size / 2,
			// 	particle.size,
			// 	particle.size
			// );
		},

		extensions: [
			new EmittedPixels({
				active: false,
				maxLength: 10_000,
				fadeDuration: 0.5,
				draw: (p5, pixel, opacity) => {
					p5.noStroke();
					p5.setFill(0, 0, 0, opacity * 255);
					// p5.drawRect(pixel.x, pixel.y, pixel.size, pixel.size);
					for (let i = 0; i < 3; i++) {
						p5.drawEllipse(
							pixel.x + p5.random(-1, 1),
							pixel.y + p5.random(-1, 1),
							pixel.size,
							pixel.size
						);
					}
				}
			}),

			new Trails({
				active: true,
				maxLength: 40,
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

	setCurrentSimulation(simulation);
</script>

<Canvas {simulation} />
