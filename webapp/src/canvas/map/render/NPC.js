import 'pixi.js';

export default class NPC extends PIXI.Container {
  /**
   * @constructor
   */
  constructor(type) {
    super();
    const sprites = {
      'gatekeeper': 'guardian.png',
      'map maker': 'merchant.png',
      'recycler': 'alchemist.png',
    };
    this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache[sprites[type] || sprites.recycler]);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(0.6);
    this.sprite.interactive = true;
    this.addChild(this.sprite);
  }
}
