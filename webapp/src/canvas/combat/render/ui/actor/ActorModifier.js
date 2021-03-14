import 'pixi.js';
import ActorModifierType from './ActorModifierType';

const BORDER_COLOR_MODIFIED = 0xde3d37;
const BORDER_COLOR_NEUTRAL = 0x464646;

/**
 * NOTE: The modifier number could be animated with y position & alpha when enabling and disabling for a nice effect.
 */
class ActorModifier extends PIXI.Container {
  /**
   * @param type {string} The type of modifier to display.
   * @param modifier {number} The modifier to initially set.
   * @param highlight {boolean}
   * @param width {=number}
   * @param height {=number}
   */
  constructor(type, modifier, highlight, width, height) {
    super();

    this.type = type;
    this.modifier = modifier;
    this.highlight = highlight;

    if (width == null) {
      if (type === ActorModifierType.HP) {
        width = 14;
      } else {
        width = 13;
      }
    }
    if (height == null) {
      height = 13;
    }

    this._width = width;
    this._height = height;

    this.icon = new PIXI.Sprite(PIXI.utils.TextureCache[`modifier_icon_${type}_s`]);
    this.icon.anchor.set(0.5, 0.5);
    this.icon.position.set(Math.ceil(width / 2), Math.ceil(height / 2));

    this.border = new PIXI.Graphics();

    this.borderHighlighted = new PIXI.Graphics();
    this.borderHighlighted.visible = highlight;

    this.drawBorder();

    this.modifierText = new PIXI.Text(modifier !== 0 ? `-${modifier}` : '', {
      fontFamily: 'Space Mono',
      fontSize: 10,
      lineHeight: 15,
      fontWeight: 'bold',
      align: 'center',
      fill: 0xde3d37,
    });
    this.modifierText.anchor.set(0.5, 0);
    this.modifierText.position.set(6, 14);
    this.modifierText.visible = modifier !== 0;

    this.addChild(this.border);
    this.addChild(this.borderHighlighted);
    this.addChild(this.icon);
    this.addChild(this.modifierText);

    this.update();
  }

  /** @private */
  update() {
    const color = this.modifier !== 0 ? BORDER_COLOR_MODIFIED : BORDER_COLOR_NEUTRAL;
    const colorIcon = this.modifier !== 0 ? BORDER_COLOR_MODIFIED : 0xffffff;
    this.border.tint = color;
    this.icon.tint = colorIcon;
    this.border.visible = !this.highlight;
    this.borderHighlighted.visible = this.highlight;
    this.modifierText.visible = this.modifier !== 0;
    this.modifierText.text = `${this.modifier}`;
    this.modifierText.updateText();
  }

  /** @private */
  drawBorder() {
    const x1 = 0.5;
    const y1 = 0.5;
    const x2 = this._width + 0.5;
    const y2 = this._height + 0.5;

    this.borderHighlighted.clear();
    this.borderHighlighted.lineStyle(1, 0xffffff);
    // Top-Left Corner
    this.borderHighlighted.moveTo(x1 + 1, y1);
    this.borderHighlighted.lineTo(x1 + 4, y1);
    this.borderHighlighted.moveTo(x1, y1);
    this.borderHighlighted.lineTo(x1, y1 + 3);
    // Top-Right Corner
    this.borderHighlighted.moveTo(x2 - 3, y1);
    this.borderHighlighted.lineTo(x2, y1);
    this.borderHighlighted.moveTo(x2, y1);
    this.borderHighlighted.lineTo(x2, y1 + 3);
    // Bottom-Right Corner
    this.borderHighlighted.moveTo(x2 - 3, y2);
    this.borderHighlighted.lineTo(x2, y2);
    this.borderHighlighted.moveTo(x2, y2 - 4);
    this.borderHighlighted.lineTo(x2, y2 - 1);
    // Bottom-Left Corner
    this.borderHighlighted.moveTo(x1 + 1, y2);
    this.borderHighlighted.lineTo(x1 + 4, y2);
    this.borderHighlighted.moveTo(x1, y2 - 4);
    this.borderHighlighted.lineTo(x1, y2 - 1);
    this.borderHighlighted.closePath();

    this.border.clear();
    this.border.lineStyle(1, 0xffffff);
    this.border.moveTo(x1, y1);
    this.border.lineTo(x2, y1);
    this.border.lineTo(x2, y2);
    this.border.lineTo(x1, y2);
    this.border.closePath();
  }

  setModifier(modifier) {
    if (this.modifier === modifier) {
      return;
    }

    this.modifier = modifier;
    this.update();
  }

  /** @return {boolean} Returns 'true' if the modifier is highlighted. */
  isHighlighted() {
    return this.highlight;
  }

  /**
   * Sets the highlight state of the modifier & redraws the border.
   *
   * @param flag The state to set.
   */
  setHighlighted(flag) {
    if (flag === this.highlight) {
      return;
    }

    this.highlight = flag;
    this.update();
  }
}

export default ActorModifier;
