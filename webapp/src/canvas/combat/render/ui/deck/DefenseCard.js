import 'pixi.js';
import UICard from './UICard';

class DefenseCard extends UICard {
  // @Override
  createPixi() {
    super.createPixi();

    const { card } = this;
    if (card) {
      const value = card.getBonus();
      const typeValue = card.getValue();

      const bottomLeftIconTexture = PIXI.utils.TextureCache.icon_armor_s;
      this.bottomLeftIcon = new PIXI.Sprite(bottomLeftIconTexture);
      this.bottomLeftIcon.position.set(7, 50);
      this.bottomLeftIcon.scale.set(0.25);
      this.contentNormal.addChild(this.bottomLeftIcon);

      // The center sprite to render.
      const texture = 'icon_def';
      this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache[texture]);
      this.sprite.scale.set(0.24);
      this.sprite.position.set(18, 20);
      this.contentNormal.addChild(this.sprite);

      // Top-Left Text
      this.topLeftText = new PIXI.Text('DEF', {
        fontFamily: 'VT323',
        fontSize: 12,
        lineHeight: 9,
        fill: 0xffffff,
      });
      this.topLeftText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      this.topLeftText.position.set(15, 8);
      this.contentNormal.addChild(this.topLeftText);

      // Top-Right Text
      this.topRightText = new PIXI.Text(`${value}`, {
        fontFamily: 'VT323',
        fontSize: 20,
        lineHeight: 20,
        align: 'right',
        fill: 0xffffff,
      });
      this.topRightText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      this.topRightText.anchor.set(1, 0);
      this.topRightText.position.set(54, 6);
      this.contentNormal.addChild(this.topRightText);

      // Bottom-Right Text
      this.bottomRightText = new PIXI.Text(`ARMOR`, {
        fontFamily: 'VT323',
        fontSize: 12,
        lineHeight: 12,
        align: 'right',
        fill: 0xffffff,
      });
      this.bottomRightText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      this.bottomRightText.anchor.set(1, 1);
      this.bottomRightText.position.set(54, 62);
      this.contentNormal.addChild(this.bottomRightText);

      // Bottom-Left Text
      this.bottomLeftText = new PIXI.Text(`${typeValue}`, {
        fontFamily: 'VT323',
        fontSize: 16,
        lineHeight: 16,
        fill: 0xffffff,
      });
      this.bottomLeftText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      this.bottomLeftText.anchor.set(0, 1);
      this.bottomLeftText.position.set(16, 64);
      this.contentNormal.addChild(this.bottomLeftText);
    }
  }
}

export default DefenseCard;
