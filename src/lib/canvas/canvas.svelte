<script lang="ts">
	import type { Simulation } from '$lib/particle-system';

	import { fade } from 'svelte/transition';

	import { fitCanvas, fitCanvasOnResizeAttachment } from './utils';

	type Props = {
		simulation: Simulation;
	};
	let { simulation }: Props = $props();
</script>

<main in:fade={{ duration: 1000 }} {@attach fitCanvasOnResizeAttachment}>
	<canvas
		{@attach (c) => {
			simulation.run(c);
			simulation.onMount((canvasEl) => {
				fitCanvas(canvasEl);
			});
		}}
	></canvas>
</main>
