const Dagger = require('@maticnetwork/eth-dagger');
const Events = require('./events');

class DaggerEvents extends Events {
  constructor(provider, db, server) {
    super(provider, db);
    console.log('listening for events with dagger ' + server);
    this.dagger = new Dagger(server);
  }

  onBlock(callback, confirmed = false) {
    this.dagger.on((confirmed ? 'stable' : 'latest') + ':block', callback);
  }

  on(contract, eventName, callback, prefetch, confirmed = false) {
    super.on(contract, eventName, callback, prefetch, confirmed);
    const topic = contract.interface.getEventTopic(eventName);
    const filter =
      (confirmed ? 'confirmed' : 'latest') + ':log/' + contract.address.toLowerCase() + '/filter/' + topic + '/#';
    this.dagger.on(filter, async log => {
      const event = this.parseLog(contract, log);
      await this.useDeferrableCallback(callback, prefetch)(...Array.from(event.args), event, false);
    });
    return this;
  }

  onConfirmed(contract, eventName, callback) {
    return this.on(contract, eventName, callback, null, true);
  }
}

module.exports = DaggerEvents;
