import retry from 'p-retry';

const _cacheApiInjected = CACHE_API;
const _serverListInjected = SERVER_LIST;

const _fallback = _cacheApiInjected === '' ? `http://${window.location.hostname}:3399` : _cacheApiInjected;

const fetchCacheUrl = () => retry(() => fetch(_serverListInjected).then(result => result.text()).then(async url => {
  const version = await fetch(url).then(result => result.json());
  if (version.ethernalCache === 'ok') {
    console.log('connecting to cache', url, version);
    return url;
  } else {
    throw new Error(`cache api ${url} not ok`);
  }
}));

const cacheUrlPromise = async () => {
  let cacheUrl = null;
  if (_serverListInjected.includes('http')) {
    setInterval(async () => {
      console.log('checking cache api for changes');
      const url = await fetchCacheUrl();
      if (url && url !== cacheUrl) {
        console.log('detected new cache', url);
        window.location.reload()
      }
    }, (15 + Math.random() * 15) * 1000);
    cacheUrl = await fetchCacheUrl();
    console.log('cache api url fetched from server list', _serverListInjected);
  } else {
    cacheUrl = _fallback;
    console.log('cache api url set from static config');
  }
  console.log('cache api url set', cacheUrl);
  return cacheUrl;
};

const _cacheUrl = cacheUrlPromise();

export default _cacheUrl;
