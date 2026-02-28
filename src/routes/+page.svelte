<script lang="ts">
	import { resolve } from '$app/paths';
	import logo from '$lib/assets/logo.svg';

	import { nestedPages, people, signatures } from './_partials';
</script>

<nav class="space-y-10 p-8 font-capraia text-primary">
	<div class="space-y-2">
		<img src={logo} alt="logo" class="h-7 w-auto" />
		<hr class="w-full border-b" />
	</div>
	<ul class="space-y-4">
		{#each people as person (person)}
			<li class="space-y-2">
				<img src={signatures[person]} alt={person} class="h-7 w-auto" />
				<ul>
					{#each Object.entries(nestedPages[person]) as [subpage, entry] (subpage)}
						<li class="pl-4">
							<a href={resolve(entry.path as '/')} class="underline-offset-2 hover:underline">
								{entry.title}
							</a>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>
