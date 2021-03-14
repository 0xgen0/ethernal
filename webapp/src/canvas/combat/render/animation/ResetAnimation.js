import Task from '../../../utils/Task';

const lerp = (start, stop, percent) => {
  if (start === stop) {
    return start;
  }
  return start + percent * (stop - start);
};

class ResetAnimation extends Task {
  constructor(object, profile) {
    super();
    this.object = object;
    this.profile = profile;
    this.startPositionX = object.position.x;
    this.startPositionY = object.position.y;
    this.startScaleX = object.scale.x;
    this.startScaleY = object.scale.y;
    this.stopPositionX = profile.position.x;
    this.stopPositionY = profile.position.y;
    this.stopScaleX = profile.scale.x;
    this.stopScaleY = profile.scale.y;
    this.start(profile.ticks);
  }

  // @Override
  onStart() {
    this.object.position.set(this.startPositionX, this.startPositionY);
    this.object.scale.set(this.startScaleX, this.startScaleY);
  }

  // @Override
  onNext(lerpFactor) {
    this.object.position.x = lerp(this.startPositionX, this.stopPositionX, lerpFactor);
    this.object.position.y = lerp(this.startPositionY, this.stopPositionY, lerpFactor);
    this.object.scale.x = lerp(this.startScaleX, this.stopScaleX, lerpFactor);
    this.object.scale.y = lerp(this.startScaleY, this.stopScaleY, lerpFactor);
  }

  // @Override
  onFinish() {
    this.object.position.set(this.stopPositionX, this.stopPositionY);
    this.object.scale.set(this.stopScaleX, this.stopScaleY);
  }
}

export default ResetAnimation;
