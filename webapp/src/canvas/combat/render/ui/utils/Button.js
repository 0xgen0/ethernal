import 'pixi.js';
import { ease } from 'pixi-ease';

/*
 * TECHNICAL NOTES:
 *
 *  - This is not needed, however a potential optimization for this utility is to cache graphics here
 *    as textures with sprites to render them.
 *
 *  - Dimensions of the render methods are offsetted by 0.5 to preserve the 1-pixel width of the graphics
 *    objects.
 *
 *  - '_width' and '_height' are used to make sure that the container's 'this.width' and 'this.height'
 *    don't conflict with the source dimensions of the button.
 */

/**
 * The default palette for any implemented button.
 *
 * @type {{normal: {border: string, borderShadow: string}, hover: {border: string, borderShadow: string}, pressed: {border: string, borderShadow: string}}}
 */
export const DEFAULT_BUTTON_PALETTE = {
  normal: {
    background: 0,
    border: 0xc4c4c4,
    borderShadow: 0x6b6b6b,
  },
  hover: {
    background: 0,
    border: 0xffffff,
    borderShadow: 0x6b6b6b,
  },
  pressed: {
    background: 0,
    border: 0xffffff,
    borderShadow: 0x000000,
  },
};

/**
 * The default options for any implemented button.
 *
 * @type {{border: boolean, useCache: boolean, palette: {normal: {border: string, borderShadow: string}, hover: {border: string, borderShadow: string}, pressed: {border: string, borderShadow: string}}, borderShadow: boolean}}
 */
export const DEFAULT_BUTTON_OPTIONS = {
  render: {
    border: true,
    borderShadow: true,
    background: true,
  },
  palette: DEFAULT_BUTTON_PALETTE,
};

/**
 * Creates a general-purpose button for use in the combat UI. This component renders and handles state-driven
 * effects and triggers pointer events to handle.
 *
 * <ul><p>Events:
 *   <li>onPointerDown()
 *   <li>onPointerUp()
 *   <li>onPointerHover(flag)
 * </ul>
 *
 * @param dimensions {PIXI.Rectangle}
 * @param options {=}
 *
 * @constructor
 */
export class Button extends PIXI.Container {
  constructor(dimensions, options) {
    super();

    this.position.x = dimensions.x;
    this.position.y = dimensions.y;
    this._width = dimensions.width;
    this._height = dimensions.height;

    // Button logic.
    this.hitArea = new PIXI.Rectangle(0, 0, this._width, this._height);
    this.buttonMode = true;
    this.interactive = true;

    // Optimization logic.
    this.interactiveChildren = false;
    this.sortDirty = false;

    // Implementable event hooks.
    this.onPointerDown = null; // ()
    this.onPointerUp = null; // ()
    this.onPointerHover = null; // (flag: boolean)

    // Create a content wrapper so that offsets by the implemented content container does not
    //   affect the offset of the pressed state of the button.
    this.contentWrapper = new PIXI.Container();
    this.contentWrapper.interactive = false;
    this.contentWrapper.interactiveChildren = false;
    this.content = new PIXI.Container();
    this.contentWrapper.addChild(this.content);

    this.hovered = false;

    // Make sure the options are properly formatted. If required data is missing,
    //   fill it with default options.
    if (options == null) {
      options = { ...DEFAULT_BUTTON_OPTIONS };
    }
    if (!options.palette) {
      options.palette = DEFAULT_BUTTON_PALETTE;
    }
    if (!options.palette.normal) {
      options.palette.normal = DEFAULT_BUTTON_OPTIONS.palette.normal;
    }
    this.options = options;

    // Render the components of the button to render.
    this.cache = this.drawFrame(this._width, this._height, this.options.palette);

    this.on('pointerover', () => {
      this.pointerHover(true);
    });
    this.on('pointerout', () => {
      this.pointerHover(false);
    });
    this.on('pointerdown', () => {
      this.pointerDown();
    });
    this.on('pointerup', () => {
      this.pointerUp();
    });

    this.renderNormal();
  }

  /**
   * Renders graphics for states of a button.
   *
   * @param width The width of the button.
   * @param height The height of the button.
   * @param palette The colors to render the graphics.
   *
   * @return The set of rendered graphics to use for button(s).
   */
  drawFrame(width, height, palette) {
    // Create the array to store the cached results.
    const cache = {};

    // NOTE: Add 0.5 to maintain 1px thickness.

    /**
     * Draws the background of a box with a border radius of 1 pixel.
     *
     * @param graphics {PIXI.Graphics} The graphics instance to draw on.
     * @param color {number} The color of the border to draw.
     */
    const drawBackground = (graphics, color) => {
      graphics.beginFill(color);
      graphics.drawRect(1.5, 1.5, width - 1.5, height - 1.5);
      graphics.endFill();
    };

    /**
     * Draws the border of a box with a border radius of 1 pixel.
     *
     * @param graphics {PIXI.Graphics} The graphics instance to draw on.
     * @param color {number} The color of the border to draw.
     */
    const drawBorder = (graphics, color) => {
      graphics.lineStyle(1, color);
      // graphics.drawRoundedRect(0, 0, width, height, 1);

      // Top border.
      graphics.moveTo(1.5, 1);
      graphics.lineTo(width - 1, 1);

      // Right border.
      graphics.moveTo(width - 0.5, 1.5);
      graphics.lineTo(width - 0.5, height - 0.5);

      // Bottom border.
      graphics.moveTo(1.5, height - 0.5);
      graphics.lineTo(width - 1, height - 0.5);

      // Left border.
      graphics.moveTo(0.5, 1.5);
      graphics.lineTo(0.5, height - 0.5);

      graphics.closePath();
    };

    /**
     * Draws the shadow for the border of a box with a border radius of 1 pixel.
     *
     * @param graphics {PIXI.Graphics} The graphics instance to draw on.
     * @param color {number} The color of the border to draw.
     */
    const drawBorderShadow = (graphics, color) => {
      // Bottom border.
      graphics.lineStyle(1, color);
      graphics.moveTo(0.5, 0.5);
      graphics.lineTo(width - 1.5, 0.5);
      graphics.closePath();
    };

    /**
     * Draws a state profile for a button.
     *
     * @param subCache The profile for the render cache to draw on.
     * @param subPalette The palette category to use to color the profile.
     */
    const draw = (subCache, subPalette) => {
      subCache.background = new PIXI.Graphics();
      drawBackground(subCache.background, subPalette.background);
      subCache.background.cacheAsBitmap = true;

      subCache.border = new PIXI.Graphics();
      drawBorder(subCache.border, subPalette.border);
      subCache.border.cacheAsBitmap = true;

      subCache.borderShadow = new PIXI.Graphics();
      drawBorderShadow(subCache.borderShadow, subPalette.borderShadow);
      subCache.borderShadow.position.x = 1;
      subCache.borderShadow.cacheAsBitmap = true;
    };

    // Normal (default) state of the button.
    cache.normal = [];

    draw(cache.normal, palette.normal);

    // Optional render states.
    if (palette.hover) {
      cache.hover = [];
      draw(cache.hover, palette.hover);
    }
    if (palette.pressed) {
      cache.pressed = [];
      draw(cache.pressed, palette.pressed);

      // Offset the pressed by one.
      cache.pressed.border.y = 1;
      cache.pressed.borderShadow.y = 1;
    }

    return cache;
  }

  enable() {
    this.interactive = true;
    this.buttonMode = true;
    this.enabled = true;
    this.alpha = 1;
  }

  disable() {
    this.interactive = false;
    this.buttonMode = false;
    this.enabled = false;
    this.alpha = 0.3;
  }

  showImmediately() {
    this.visible = true;
    this.alpha = 1;
  }

  hideImmediately() {
    this.visible = false;
    this.alpha = 0;
  }

  show() {
    this.visible = true;
    ease.add(this, { alpha: 1 }, { duration: 200 });
  }

  hide() {
    const hide = ease.add(this, { alpha: 0 }, { duration: 200 });
    hide.on('complete', () => {
      this.visible = false;
    });
  }

  /**
   * @param flag {boolean} If set true, this enables hovering.
   *
   * @private
   */
  pointerHover(flag) {
    this.hovered = flag;

    if (flag && this.cache.hover) {
      this.renderHovered();
    } else {
      this.renderNormal();
    }

    // If the implemented event function exists, call it.
    if (this.onPointerHover && typeof this.onPointerHover === 'function') {
      this.onPointerHover(flag);
    }
  }

  /** @private */
  pointerDown() {
    if (this.cache.pressed) {
      this.renderPressed();
    } else {
      this.renderNormal();
    }

    // If the implemented event function exists, call it.
    if (this.onPointerDown && typeof this.onPointerDown === 'function') {
      this.onPointerDown();
    }
  }

  /** @private */
  pointerUp() {
    if (this.hovered && this.cache.hover) {
      this.renderHovered();
    } else {
      this.renderNormal();
    }

    // If the implemented event function exists, call it.
    if (this.onPointerUp && typeof this.onPointerUp === 'function') {
      this.onPointerUp();
    }
  }

  /** @private */
  renderNormal() {
    this.removeChildren();
    if (this.options.render.background) {
      this.addChild(this.cache.normal.background);
    }
    if (this.options.render.borderShadow) {
      this.addChild(this.cache.normal.borderShadow);
      this.cache.normal.borderShadow.position.y = this._height;
    }
    if (this.options.render.border) {
      this.addChild(this.cache.normal.border);
    }
    this.contentWrapper.position.y = 0;
    this.addChild(this.contentWrapper);
  }

  /** @private */
  renderPressed() {
    this.removeChildren();
    if (this.options.render.background) {
      this.addChild(this.cache.pressed.background);
    }
    if (this.options.render.borderShadow) {
      this.addChild(this.cache.pressed.borderShadow);
      this.cache.normal.borderShadow.position.y = this._height + 1;
    }
    if (this.options.render.border) {
      this.addChild(this.cache.pressed.border);
    }
    this.contentWrapper.position.y = 1;
    this.addChild(this.contentWrapper);
  }

  /** @private */
  renderHovered() {
    this.removeChildren();
    if (this.options.render.background) {
      this.addChild(this.cache.hover.background);
    }
    if (this.options.render.borderShadow) {
      this.addChild(this.cache.hover.borderShadow);
    }
    if (this.options.render.border) {
      this.addChild(this.cache.hover.border);
    }
    this.contentWrapper.position.y = 0;
    this.addChild(this.contentWrapper);
  }
}
