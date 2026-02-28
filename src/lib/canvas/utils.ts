const horizontalPadding = 24;
const verticalPadding = 60;

export type ResizeFunction = (size: { width: number; height: number }) => void;

export function fitCanvas(canvas: HTMLCanvasElement) {
	const availableWidth = window.innerWidth - horizontalPadding * 2;
	const availableHeight = window.innerHeight - verticalPadding * 2;
	const scale = Math.min(
		availableWidth / canvas.offsetWidth,
		availableHeight / canvas.offsetHeight,
		1
	);
	const width = canvas.offsetWidth * scale;
	const height = canvas.offsetHeight * scale;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	return { width, height };
}

export function fitCanvasOnResizeAttachment(el: HTMLElement) {
	const handler = () => {
		const canvas = el.querySelector('canvas');
		if (!canvas) return;
		fitCanvas(canvas);
	};
	window.addEventListener('resize', handler);
	return () => {
		window.removeEventListener('resize', handler);
	};
}
