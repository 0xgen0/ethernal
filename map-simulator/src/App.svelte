<script>
    import {onMount} from 'svelte';
    import Draw from './draw';
    import Map from './map';

    let canvas;
    let draw;
    let map;

    async function roomsFromBackend() {
      try {
        return await fetch('http://localhost:3399/rooms').then(r => r.json())
      } catch (e) {
        return null;
      }
    }

    async function run() {
      const rooms = await roomsFromBackend();
        map = new Map({rooms});
        draw = new Draw(canvas, map);
        draw.init();
        map.init();
        return () => {
            draw.cancel();
            map.cancel();
        };
    }

    document.addEventListener("keypress", ({key}) => {
        if (key === 'r') {
            draw.cancel();
            map.cancel();
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            run();
        }
    });

    onMount(run);
</script>

<style>
    canvas {
        width: 100%;
        height: 100%;
        background-color: #000;
    }
</style>

<canvas
        bind:this={canvas}
></canvas>
