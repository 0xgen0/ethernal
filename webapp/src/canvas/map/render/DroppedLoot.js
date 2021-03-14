import 'pixi.js';

export default class DroppedLoot extends PIXI.Container {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache['loot.png']);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(1.3);
    this.sprite.interactive = true;
    this.addChild(this.sprite);
  }
}
