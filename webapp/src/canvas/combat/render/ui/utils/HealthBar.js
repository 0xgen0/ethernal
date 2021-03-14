import 'pixi.js';
import { ease } from 'pixi-ease';
import { SETTINGS } from './CombatUtils';

/**
 * TODO: Document.
 */
class HealthBar extends PIXI.Container {
  /**
   * @param width {number}
   * @param height {number}
   * @param health {number}
   * @param healthMax {number}
   */
  constructor(width, height, health, healthMax, fontOptions1, fontOptions2) {
    super();

    if (health < 0) {
      health = 0;
    }
    if (healthMax < 1) {
      healthMax = 1;
    }

    this._width = width;
    this._height = height;
    this.health = health;
    this.healthMax = healthMax;
    this.highlight = false;

    this.border = new PIXI.Graphics();
    this.border.tint = 0x464646;
    this.drawBorder();
    this.addChild(this.border);

    this.fill = new PIXI.Graphics();
    this.fill.beginFill(0xffffff);
    this.fill.drawRect(0, 0, 1, height - 4);
    this.fill.endFill();
    this.fill.position.set(2, 2);
    this.fill.tint = 0xec211f;
    this.addChild(this.fill);

    if (fontOptions2 == null) {
      if (SETTINGS.mobile) {
        fontOptions2 = {
          fontFamily: 'Space Mono',
          fontWeight: 800,
          fontSize: 9,
          fill: 0x454545,
          align: 'right',
        };
      } else {
        fontOptions2 = {
          fontFamily: 'Space Mono',
          fontWeight: 'bold',
          fontSize: 10,
          lineHeight: 15,
          fill: 0x454545,
          align: 'right',
        };
      }

    }
    if (fontOptions1 == null) {
      if(SETTINGS.mobile) {
        fontOptions1 = {
          fontFamily: 'Space Mono',
          fontWeight: 800,
          fontSize: 9,
          fill: health > 0 ? 0xffffff : 0xa82e2a,
          align: 'left',
        };
      } else {
        fontOptions1 = {
          fontFamily: 'Space Mono',
          fontWeight: 'bold',
          fontSize: 10,
          lineHeight: 15,
          fill: health > 0 ? 0xffffff : 0xa82e2a,
          align: 'left',
        };
      }
    }

    const labelY = Math.round((this._height / 2) + 1);

    this.label = new PIXI.Text(`${this.health}`, fontOptions1);
    this.label.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.label.anchor.y = 0.5;
    this.label.position.set(4, labelY);

    this.labelMax = new PIXI.Text(`/${this.healthMax}`, fontOptions2);
    this.labelMax.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.labelMax.anchor.set(1, 0.5);
    this.labelMax.position.set(this._width - 3, labelY + 1);

    this.addChild(this.label, this.labelMax);

    this.update(true);
  }

  /**
   * @param immediately {=boolean}
   *
   * @private
   */
  update(immediately) {
    let lerpFactor = this.health / this.healthMax;
    // Make sure that the fill does not extend beyond the base of the bar, regardless of value.
    if (lerpFactor > 1) lerpFactor = 1;
    else if (lerpFactor < 0) lerpFactor = 0;
    const width = Math.floor((this._width - 4) * lerpFactor);

    this.label.text = `${this.health}`;
    this.labelMax.text = `/${this.healthMax}`;

    if (this.health === 0) {
      this.label.style.fill = 0xa82e2a;
    } else {
      this.label.style.fill = 0xffffff;
    }

    if (immediately) {
      this.fill.width = width;
    } else {
      ease.add(this.fill, { width }, { duration: 1000 });
    }
  }

  /**
   * @param health {number}
   * @param healthMax {number}
   */
  set(health, healthMax) {
    if (health === this.health && healthMax === this.healthMax) {
      return;
    }

    if (health < 0) {
      health = 0;
    }
    if (healthMax < 1) {
      healthMax = 1;
    }

    this.health = health;
    this.healthMax = healthMax;

    this.update();
  }

  /**
   * @param health {number}
   */
  setHealth(health) {
    if (health === this.health) {
      return;
    }

    if (health < 0) {
      health = 0;
    }

    this.health = health;

    this.update();
  }

  /**
   * @param healthMax {number}
   */
  setMaxHealth(healthMax) {
    if (healthMax === this.healthMax) {
      return;
    }

    if (healthMax < 1) {
      healthMax = 1;
    }

    this.healthMax = healthMax;

    this.update();
  }

  /** @private */
  drawBorder() {
    const x1 = 0.5;
    const y1 = 0.5;
    const x2 = this._width + 0.5;
    const y2 = this._height + 0.5;

    this.border.lineStyle(1, 0xffffff);

    // Top border line.
    this.border.moveTo(x1 + 1, y1);
    this.border.lineTo(x2 - 1, y1);

    // Right border line.
    this.border.moveTo(x2 - 1, y1);
    this.border.lineTo(x2 - 1, y2 - 2);

    // Bottom border line.
    this.border.moveTo(x1 + 1, y2 - 1);
    this.border.lineTo(x2 - 1, y2 - 1);

    // Left border line.
    this.border.moveTo(x1, y1);
    this.border.lineTo(x1, y2 - 2);

    this.border.closePath();
  }

  /**
   * @param flag {boolean}
   */
  setHighlighted(flag) {
    if (this.highlight === flag) {
      return;
    }

    this.highlight = flag;
    this.border.tint = flag ? 0xffffff : 0x464646;
  }
}

export default HealthBar;
