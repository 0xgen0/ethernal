const getParamsFromURL = str => {
  const url = str || window.location.href;
  const obj = {};
  const hash = url.lastIndexOf('#');

  let cleanedUrl = url;
  if (hash !== -1) {
    cleanedUrl = cleanedUrl.slice(0, hash);
  }

  const question = cleanedUrl.indexOf('?');
  if (question !== -1) {
    cleanedUrl
      .slice(question + 1)
      .split('&')
      .forEach(piece => {
        const [key, val = ''] = piece.split('=');
        obj[decodeURIComponent(key)] = decodeURIComponent(val);
      });
  }
  return obj;
};

const getParamsFromURLHash = str => {
  const url = str || window.location.hash;
  const obj = {};
  const hash = url.lastIndexOf('#');

  if (hash !== -1) {
    url
      .slice(hash + 1)
      .split('&')
      .forEach(piece => {
        const [key, val = ''] = piece.split('=');
        obj[decodeURIComponent(key)] = decodeURIComponent(val);
      });
  }
  return obj;
};

const rebuildLocationHash = hashParams => {
  let reconstructedHash = '#';
  Object.entries(hashParams).forEach(param => {
    if (reconstructedHash !== '#') {
      reconstructedHash += '&';
    }
    reconstructedHash += param.join('=');
  });

  if ('replaceState' in window.history) {
    window.history.replaceState(
      '',
      document.title,
      window.location.pathname + window.location.search + reconstructedHash,
    );
  } else {
    // Prevent scrolling by storing the page's current scroll offset
    const { scrollTop, scrollLeft } = document.body;
    window.location.hash = '';

    // Restore the scroll offset, should be flicker free
    document.body.scrollTop = scrollTop;
    document.body.scrollLeft = scrollLeft;
  }
};

const chrome76Detection = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { quota } = await navigator.storage.estimate();
    return quota < 120000000;
  }
  return false;
};

const isNewChrome = () => {
  const pieces = navigator.userAgent.match(/Chrom(?:e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/);
  if (pieces === null || pieces.length !== 5) {
    return undefined;
  }
  const major = pieces.map(piece => parseInt(piece, 10))[1];
  return major >= 76;
};

const isPrivateWindow = () => {
  return new Promise(resolve => {
    try {
      const isSafari =
        navigator.vendor &&
        navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent &&
        navigator.userAgent.indexOf('CriOS') === -1 &&
        navigator.userAgent.indexOf('FxiOS') === -1;

      if (isSafari) {
        // Safari
        let e = false;
        if (window.safariIncognito) {
          e = true;
        } else {
          try {
            window.openDatabase(null, null, null, null);
            window.localStorage.setItem('test', 1);
            resolve(false);
          } catch (err) {
            e = true;
            resolve(true);
          }
          // eslint-disable-next-line no-unused-expressions, no-void
          void !e && ((e = !1), window.localStorage.removeItem('test'));
        }
      } else if (navigator.userAgent.includes('Firefox')) {
        // Firefox
        const db = indexedDB.open('test');
        db.onerror = () => {
          resolve(true);
        };
        db.onsuccess = () => {
          resolve(false);
        };
      } else if (
        navigator.userAgent.includes('Edge') ||
        navigator.userAgent.includes('Trident') ||
        navigator.userAgent.includes('msie')
      ) {
        // Edge or IE
        if (!window.indexedDB && (window.PointerEvent || window.MSPointerEvent)) {
          resolve(true);
        }
        resolve(false);
      } else {
        // Normally ORP or Chrome
        if (isNewChrome()) {
          resolve(chrome76Detection());
        }

        const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
        if (!fs) {
          resolve(null);
        } else {
          fs(
            window.TEMPORARY,
            100,
            () => resolve(false),
            () => resolve(true),
          );
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      resolve(null);
    }
  });
};

module.exports = {
  getParamsFromURLHash,
  rebuildLocationHash,
  isPrivateWindow,
  getParamsFromURL,
};
