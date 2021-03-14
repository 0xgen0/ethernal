import { writable } from 'svelte/store';

let fromLocalStorage;
try {
  fromLocalStorage = localStorage.getItem('characterChoice');
  fromLocalStorage = JSON.parse(fromLocalStorage);
} catch (err) {
  //
}

let $data = fromLocalStorage || { name: '', characterClass: 0 };
window.$characterChoice = $data;

const { subscribe, set } = writable($data);

export default {
  subscribe,
  setData: data => {
    $data = data;
    localStorage.setItem('characterChoice', JSON.stringify($data));
    // eslint-disable-next-line no-console
    console.log('characterChoice', $data);
    set($data);
  },
  clear: () => {
    set({ name: '', characterClass: 0 });
    localStorage.removeItem('characterChoice');
  },
};
