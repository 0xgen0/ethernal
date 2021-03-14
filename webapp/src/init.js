import { getParamsFromURLHash, getParamsFromURL, rebuildLocationHash } from 'utils/web';
import { CURRENT_GAME_VERSION, CURRENT_PREDUNGEON_VERSION } from 'data/constants';

const getItem = key => {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
};

// Set current game version
const gameVersion = getItem('version');
if (!gameVersion || parseInt(gameVersion, 10) < CURRENT_GAME_VERSION) {
  localStorage.clear();
  localStorage.setItem('version', CURRENT_GAME_VERSION);
}

// Set current intro (predungeon) version
const preDungeonVersion = getItem('preDungeonVersion');
if (!preDungeonVersion || parseInt(preDungeonVersion, 10) < CURRENT_PREDUNGEON_VERSION) {
  localStorage.setItem('preDungeonVersion', CURRENT_PREDUNGEON_VERSION);
  localStorage.removeItem('characterChoice');
  localStorage.removeItem('preDungeon');
}

// Determine current hash parameters
if (process.browser) {
  window.params = getParamsFromURL();
  window.hashParams = getParamsFromURLHash();

  if (window.hashParams.dungeonKey) {
    localStorage.removeItem('__last_wallet_used');
  }

  if (window.hashParams.clearLocalStorage) {
    delete window.hashParams.clearLocalStorage;
    rebuildLocationHash(window.hashParams);
    localStorage.clear();
  }
}
