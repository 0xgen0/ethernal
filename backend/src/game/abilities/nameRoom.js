const Ability = require('./ability');

class NameRoom extends Ability {
  price = {coins: 20}; // defined by contract, cannot be changed here
  name = 'Room Name';
  image = 'item_book3.png';
  requirements = {
    income: 1000,
  };
  local = true;
}

module.exports = NameRoom;
