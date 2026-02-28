import { onNavigate } from '$app/navigation';

const history = $state<string[]>([]);

export function push(path: string) {
	history.push(path);
}

export function hasEntries() {
	return history.length > 0;
}

export function setupRecorder() {
	onNavigate(({ from }) => {
		if (from?.route.id) push(from.route.id);
	});
}
