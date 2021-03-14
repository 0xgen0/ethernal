import FlipAnimation from './FlipAnimation';
import HopAnimation from './HopAnimation';
import Task from '../../../utils/Task';
import ResetAnimation from './ResetAnimation';

class AnimationGroup {
  constructor(object) {
    this.object = object;
    this.animation = null;

    this.weightMap = [];
    this.weightOffset = 0;
    this.resetProfile = {
      type: 'reset',
      ticks: 20,
      position: {
        x: 0,
        y: 0,
      },
      scale: {
        x: 1,
        y: 1,
      },
    };
    this.animating = false;
  }

  add(weight, profile) {
    for (let index = 0; index < weight; index += 1) {
      this.weightMap.push(profile);
    }
    this.weightOffset += weight;
  }

  update() {
    if (!this.animation || this.animation.isFinished()) {
      if (this.animating) {
        this.nextAnimation();
      }
    } else {
      this.animation.update();
    }
  }

  /** @private */
  nextAnimation() {
    const roll = Math.floor(Math.random() * this.weightOffset);
    const profile = this.weightMap[roll];

    if (this.lastProfile && this.lastProfile === profile && !this.lastProfile.duplicate) {
      return;
    }

    if (profile.type === 'flip') {
      this.animation = new FlipAnimation(this.object, profile.scaleFactor);
    } else if (profile.type === 'hop') {
      const { limit } = profile;
      const fromX = this.object.position.x;
      const positive = fromX < -limit ? true : fromX > limit ? false : Math.random() >= 0.5 ? 1 : -1;
      const rand = Math.random() * 10;
      let toX = positive * 10 + (this.object.position.x + positive * rand);
      if (toX > limit) {
        toX = limit;
      } else if (toX < -limit) {
        toX = -limit;
      }
      this.animation = new HopAnimation(this.object, toX);
    } else if (profile.type === 'none') {
      this.animation = new Task();
    } else if (profile.type === 'reset') {
      this.animation = new ResetAnimation(this.object, this.resetProfile);
    }
    this.animation.start(profile.ticks);

    this.lastProfile = profile;
  }

  setReset(profile) {
    this.resetProfile = profile;
  }

  reset() {
    this.animating = false;
    this.animation = new ResetAnimation(this.object, this.resetProfile);
  }
}

export default AnimationGroup;
