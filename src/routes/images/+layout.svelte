<script module lang="ts">
	import type { Simulation } from '$lib/particle-system';

	type State = {
		simulation: Simulation;
	};

	let state = $state<State>();

	export function setCurrentSimulation(simulation: Simulation) {
		state = {
			simulation
		};
	}
</script>

<script lang="ts">
	import { FastForwardIcon, PauseIcon, PlayIcon, RewindIcon } from '@lucide/svelte';
	import {} from '$app/navigation';
	import { resolve } from '$app/paths';
	import { NavigationHistory } from '$lib';
	import Button from '$lib/components/ui/button/button.svelte';

	//

	let { children } = $props();
</script>

<div class="relative flex h-dvh w-dvw items-center justify-center overflow-hidden">
	<div class="absolute top-2 left-2 z-10">
		<NavigationHistory.BackButton variant="ghost" size="icon" href={resolve('/')} />
	</div>

	{@render children()}

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
