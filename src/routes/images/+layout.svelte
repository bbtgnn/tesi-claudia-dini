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
	import { DownloadIcon, FastForwardIcon, PauseIcon, PlayIcon, RewindIcon } from '@lucide/svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { NavigationHistory } from '$lib';
	import Button from '$lib/components/ui/button/button.svelte';

	//

	let { children } = $props();

	function downloadFilename(): string {
		const path = $page.url.pathname;
		const segments = path.replace(/^\/images\/?/, '').split('/').filter(Boolean);
		return segments.length > 0 ? segments.join('-') : 'image';
	}

	function downloadImage() {
		state?.simulation.saveImage(downloadFilename(), 'png');
	}
</script>

<div class="relative flex h-dvh w-dvw items-center justify-center overflow-hidden">
	<div class="absolute top-2 left-2 z-10">
		<NavigationHistory.BackButton variant="ghost" size="icon" href={resolve('/')} />
	</div>

	{@render children()}

	<div class="absolute right-2 bottom-2 flex items-center gap-1">
		<Button variant="ghost" size="icon" onclick={downloadImage} title="Scarica immagine">
			<DownloadIcon />
		</Button>
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
