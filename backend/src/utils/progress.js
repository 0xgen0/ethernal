class Progress {
  constructor(status, threshold = 1, progress = 0) {
    this.status = status;
    this.threshold = threshold;
    this.progress = progress;
  }

  tick(inc = 1) {
    for (let i = 0; i < inc; i++) {
      this.progress += 1;
      if (this.progress % this.threshold === 0) {
        console.log(`${this.status} ${this.progress}`);
      }
    }
  }
}

module.exports = Progress;
