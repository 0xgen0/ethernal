import { Sprite } from 'pixi.js';

export default class MagicSprite extends Sprite {
  constructor(texture) {
    super(texture);

    this.camera = undefined;
    this.containsPoint = undefined;
    this.interactive = false;
  }

  updateTransform() {
    this.transform.updateLocalTransform();

    if (this.camera) {
      this.worldTransform.copyFrom(this.localTransform);
      this.worldTransform.prepend(this.camera.invertedMatrix);
      this._transformID = -1;
    }
  }
}
