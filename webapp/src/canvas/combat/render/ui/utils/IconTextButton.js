import 'pixi.js';
import { Button } from './Button';
import TextureIcon from './TextureIcon';
import { SETTINGS } from './CombatUtils';
import log from 'utils/log';

/**
 * TODO: Document.
 */
class IconTextButton extends Button {
  /**
   * @param x {number} The 'X' coordinate to position the button.
   * @param y {number} The 'Y' coordinate to position the button.
   * @param iconTexture {PIXI.Texture} The texture to show on the button.
   * @param text {string} The text to display on the button to the right of the icon.
   *
   * @constructor
   */
  constructor(x, y, iconTexture, text) {
    super(new PIXI.Rectangle(x, y, 126, 50));

    log.trace(`x: ${x}, y: ${y}`);

    const iconLocation = new PIXI.Rectangle(12, 9, 32, 32);
    this.icon = new TextureIcon(iconLocation, null, iconTexture);
    this.icon.sprite.position.set(2, 1);
    this.content.addChild(this.icon);

    if (SETTINGS.mobile) {
      this.text = new PIXI.Text(text, {
        fontFamily: 'Space Mono',
        fontSize: 11,
        lineHeight: 16,
        fill: 0xffffff,
        align: 'left',
      });
    } else {
      this.text = new PIXI.Text(text, {
        fontFamily: 'Space Mono',
        fontSize: 10,
        lineHeight: 15,
        fill: 0xffffff,
        align: 'left',
      });
    }

    this.text.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.text.position.set(56, 12);
    this.content.addChild(this.text);
  }
}

export default IconTextButton;
