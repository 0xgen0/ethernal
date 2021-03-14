import 'pixi.js';
import { Button } from './Button';
import { SETTINGS, TEXT_BUTTON_OPTIONS_MOBILE, TEXT_BUTTON_OPTIONS_PC } from './CombatUtils';

class TextButton extends Button {
  /**
   * @param dimensions {PIXI.Rectangle}
   * @param text {PIXI.Text | string}
   * @param options {=}
   *
   * @constructor
   */
  constructor(dimensions, text, options) {
    super(dimensions, options);

    if (!options) {
      options = SETTINGS.mobile ? TEXT_BUTTON_OPTIONS_MOBILE : TEXT_BUTTON_OPTIONS_PC;
    }
    if (typeof text === 'string') {
      text = new PIXI.Text(text, options);
    }

    this.text = text;
    this.text.anchor.set(0.5, 0.5);
    this.text.position.x = Math.round(this._width / 2);
    this.text.position.y = Math.round(this._height / 2);
    this.content.addChild(this.text);
  }

  /**
   *
   * @param text {PIXI.Text | string}
   */
  setText(text) {
    if (typeof text === 'string') {
      this.text.text = text;
      this.text.updateText();
    } else {
      this.removeChild(this.text);
      this.text = text;
      this.text.anchor.set(0.5, 0.5);
      this.text.position.x = Math.floor(this._width / 2);
      this.text.position.y = Math.floor(this._height / 2);
      this.addChild(this.text);
    }
  }
}

export default TextButton;
