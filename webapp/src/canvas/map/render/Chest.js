import 'pixi.js';

export default class Chest extends PIXI.Container {
  /**
   * @constructor
   */
  constructor(status = true) {
    super();
    this.status = status;
    this.create();
  }

  get image() {
    return this.status === 'opened' ? 'chest_open_s.png' : 'chest_closed_s.png';
  }

  create() {
    this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.image]);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(1);
    this.sprite.interactive = true;
    this.addChild(this.sprite);
  }

  update(status) {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.removeChild(this.sprite);
    this.create();
  }
}
