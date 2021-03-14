const {increaseTime} = require('../lib');

increaseTime(1000000)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
