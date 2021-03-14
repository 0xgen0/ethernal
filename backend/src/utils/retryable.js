const retry = require('p-retry');

const retryable = (fn, retryConfig) => (...args) => retry(() => fn(...args), retryConfig);

module.exports = retryable;
