export const imageSize = {
	width: 700,
	height: 980
};

const horizontalPadding = 24;
const verticalPadding = 60;

export type ResizeFunction = (size: { width: number; height: number }) => void;

export function resizeCanvas(canvas: HTMLCanvasElement) {
	const availableWidth = window.innerWidth - horizontalPadding * 2;
	const availableHeight = window.innerHeight - verticalPadding * 2;
	const scale = Math.min(availableWidth / imageSize.width, availableHeight / imageSize.height, 1);
	const width = imageSize.width * scale;
	const height = imageSize.height * scale;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	return { width, height };
}

export function resizeCanvasAttachment(canvas: HTMLCanvasElement, onResize?: ResizeFunction) {
	const handler = () => {
		const size = resizeCanvas(canvas);
		onResize?.(size);
	};
	handler();
	window.addEventListener('resize', handler);
	return () => window.removeEventListener('resize', handler);
}
