import Task from '../../../utils/Task';

const lerp = (start, stop, percent) => {
  if (start === stop) {
    return start;
  }
  return start + percent * (stop - start);
};

class FlipAnimation extends Task {
  /**
   *
   * @param object {PIXI.Sprite}
   * @param factor {number}
   */
  constructor(object, factor) {
    super();

    this.object = object;
    this.fromX = object.scale.x;
    this.toX = this.fromX > 0 ? -factor : factor;
  }

  // @Override
  onStart() {
    this.object.scale.x = this.fromX;
  }

  // @Override
  onNext(lerpValue) {
    this.object.scale.x = lerp(this.fromX, this.toX, lerpValue);
  }

  // @Override
  onFinish() {
    this.object.scale.x = this.toX;
  }
}

export default FlipAnimation;
