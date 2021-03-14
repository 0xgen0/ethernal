import 'pixi.js';
import { ease } from 'pixi-ease';
import { OtherInfo, OtherInfoSize } from './OtherInfo';

const RESIZE_THRESHOLD = 3;

class OtherPanel extends PIXI.Container {
  /**
   * @param combatRenderer {CombatRenderer}
   */
  constructor(combatRenderer) {
    super();
    this.combatRenderer = combatRenderer;
    this.others = {};
    this.update(true);
  }

  /**
   * @private
   */
  update(immediately) {
    let xOffset = 0;
    Object.keys(this.others).forEach(key => {
      const next = this.others[key];
      if (!next) {
        return;
      }

      next.position.x = xOffset;

      if (this.size > RESIZE_THRESHOLD) {
        this.addChild(next);
        next.setSize(OtherInfoSize.SMALL);
        xOffset += 28;
      } else {
        next.setSize(OtherInfoSize.LARGE);
        xOffset += next.width + 27;
      }
    });

    if (immediately) {
      this.position.x = this.combatRenderer.width / 2 - this.width / 2;
    } else {
      ease.add(this, { x: this.combatRenderer.width / 2 - this.width / 2 }, { duration: 600 });
    }
  }

  destroy(options) {
    Object.values(this.others).forEach(other => {
      other.destroy(options);
    });
    super.destroy(options);
  }

  /**
   * @param actor {CombatCharacter}
   */
  join(actor, immediate = true, force = false) {
    if (this.others[actor.id] != null) {
      return;
    }

    const otherSize = this.size + 1 > RESIZE_THRESHOLD ? OtherInfoSize.SMALL : OtherInfoSize.LARGE;
    const obj = new OtherInfo(actor, otherSize);
    this.others[actor.id] = obj;
    this.addChild(obj);
    this.update(immediate);
  }

  /**
   * @param characterId {string}
   */
  leave(characterId, immediate) {
    console.log(`leave(${characterId})`);
    const info = this.others[characterId];
    if (info == null) {
      return;
    }

    ease.add(info, { alpha: 0 }, { duration: 600 }).on('complete', () => {
      delete this.others[characterId];
      this.removeChild(info);
      info.destroy();
      this.update(immediate);
    });
  }

  /**
   * @param characterId {string}
   */
  contains(characterId) {
    return this.others[characterId] != null;
  }

  /**
   * @return {number} Returns the amount of characters rendered in the other panel.
   */
  get size() {
    return Object.keys(this.others).length;
  }
}

export default OtherPanel;
