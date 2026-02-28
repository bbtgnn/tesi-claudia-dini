<script lang="ts">
	import type { ComponentProps } from 'svelte';

	import { ArrowLeftIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	import * as history from './history.svelte';

	//

	type Props = ComponentProps<typeof Button>;

	let { ...props }: Props = $props();
</script>

{#if history.hasEntries()}
	<Button {...props} onclick={() => window.history.back()}>
		<ArrowLeftIcon />
	</Button>
{:else}
	<Button {...props}>
		<ArrowLeftIcon />
	</Button>
{/if}
