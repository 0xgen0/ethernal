import Task from '../../../utils/Task';

class HopAnimation extends Task {
  /**
   *
   * @param object {PIXI.Sprite}
   * @param toX {number}
   */
  constructor(object, toX) {
    super();

    this.object = object;
    this.fromX = Math.floor(object.position.x);
    this.toX = Math.floor(toX);

    this.direction = object.position.x < this.toX;

    const minX = Math.min(this.fromX, this.toX);
    const maxX = Math.max(this.fromX, this.toX);

    this.diameter = maxX - minX;
    this.radius = this.diameter / 2;
    this.centerX = minX + this.radius;
    this.centerY = object.position.y;
    this.yMultiplier = Math.random() / 2;
  }

  // @Override
  onStart() {
    this.object.position.set(this.fromX, this.centerY);
  }

  // @Override
  onNext(lerp) {
    const angle = this.direction ? Math.PI - lerp * Math.PI : lerp * Math.PI;
    const x = Math.floor(this.centerX + Math.cos(angle) * this.radius);
    const y = Math.floor(this.centerY - Math.sin(angle) * this.yMultiplier * this.radius);
    this.object.position.set(x, y);
  }

  // @Override
  onFinish() {
    this.object.position.set(this.toX, this.centerY);
  }
}

export default HopAnimation;
