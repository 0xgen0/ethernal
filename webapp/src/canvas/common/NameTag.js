import 'pixi.js';

export default class NameTag extends PIXI.Container {
  constructor(name, opts) {
    super();

    const tCache = PIXI.utils.TextureCache;
    const sqrSprite = new PIXI.Sprite(tCache['ui_map_teleportBtn.png']);
    sqrSprite.tint = 0x000000;
    sqrSprite.anchor.set(0.5);
    sqrSprite.alpha = 0.75;

    const textSprite = new PIXI.Text(name, {
      fontFamily: 'Space Mono',
      fontSize: 10,
      fill: 0xffffff,
      align: 'center',
      ...opts,
    });
    textSprite.anchor.set(0.5);
    textSprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;

    sqrSprite.width = textSprite.width + 20;
    sqrSprite.scale.y = 0.8;

    this.addChild(sqrSprite, textSprite);
  }
}
