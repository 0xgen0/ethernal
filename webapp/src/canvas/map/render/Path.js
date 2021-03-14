import { Ease } from 'pixi-ease';
import Direction from '../../utils/Direction';
import Character  from './Character';

/**
 * TODO: Replace in-place move methods to {@link Character#moveTo}. -Josh
 */
class CharacterPath {
  constructor(character, to) {
    this.character = character;
    this.to = to;
    this.steps = [];
    this.step = -1;
    this.ease = new Ease({});
  }
  /**
   *
   * @param {Character} character
   * @param {*} direction
   * @param {*} x
   * @param {*} y
   * @param {*} mode
   * @param {*} callback
   */
  moveCharacter(character, direction, x, y, mode, callback) {
    // internally use animations, we can't acces to it
    return character.move(direction, x, y, mode, callback, this);
  }

  teleportCharacter(character, x, y) {
    const moveChar = this.ease.add(character, { alpha: 0 }, { duration: 500 });
    moveChar.once('complete', () => {
      character.position.set(x, y);
      this.ease.add(character, { alpha: 1 }, { duration: 500 });
    });

    character.lastCoords.x = x;
    character.lastCoords.y = y;
  }

  /**
   * @param once {boolean?} (Optional) Set to false to run the path to the end.
   *
   * @private
   */
  _next(once = true) {
    this.step += 1;
    const next = this.steps[this.step];

    if (this.onNextPath) {
      this.onNextPath(this.step, next);
    }
    this.moveCharacter(this.character, next.direction, next.x, next.y, next.easeMode, () => {
      this.animation = undefined;
      if (!once) {
        if (this.isFinished()) {
          if (this.onFinish) {
            this.onFinish(next.x, next.y, false);
            this.onFinish = undefined;
          }
          return;
        }
        this._next(once);
      }
    });
  }

  addStep(step) {
    this.steps.push(step);
  }

  /**
   * @param onNextPath {function(step: number, position: {x: number, y: number}?} (Optional)
   * @param onFinish {function(step: number, position: {x: number, y: number}?} (Optional)
   */
  play(onNextPath, onFinish) {
    this.onNextPath = onNextPath;
    this.onFinish = onFinish;
    this.checkIfAlreadyPlaying();
    this._next(false);
  }

  finish(teleport = false) {
    this.step = this.steps.length - 1;
    const _step = this.steps[this.step];
    this.ease.removeAll();

    // Stop the player from looking around if the path is already complete for my player.
    this.character.lookAround(false);
    if (teleport) {
      this.teleportCharacter(this.character, _step.x, _step.y);
    }

    if (this.onFinish) {
      this.onFinish(_step.x, _step.y, teleport);
      this.onFinish = undefined;
    }
  }

  getLast() {
    return !this.isEmpty() ? this.steps[this.steps.length - 1] : undefined;
  }

  isFinished() {
    return !this.isEmpty() && this.step === this.steps.length - 1;
  }

  size() {
    return this.steps.length;
  }

  isEmpty() {
    return this.size() === 0;
  }

  isPlaying() {
    return this.animation != null;
  }

  /**
   * @private
   */
  checkIfAlreadyPlaying() {
    if (this.isPlaying()) {
      throw new Error('The path is already playing and cannot step.');
    }
  }
}

export default CharacterPath;
