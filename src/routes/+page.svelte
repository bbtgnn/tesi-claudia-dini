<script lang="ts">
	import { resolve } from '$app/paths';

	import { nestedPages, people } from './_partials';
</script>

<nav>
	<ul>
		{#each people as person (person)}
			<li class="capitalize">
				{person}
				<ul>
					{#each Object.entries(nestedPages[person]) as [subpage, entry] (subpage)}
						<li class="pl-4">
							<a href={resolve(entry.path as '/')}>{entry.title}</a>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>
