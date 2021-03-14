import 'pixi.js';
import { createBorder } from './UIUtils';

/**
 * TODO: Document.
 *
 * @param path {string} The path to the file or URL or texture of the icon to display.
 * @param fallbackTexture {PIXI.Texture} The path to the file or URL or texture of the icon to display.
 *
 * @constructor
 */
const TextureIcon = function(dimensions, path, fallbackTexture) {
  PIXI.Container.call(this);

  this.position.x = dimensions.x;
  this.position.y = dimensions.y;
  this._width = dimensions.width;
  this._height = dimensions.height;

  this.path = path;
  if (this.path) {
    try {
      this.texture = PIXI.Texture.from(path);
      this.texture.on('load', () => {
        this.sprite.texture = this.texture;
      });
    } catch (e) {
      console.error(`Failed to load texture: '${path}'`);
      console.error(e);
    }
  }

  this.sprite = new PIXI.Sprite(fallbackTexture);
  // this.sprite.position.x = 1;
  // this.sprite.position.y = 1;
  // this.sprite.anchor.set(0.5, 0.5);
  // this.sprite.position.x = Math.floor(this._width / 2);
  // this.sprite.position.y = Math.floor(this._height / 2);

  if (!fallbackTexture.valid) {
    fallbackTexture.on('load', () => {
      this.sprite.texture = fallbackTexture;
    });
  }

  this.setBorderColor(0x464646);
};

TextureIcon.prototype = Object.create(PIXI.Container.prototype);

TextureIcon.prototype.setBorderColor = function(color) {
  this.color = color;
  this.border = createBorder(this._width, this._height, 0, this.color);
  this.apply();
};

TextureIcon.prototype.apply = function() {
  this.removeChildren();
  this.addChild(this.border);
  this.addChild(this.sprite);
};

export default TextureIcon;
