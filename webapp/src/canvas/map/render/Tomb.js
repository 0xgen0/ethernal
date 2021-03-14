import 'pixi.js';

export default class Tomb extends PIXI.Container {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache['tomb.png']);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(1.3);
    this.sprite.interactive = true;
    this.addChild(this.sprite);
  }
}
