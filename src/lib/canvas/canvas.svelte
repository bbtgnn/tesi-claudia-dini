<script lang="ts">
	import type { Simulation } from '$lib/particle-system';

	import { fly } from 'svelte/transition';

	import { fitCanvas, fitCanvasOnResizeAttachment } from './utils';

	type Props = {
		simulation: Simulation;
	};
	let { simulation }: Props = $props();

	//

	let visible = $state(false);

	$effect(() => {
		simulation.onMount((canvas) => {
			fitCanvas(canvas);
			const main = document.querySelector('main');
			if (!main) return;
			main.appendChild(canvas);
			visible = true;
		});
	});
</script>

<main
	class={[
		visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
		'transition-all duration-1000'
	]}
	out:fly={{ y: 24, duration: 1000 }}
	{@attach fitCanvasOnResizeAttachment}
></main>
