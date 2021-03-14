class ReadOnly {
  constructor(store) {
    this.store = store;
  }

  subscribe(subscriber) {
    return this.store.subscribe(subscriber);
  }
}

export default ReadOnly;
