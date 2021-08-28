const Dagger = require('@maticnetwork/eth-dagger');
const Events = require('./events');

class DaggerEvents extends Events {
  constructor(provider, server) {
    super(provider);
    console.log('listening for events with dagger ' + server);
    this.dagger = new Dagger(server);
  }

  onBlock(callback, confirmed = false) {
    this.dagger.on((confirmed ? 'stable' : 'latest') + ':block', callback);
  }

  on(contract, eventName, addedCallback, _, confirmed = false) {
    const topic = contract.interface.getEventTopic(eventName);
    const filter =
      (confirmed ? 'confirmed' : 'latest') + ':log/' + contract.address.toLowerCase() + '/filter/' + topic + '/#';
    this.dagger.on(filter, log => {
      const event = this.parseLog(contract, log);
      this.useDeferrableCallback(addedCallback)(...Array.from(event.args), event);
    });
    return this;
  }

  onConfirmed(contract, eventName, callback) {
    return this.on(contract, eventName, callback, () => true, true);
  }
}

module.exports = DaggerEvents;
