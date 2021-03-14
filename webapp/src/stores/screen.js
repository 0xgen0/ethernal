import { get, writable } from 'svelte/store';

/*
 * SCREEN DIMENSIONS
 * --------------------------------------------------------
 */

// Determine screen sizes and calculate window dimensions
const evalIsDesktop = () => window.matchMedia('screen and (min-width: 976px)').matches;
const evalIsMobile = () => window.matchMedia('screen and (max-width: 975px)').matches;
const evalWindowSize = () => ({
  height: window.innerHeight,
  width: window.innerWidth,
});

// Store screen size booleans and recalculate on resize
export const isDesktop = writable(evalIsDesktop());
export const isMobile = writable(evalIsMobile());
export const windowSize = writable(evalWindowSize());
window.addEventListener('resize', () => {
  isDesktop.update(evalIsDesktop);
  isMobile.update(evalIsMobile);
  windowSize.update(evalWindowSize);
});

/*
 * SCREEN UI SLOT-------------------------------------
 */

// Create store with expand, collapse, and close methods
const writableScreen = (defaultVals, opts) => {
  const store = writable(defaultVals);

  // Persist history of nav changes. (For back button use.)
  const len = 20;
  const list = [];

  // Store previous pageviews
  const addHistory = n => {
    list.unshift(n);
    list.splice(len, list.length - len);
  };
  // Track page views
  const track = page => {
    if (opts.trackable && window.ga) {
      window.ga('send', 'pageview', `/${page.screen}`);
    }
  };

  return {
    ...store,
    history: () => list,
    isOpen: () => {
      const current = get(store);
      return current && current.screen !== defaultVals.screen;
    },
    toggle: (screen, args) =>
      store.update(prev => {
        addHistory(prev);
        const page = screen !== prev.screen ? { screen, ...args } : defaultVals;
        track(page);
        return page;
      }),
    expand: () =>
      store.update(prev => {
        list[0] = { ...prev, expanded: true };
        return list[0];
      }),
    collapse: () =>
      store.update(prev => {
        list[0] = { ...prev, expanded: false };
        return list[0];
      }),
    open: (screen, opts) =>
      store.update(prev => {
        const page = { screen, ...opts };
        // Terrible, but only way to compare equally.
        if (JSON.stringify(prev) !== JSON.stringify(page)) {
          addHistory(prev);
        }
        track(page);
        return page;
      }),
    close: () =>
      store.update(prev => {
        addHistory(prev);
        track(defaultVals);
        return defaultVals;
      }),
    back: () =>
      store.update(() => {
        const page = list.shift();
        track(page);
        return page;
      }),
    find: screens => {
      const current = get(store);
      return current && screens && screens[current.screen] && { ...screens[current.screen], ...current };
    },
  };
};

// Overlays on desktop left-side menu area. On mobile, this is fullscreen
export const menuOverlay = writableScreen({}, { trackable: true });

// Overlays on map area on desktop and mobile. On mobile, this covers map text
export const mapOverlay = writableScreen({}, { trackable: true });

// Overlays as bottom drawer on map
export const mapModal = writableScreen({}, { trackable: true });

// Overlays over everything
export const gameOverlay = writableScreen({}, { trackable: true });

// Action notification overlays
export const notificationOverlay = (() => {
  const store = writable(false);

  let intv;
  const close = () => {
    clearTimeout(intv);
    return store.update(() => false);
  };
  const open = (type, opts) => {
    close();
    if (opts.timeout) {
      intv = setTimeout(close, opts.timeout);
    }
    return store.update(() => ({ ...opts, type, id: Date.now() }));
  };

  return { ...store, open, close };
})();
