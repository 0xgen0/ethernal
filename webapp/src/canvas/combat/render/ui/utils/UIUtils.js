import 'pixi.js';

/**
 * Draws the border of a box with a border radius of 1 pixel.
 *
 * @param color {number} The color of the border to draw.
 *
 * @return {PIXI.Graphics} Returns a graphics object with a drawn border.
 */
export const createBorder = (width, height, radius, color) => {
  const graphics = new PIXI.Graphics();
  graphics.lineStyle(1, color);

  if (radius === 0) {
    const x1 = 0.5;
    const y1 = 0.5;
    const x2 = width + 0.5;
    const y2 = height + 0.5;

    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y1);
    graphics.lineTo(x2, y2);
    graphics.lineTo(x1, y2);

    graphics.closePath();
  } else if (radius === 1) {
    // Top border.
    graphics.moveTo(1.5, 0.5);
    graphics.lineTo(width - 1, 0.5);

    // Right border.
    graphics.moveTo(width - 0.5, 0.5);
    graphics.lineTo(width - 0.5, height - 1.5);

    // Bottom border.
    graphics.moveTo(1.5, height - 0.5);
    graphics.lineTo(width - 1, height - 0.5);

    // Left border.
    graphics.moveTo(0.5, 0.5);
    graphics.lineTo(0.5, height - 1.5);

    graphics.closePath();
  }

  return graphics;
};
