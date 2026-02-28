<script lang="ts">
	import type { Simulation } from '$lib/particle-system';

	import { fitCanvas } from './utils';

	type Props = {
		simulation: Simulation;
	};
	let { simulation }: Props = $props();

	$effect(() => {
		simulation.onMount((canvas) => {
			fitCanvas(canvas);
			console.log(canvas);
			const main = document.querySelector('main');
			console.log(main);
			if (main) main.appendChild(canvas);
		});
	});
</script>

<main></main>
