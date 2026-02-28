const pageModules = import.meta.glob<{ title?: string }>('../images/**/+page.svelte', {
	eager: true
});

// Build nested structure: { person: { subpage: { path, title } } }
type PageEntry = { path: string; title: string };
type NestedPages = Record<string, Record<string, PageEntry>>;

const nestedPages: NestedPages = {};

for (const [modulePath, module] of Object.entries(pageModules)) {
	// Parse: ../images/person/subpage/+page.svelte
	const match = modulePath.match(/^\.\.\/images\/([^/]+)\/([^/]+)\/\+page\.svelte$/);
	if (!match) continue;

	const [, person, subpage] = match;
	const path = modulePath.replace(/^\.\.\//, '/').replace(/\/\+page\.svelte$/, '');
	const title = (module as { title?: string }).title ?? subpage;

	if (!nestedPages[person]) nestedPages[person] = {};
	nestedPages[person][subpage] = { path, title };
}

// Sort people and subpages for consistent display
const people = Object.keys(nestedPages).sort();
for (const person of Object.keys(nestedPages)) {
	const sortedEntries = Object.entries(nestedPages[person]).sort(([a], [b]) => a.localeCompare(b));
	nestedPages[person] = Object.fromEntries(sortedEntries);
}

export { nestedPages, people };
