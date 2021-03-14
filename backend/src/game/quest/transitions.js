const TRANSITIONS = Object.freeze({
  discovered: ['accepted', 'rejected'],
  accepted: ['accepted', 'claiming', 'failed', 'rejected'],
  claiming: ['completed'],
  completed: [],
  failed: [],
  rejected: ['accepted'],
});

module.exports = TRANSITIONS;
