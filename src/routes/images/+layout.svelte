<script module lang="ts">
	import type { Simulation } from '$lib/particle-system';

	const MAIN_ID = 'images-layout-main' as const;

	type State = {
		simulation: Simulation;
	};

	let state = $state<State>();

	function moveCanvasIntoMain() {
		const canvas = document.getElementById('defaultCanvas0');
		const main = document.getElementById(MAIN_ID);
		if (canvas && main && canvas.parentElement !== main) {
			main.appendChild(canvas);
		}
	}

	export function setCurrentSimulation(simulation: Simulation) {
		state = {
			simulation
		};
		moveCanvasIntoMain();
		// Canvas is created in p5's async setup; retry until it exists or we give up
		let attempts = 0;
		const maxAttempts = 120;
		const retry = () => {
			moveCanvasIntoMain();
			const canvas = document.getElementById('defaultCanvas0');
			if (canvas?.parentElement?.id !== MAIN_ID && attempts < maxAttempts) {
				attempts++;
				requestAnimationFrame(retry);
			}
		};
		requestAnimationFrame(retry);
	}
</script>

<script lang="ts">
	import { FastForwardIcon, PauseIcon, PlayIcon, RewindIcon } from '@lucide/svelte';
	import {} from '$app/navigation';
	import { resolve } from '$app/paths';
	import { NavigationHistory } from '$lib';
	import Button from '$lib/components/ui/button/button.svelte';
	import { fly } from 'svelte/transition';

	//

	let { children } = $props();
</script>

<div class="relative flex h-dvh w-dvw items-center justify-center overflow-hidden">
	<div class="absolute top-2 left-2 z-10">
		<NavigationHistory.BackButton variant="ghost" size="icon" href={resolve('/')} />
	</div>

	<main id="images-layout-main" transition:fly={{ duration: 1000, y: 50 }}>
		{@render children()}
	</main>

	<div class="absolute right-2 bottom-2">
		<Button variant="ghost" size="icon" onclick={() => state?.simulation.play()}>
			<PlayIcon />
		</Button>
		<Button variant="ghost" size="icon" onclick={() => state?.simulation.pause()}>
			<PauseIcon />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			onclick={() => state?.simulation.stepBackward(state?.simulation.frameStepSize)}
		>
			<RewindIcon />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			onclick={() => state?.simulation.stepForward(state?.simulation.frameStepSize)}
		>
			<FastForwardIcon />
		</Button>
	</div>
</div>
