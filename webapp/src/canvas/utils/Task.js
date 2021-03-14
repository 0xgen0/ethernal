class Task {
  constructor() {
    this.ticks = 0;
    this.tickCurrent = 0;
    this.running = false;
  }

  /**
   * @param ticks {number} The number of ticks to run the task.
   */
  start(ticks) {
    this.ticks = ticks;
    this.tickCurrent = 0;
    if (this.onStart) this.onStart(this.tickCurrent / this.ticks);
    this.running = true;
    this.done = false;
  }

  update() {
    if (!this.running) {
      return;
    }

    this.tickCurrent += 1;
    if (this.onNext) this.onNext(this.tickCurrent / this.ticks);
    if (this.tickCurrent >= this.ticks) {
      this.finish();
    }
  }

  finish() {
    this.done = true;
    this.running = false;
    if (this.onFinish) this.onFinish(this.tickCurrent / this.ticks);
  }

  isRunning() {
    return this.running;
  }

  isFinished() {
    return this.done;
  }

  /**
   * @param lerp {number}
   *
   * @abstract
   */
  onStart(lerp) {

  }

  /**
   * @param lerp {number}
   *
   * @abstract
   */
  onNext(lerp) {

  }

  /**
   * @param lerp {number}
   *
   * @abstract
   */
  onFinish(lerp) {

  }
}

export default Task;
