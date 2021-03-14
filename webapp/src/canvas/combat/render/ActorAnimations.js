import { ease } from 'pixi-ease';

/**
 * TODO: Document.
 *
 * @type {{DEATH: string, DAMAGE: string}}
 */
export const DamageAnimationType = {
  DAMAGE: 'damage',
  DEATH: 'death',
};

/**
 * TODO: Arbitrate this method into a implemented effects class for other types of attacks. -Josh
 *
 * @param type {string} The type of animation to play out. ('damage', 'death')
 * @param sprite {PIXI.Sprite} The sprite to animate.
 * @param damageText {PIXI.Text} The text asset to animate.
 */
export const flash = (type, sprite, damageText, callback) => {
  if (sprite == null) {
    if (damageText) {
      damageText.alpha = 1;
      ease.add(damageText, { y: -50 }, { duration: 500 });
      ease.add(damageText, { alpha: 0 }, { duration: 1000 });
    }
  } else {
    const flash1 = ease.add(sprite, { alpha: 0 }, { duration: 100 });
    flash1.once('complete', () => {
      const flash2 = ease.add(sprite, { alpha: 1 }, { duration: 100 });
      flash2.once('complete', () => {
        if (type === DamageAnimationType.DEATH) {
          ease.add(sprite, { alpha: 0 }, { duration: 1000 });
        } else {
          const flash3 = ease.add(sprite, { alpha: 0 }, { duration: 100 });
          flash3.once('complete', () => {
            // NOTE: I think this is already true at this point. -Josh
            if (type === DamageAnimationType.DAMAGE) {
              ease.add(sprite, { alpha: 1 }, { duration: 100 });

              if (damageText) {
                damageText.alpha = 1;
                ease.add(damageText, { y: -50 }, { duration: 500 });
                ease.add(damageText, { alpha: 0 }, { duration: 1000 });
              }
            }
            if (callback) {
              callback();
            }
          });
        }
      });
    });
  }
};
