import 'pixi.js';

window.PIXI = PIXI;
require('pixi-layers');

const corridorGroup = new PIXI.display.Group(0, false);
const roomGroup = new PIXI.display.Group(1, true);
const roomExitsGroup = new PIXI.display.Group(2, false);
const monstersGroup = new PIXI.display.Group(3, false);
const charGroup = new PIXI.display.Group(4, false);
const myCharGroup = new PIXI.display.Group(5, false);
const uiGroup = new PIXI.display.Group(6, false);

roomGroup.on('sort', sprite => {
  sprite.zOrder = sprite.y;
});

export default {
  CORRIDORS: corridorGroup,
  ROOMS: roomGroup,
  ROOM_EXITS: roomExitsGroup,
  CHARACTERS: charGroup,
  MY_CHARACTER: myCharGroup,
  UI_GROUP: uiGroup,
  MONSTERS: monstersGroup,
};
