import 'pixi.js';
import { ease } from 'pixi-ease';

const ROTATE_SPAN = Math.PI / 2;

class RadialButtonMenu extends PIXI.Container {
  constructor(radius) {
    super();
    this.radius = radius;
    this.options = [];

    // PIXI Settings.
    this.alpha = 0;
    this.visible = false;
    this.interactive = true;
    this.interactiveChildren = true;
    this.anchor = new PIXI.Point(0.5, 0.5);
    this.pivot = new PIXI.Point(0.5, 0.5);
  }

  updatePositions() {
    let lerp = this.alpha;
    if (lerp > 1) lerp = 1;
    else if (lerp < 0) lerp = 0;

    const lerpMod = 0.75 + lerp / 4;

    // Set main container properties.
    const bias = -(Math.PI / 2) + (ROTATE_SPAN - lerp * ROTATE_SPAN);

    // Go through menu children.
    this.options.forEach((option, index) => {
      const theta = bias + ((index / this.options.length) * (Math.PI * 2));
      const x = Math.cos(theta) * this.radius * lerpMod;
      const y = Math.sin(theta) * this.radius * lerpMod;
      option.position.set(Math.round(x), Math.round(y));
    });
  }

  addOption(content, options) {
    const option = new PIXI.Container();
    option.interactive = true;
    option.buttonMode = true;

    const back = new PIXI.Graphics();

    const anchor = new PIXI.Point(0.5, 0.5);
    content.anchor = anchor;
    option.anchor = anchor;
    back.anchor = anchor;

    // Draw back.
    if (options.fill) {
      back.beginFill(options.fill.color, options.fill.alpha);
    }
    if (options.border) {
      back.lineStyle(options.border.width, options.border.color, options.border.alpha);
    }
    if (options.shape === 'circle') {
      back.drawCircle(0, 0, options.radius * 2);
      back.scale.set(0.5, 0.5);
    } else if (options.shape === 'square') {
      back.drawRoundedRect(-options.radius, -options.radius, options.radius * 2, options.radius * 2, 3);
    }
    if (options.fill) {
      back.endFill();
    }

    option.addChild(back);
    option.addChild(content);
    option.content = content;

    let downTime;
    const down = event => {
      console.log('down');
      event.stopPropagation();
      downTime = new Date().getTime();
    };

    const up = event => {
      if (!downTime) return;
      event.stopPropagation();
      const delta = new Date().getTime() - downTime;
      console.log('delta: ' + delta);
      if (delta <= 250) {
        if (options.onClick) options.onClick();
      }
      downTime = undefined;
    };

    option.on('pointerdown', down);
    option.on('pointerup', up);
    option.on('pointerupoutside', up);

    this.options.push(option);
    this.addChild(option);
  }

  open() {
    if (this._open) return;
    this._open = true;
    this.visible = true;
    this.alpha = 0;
    const animation = ease.add(this, { alpha: 1 }, { ease: 'linear', duration: 200 });
    animation.on('each', () => {
      this.updatePositions();
    });

    this.options.forEach(option => {
      option.buttonMode = true;
      option.interactive = true;
    });
  }

  close() {
    if (!this._open) return;
    this._open = false;
    const animation = ease.add(this, { alpha: 0 }, { ease: 'linear', duration: 200 });
    animation.on('each', () => {
      this.updatePositions();
    });
    animation.on('complete', () => {
      this.visible = false;
    });

    this.options.forEach(option => {
      option.buttonMode = false;
      option.interactive = false;
    });
  }

  isOpen() {
    return this._open;
  }
}

export default RadialButtonMenu;
