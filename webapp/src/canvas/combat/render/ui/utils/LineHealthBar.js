import 'pixi.js';

class LineHealthBar extends PIXI.Container {
  /**
   * @param health {number}
   * @param healthFull {number}
   *
   * @constructor
   */
  constructor(health, healthFull) {
    super();

    this._width = 20;
    this._height = 1;

    this.health = health;
    this.healthFull = healthFull;

    this.back = new PIXI.Graphics();
    this.back.beginFill(0xffffff);
    this.back.drawRect(0.5, 0.5, this._width - 1 + 0.5, this._height + 0.5);
    this.back.endFill();
    this.back.tint = 0x6b6b6b;
    this.addChild(this.back);

    this.front = new PIXI.Graphics();
    this.front.beginFill(0xffffff);
    this.front.drawRect(0.5, 0.5, this._width - 1 + 0.5, this._height + 0.5);
    this.front.endFill();
    this.front.tint = 0xde3d37;
    this.addChild(this.front);

    this.update();
  }

  /**
   * @private
   */
  update() {
    this.front.scale.x = this.health / this.healthFull;
  }

  setHealth(health) {
    if (health < 0) {
      health = 0;
    }

    if (this.health === health) {
      return;
    }

    this.health = health;
    this.update();
  }
}

export default LineHealthBar;
