<script lang="ts">
	import type { Simulation } from '$lib/particle-system';

	import { fly } from 'svelte/transition';

	import { fitCanvas, fitCanvasOnResizeAttachment } from './utils';

	type Props = {
		simulation: Simulation;
	};
	let { simulation }: Props = $props();
</script>

<main transition:fly={{ y: 24, duration: 1000 }} {@attach fitCanvasOnResizeAttachment}>
	<canvas
		{@attach (c) => {
			simulation.run(c);
			simulation.onMount((c) => {
				fitCanvas(c);
			});
		}}
	></canvas>
</main>
