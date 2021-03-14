class Dirtable {
  constructor() {
    this.dirty = true;
  }

  /** @return {boolean} Returns 'true' if the object is dirty. */
  isDirty() {
    return this.dirty;
  }

  /**
   * Sets the dirt state of the object.
   *
   * @param flag The state to set.
   */
  setDirty(flag) {
    this.dirty = flag;
  }
}

export default Dirtable;
