class Progress {
  constructor(status, threshold = 1) {
    this.status = status;
    this.threshold = threshold;
    this.progress = 0;
  }

  tick() {
    this.progress += 1;
    if (this.progress % this.threshold === 0) {
      console.log(`${this.status} ${this.progress}`);
    }
  }
}

module.exports = Progress;
