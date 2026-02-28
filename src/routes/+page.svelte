<script lang="ts" module>
	export const title = "Home";
</script>
<script lang="ts">

	const pageModules = import.meta.glob<{ title?: string }>('./**/+page.svelte', { eager: true });

	// Build nested structure: { person: { subpage: { path, title } } }
	type PageEntry = { path: string; title: string };
	type NestedPages = Record<string, Record<string, PageEntry>>;

	const nestedPages: NestedPages = {};

	for (const [modulePath, module] of Object.entries(pageModules)) {
		// Skip root page
		if (modulePath === './+page.svelte') continue;

		// Parse: ./images/person/subpage/+page.svelte
		const match = modulePath.match(/^\.\/images\/([^/]+)\/([^/]+)\/\+page\.svelte$/);
		if (!match) continue;

		const [, person, subpage] = match;
		const path = modulePath.replace(/^\.\//, '/').replace(/\/\+page\.svelte$/, '');
		const title = (module as { title?: string }).title ?? subpage;

		if (!nestedPages[person]) nestedPages[person] = {};
		nestedPages[person][subpage] = { path, title };
	}

	// Sort people and subpages for consistent display
	const people = Object.keys(nestedPages).sort();
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<nav>
	<ul>
		{#each people as person}
			<li>
				{person}
				<ul>
					{#each Object.entries(nestedPages[person]).sort(([a], [b]) => a.localeCompare(b)) as [subpage, entry]}
						<li>
							<a href={entry.path}>{entry.title}</a>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>
