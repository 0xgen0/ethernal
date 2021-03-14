import 'pixi.js';

export default class Monster extends PIXI.Container {
  constructor(monster) {
    super();

    const { spritesheet } = PIXI.Loader.shared.resources.sheet;
    const { animations } = spritesheet;

    const monAnimatedSprite = new PIXI.AnimatedSprite(animations.mon_overworld);
    monAnimatedSprite.anchor.set(0.5);
    monAnimatedSprite.scale.set(0.85);
    monAnimatedSprite.animationSpeed = 0.1;
    monAnimatedSprite.play();

    if (monster && monster.type === 'big boss') {
      monAnimatedSprite.tint = 0xEA4D46;
    }

    this.addChild(monAnimatedSprite);
  }
}
