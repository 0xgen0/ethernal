import Dirtable from './Dirtable';

/**
 * The <i>Updatable</i> class is used for simple components that requires updates per tick.
 */
class Updatable extends Dirtable {
  /**
   * Before the conventional update method.
   *
   * NOTE: Update anything you need to before the conventional update here.
   *
   * @abstract
   */
  preUpdate() {}

  /**
   * Updates the render for combats.
   *
   * @param delta {number} the amount of time since the last update. (in milliseconds)
   *
   * @abstract
   */
  update(delta) {}

  /**
   * After the conventional update method.
   *
   * NOTE: Update flags or other tasks required to update after the conventional update here.
   *
   * @abstract
   */
  postUpdate() {}
}

export default Updatable;
