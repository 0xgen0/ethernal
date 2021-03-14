if (typeof window !== 'undefined') {
  window.process = { browser: true };
  window.global = window;
}
require('./app.js');
