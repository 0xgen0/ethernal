import 'pixi.js';

class Light extends PIXI.Container {
  constructor(tint = 0xffffff, alpha = 0.5, alphaPerLayer = 0.25) {
    super();

    this.light1 = new PIXI.Sprite(PIXI.utils.TextureCache.light_1);
    this.light2 = new PIXI.Sprite(PIXI.utils.TextureCache.light_2);
    this.light3 = new PIXI.Sprite(PIXI.utils.TextureCache.light_3);
    this.light4 = new PIXI.Sprite(PIXI.utils.TextureCache.light_4);
    this.light5 = new PIXI.Sprite(PIXI.utils.TextureCache.light_5);
    this.light6 = new PIXI.Sprite(PIXI.utils.TextureCache.light_6);
    this.light7 = new PIXI.Sprite(PIXI.utils.TextureCache.light_7);

    this.alpha = alpha;

    // const tint = 0x621c4c;
    const scale = 1.4;
    const mode = PIXI.BLEND_MODES.ADD;
    this.light1.blendMode = mode;
    this.light2.blendMode = mode;
    this.light3.blendMode = mode;
    this.light4.blendMode = mode;
    this.light5.blendMode = mode;
    this.light6.blendMode = mode;
    this.light7.blendMode = mode;

    this.light1.alpha = alphaPerLayer;
    this.light2.alpha = alphaPerLayer;
    this.light3.alpha = alphaPerLayer;
    this.light4.alpha = alphaPerLayer;
    this.light5.alpha = alphaPerLayer;
    this.light6.alpha = alphaPerLayer;
    this.light7.alpha = alphaPerLayer;

    this.light1.anchor.set(0.5, 0.5);
    this.light2.anchor.set(0.5, 0.5);
    this.light3.anchor.set(0.5, 0.5);
    this.light4.anchor.set(0.5, 0.5);
    this.light5.anchor.set(0.5, 0.5);
    this.light6.anchor.set(0.5, 0.5);
    this.light7.anchor.set(0.5, 0.5);

    this.light1.scale.set(scale, scale);
    this.light2.scale.set(scale, scale);
    this.light3.scale.set(scale, scale);
    this.light4.scale.set(scale, scale);
    this.light5.scale.set(scale, scale);
    this.light6.scale.set(scale, scale);
    this.light7.scale.set(scale, scale);

    this.setTint(tint);

    this.addChild(
      this.light7,
      this.light6,
      this.light5,
      this.light4,
      this.light3,
      this.light2,
      this.light1,
    );
  }

  setTint(tint) {
    this.light1.tint = tint;
    this.light2.tint = tint;
    this.light3.tint = tint;
    this.light4.tint = tint;
    this.light5.tint = tint;
    this.light6.tint = tint;
    this.light7.tint = tint;
  }
}

export default Light;
