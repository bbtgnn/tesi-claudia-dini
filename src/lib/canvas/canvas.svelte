<script lang="ts">
	import { imageSize, resizeCanvasAttachment, type ResizeFunction } from './utils';

	type Props = {
		initProject: (canvas: HTMLCanvasElement) => void;
		onResize?: ResizeFunction;
	};

	let { initProject, onResize }: Props = $props();
</script>

<canvas
	width={imageSize.width}
	height={imageSize.height}
	{@attach (c) => {
		initProject(c);
	}}
	{@attach (c) => resizeCanvasAttachment(c, onResize)}
></canvas>
