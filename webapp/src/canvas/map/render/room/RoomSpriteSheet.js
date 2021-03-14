import 'pixi.js';
import RoomSprite from './RoomSprite';

class RoomSpriteSheet {
  /**
   * @param texture {PIXI.Texture}
   * @param roofs {number}
   * @param walls {number}
   * @param floors {number}
   * @param props {number}
   * @param specials {number}
   *
   * @constructor
   */
  constructor(texture, roofs, walls, floors, props, specials) {
    this.texture = texture;
    this.roofs = [];
    this.walls = [];
    this.floors = [];
    this.props = [];
    this.specials = [];
    this.index = -1;

    // Roof definitions.
    if (roofs > 0) {
      const roofOptions = { flip: { horizontal: true } };
      for (let x = 0; x < roofs; x += 1) {
        this.roofs.push(new RoomSprite(this, new PIXI.Rectangle(x * 8, 0, 8, 8), roofOptions));
      }
    }
    // Wall definitions.
    if (walls > 0) {
      const wallOptions = { flip: { horizontal: true } };
      for (let x = 0; x < walls; x += 1) {
        this.walls.push(new RoomSprite(this, new PIXI.Rectangle(x * 8, 8, 8, 8), wallOptions));
      }
    }
    // Floor definitions.
    if (floors > 0) {
      const floorOptions = { flip: { horizontal: true, vertical: true }, rotate: { 90: true, 180: true, 270: true } };
      for (let x = 0; x < floors; x += 1) {
        this.floors.push(new RoomSprite(this, new PIXI.Rectangle(x * 8, 16, 8, 8), floorOptions));
      }
    }
    // Prop definitions.
    if (props > 0) {
      const propOptions = {
        flip: {
          horizontal: true,
          vertical: false,
        },
      };
      for (let x = 0; x < props; x += 1) {
        this.props.push(new RoomSprite(this, new PIXI.Rectangle(x * 8, 24, 8, 8), propOptions));
      }
    }
    // Special definitions.
    if (specials > 0) {
      for (let x = 0; x < specials; x += 1) {
        this.specials.push(new RoomSprite(this, new PIXI.Rectangle(x * 8, 32, 8, 8)));
      }
    }
  }
}

export default RoomSpriteSheet;
