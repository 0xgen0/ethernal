import './init';
import App from './App.svelte';

const app = new App({
  target: document.body,
  props: {
    name: 'world',
  },
});

window.app = app; // useful for debugging!

export default app;
