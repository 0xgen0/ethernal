import { writable } from 'svelte/store';

let fromLocalStorage;
try {
  fromLocalStorage = localStorage.getItem('preDungeon');
  fromLocalStorage = JSON.parse(fromLocalStorage);
} catch (err) {
  //
}

const $preDungeon = fromLocalStorage || { roomId: 'intro' };
window.$preDungeon = $preDungeon;
const { subscribe, set } = writable($preDungeon);

export default {
  subscribe,
  setRoom: roomId => {
    $preDungeon.roomId = roomId;
    localStorage.setItem('preDungeon', JSON.stringify($preDungeon));
    // eslint-disable-next-line no-console
    console.log('preDungeon', $preDungeon);
    set($preDungeon);
  },
  clear: () => {
    set({ roomId: 'intro' });
    localStorage.removeItem('preDungeon');
  },
};
