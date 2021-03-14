import 'pixi.js';

const DEFAULT_OPTIONS = {
  flip: {
    horizontal: false,
    vertical: false,
  },
  rotate: {
    90: false,
    180: false,
    270: false,
  },
};

class RoomSprite {
  /**
   * @param sheet {RoomSpriteSheet}
   * @param dimensions {PIXI.Rectangle}
   * @param options
   *
   * @constructor
   */
  constructor(sheet, dimensions, options) {
    this.sheet = sheet;

    dimensions.x += sheet.texture.frame.x;
    dimensions.y += sheet.texture.frame.y;

    this.dimensions = dimensions;
    this.texture = new PIXI.Texture(sheet.texture.baseTexture, dimensions);

    if (options == null) {
      options = DEFAULT_OPTIONS;
    }
    this.options = Object.assign(DEFAULT_OPTIONS, options);
  }

  canFlipHorizontally() {
    return this.options.flip.horizontal;
  }

  canFlipVertically() {
    return this.options.flip.vertical;
  }

  canRotate90() {
    return this.options.rotate[90];
  }

  canRotate180() {
    return this.options.rotate[90];
  }

  canRotate270() {
    return this.options.rotate[90];
  }
}

export default RoomSprite;
