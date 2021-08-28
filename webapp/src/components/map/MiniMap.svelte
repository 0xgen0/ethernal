<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';

  import { dungeon, map as mapStore } from 'stores/dungeon';
  import {
    characterId,
    characterStatus,
    bossRooms,
    npcRooms,
    chestRooms,
    teleportRooms,
    monsterRooms,
    foreclosedRooms,
    currentRoom,
    onlineCharacters,
    viewport,
  } from 'lib/cache';
  import { isMobile } from 'stores/screen';
  import { getCoordinatesFloor } from 'utils/utils';

  import IconCharacter from 'assets/icons/map_character_4x.png';
  import IconItems from 'assets/icons/map_chest_4x.png';
  import IconMonster from 'assets/monster.png';
  import IconCoin from 'assets/icons/coin_2x.png';

  export let allowRefocus = true;
  export let coordinates;
  export let defaultZoom = 5;
  export let enabled = false;
  export let floor;
  export let hideItems = false;
  export let hideToggles = false;
  export let highlightMonsters = false;
  export let highlightRooms = [];
  export let id = 'dungeon-map';
  export let onHighlightRoom;
  export let onTeleportChange;
  export let teleportsOverlay = false;
  export let toggleMap;

  let currentCoordinates;
  let currentFloor;
  let currentViewport;
  let mounted;
  let minimap;
  let tilemap;
  let bossesOverlay = true;
  let chestsOverlay = true;
  let npcOverlay = true;
  let playersOverlay = true;

  const tileSize = 1024;
  const baseSize = tileSize / 512;

  const markers = {
    npcs: {},
    players: {},
    bosses: {},
    monsters: {},
    chests: {},
    teleports: {},
    highlightRooms: {},
    foreclosedRooms: {},
  };

  const icons = {
    currentPosition: L.icon({
      iconUrl: '/images/minimap-icons/myChar-bar.png',
      iconSize: [22, 26],
      iconAnchor: [11, 26],
    }),
    player: L.icon({
      iconUrl: '/images/minimap-icons/char-mag.png',
      iconSize: [12, 12],
    }),
    npc: L.icon({
      iconUrl: '/images/minimap-icons/npc.png',
      iconSize: [12, 12],
    }),
    monster: L.icon({
      iconUrl: '/images/minimap-icons/monster.png',
      iconSize: [9.72, 12],
    }),
    boss: L.icon({
      iconUrl: '/images/minimap-icons/monster-boss.png',
      iconSize: [9.72, 12],
    }),
    chest: L.icon({
      iconUrl: '/images/minimap-icons/chest.png',
      iconSize: [12, 9.36],
    }),
    teleport: L.icon({
      iconUrl: '/images/minimap-icons/mm-teleport.png',
      iconSize: [28, 28],
    }),
    highlightRoom: L.icon({
      iconUrl: '/images/minimap-icons/mm-myroom.png',
      iconSize: [22, 22],
    }),
    saleRoom: L.icon({
      iconUrl: '/images/minimap-icons/mm-saleroom.png',
      iconSize: [14, 14],
    }),
  };

  $: (async () => {
    currentCoordinates = coordinates || $currentRoom.coordinates;
    const newFloor = floor != null ? floor : getCoordinatesFloor(currentCoordinates);

    if (currentFloor !== newFloor) {
      currentFloor = newFloor;

      const viewport = await $dungeon.cache.fetchMapViewport(currentFloor);
      if (viewport !== currentViewport) {
        currentViewport = viewport;
      }
    }
  })();

  // Redraw tiles on floor change
  $: if (minimap && tilemap && currentFloor != null && currentViewport) {
    const bounds = L.latLngBounds(
      L.latLng(coordsToLatLng([currentViewport.maxX + 10, currentViewport.maxY + 10].join(','))),
      L.latLng(coordsToLatLng([currentViewport.minX - 10, currentViewport.minY - 10].join(','))),
    );
    minimap.setMaxBounds(bounds);
    tilemap.redraw();
  }

  // Move minimap currentPosition marker
  $: if (minimap && currentCoordinates && currentFloor != null && markers.currentPosition) {
    if (getCoordinatesFloor(currentCoordinates) === Number(currentFloor)) {
      markers.currentPosition.addTo(minimap);
      markers.currentPosition.setLatLng(coordsToLatLng(currentCoordinates));
    } else {
      markers.currentPosition.remove();
    }
  }

  // Handle add/remove/move of onlineCharacters
  $: minimap && !hideItems && currentFloor != null && $onlineCharacters && displayOnlineCharacters();
  const displayOnlineCharacters = () => {
    const prev = Object.keys(markers.players);
    Object.values($onlineCharacters).forEach(({ character, coordinates: coords }) => {
      if (!coords || $characterId === character) {
        return;
      }
      const latLng = coordsToLatLng(coords);
      if (getCoordinatesFloor(coords) !== Number(currentFloor)) {
        return;
      }
      if (markers.players[character]) {
        markers.players[character].setLatLng(latLng);
        prev.splice(prev.indexOf(character), 1);
        return;
      }
      // L.marker.autoresizable()
      markers.players[character] = L.marker(latLng, { icon: icons.player, zIndexOffset: 20 });
      markers.playersGroup.layers.addLayer(markers.players[character]);
    });
    prev.forEach(k => {
      markers.players[k].remove();
      delete markers.players[k];
    });
  };

  // Handle add/remove of bosses, chests, and NPCs
  $: minimap &&
    (!hideItems || highlightMonsters) &&
    currentFloor !== null &&
    $monsterRooms &&
    displayItems($monsterRooms, 'monsters', 'monsterGroup', icons.monster, highlightMonsters ? 10 : 6);
  $: minimap &&
    !hideItems &&
    currentFloor !== null &&
    $bossRooms &&
    displayItems($bossRooms, 'bosses', 'bossesGroup', icons.boss, 7);
  $: minimap &&
    !hideItems &&
    currentFloor !== null &&
    $chestRooms &&
    displayItems($chestRooms, 'chests', 'chestsGroup', icons.chest, 5);
  $: minimap &&
    !hideItems &&
    currentFloor !== null &&
    $npcRooms &&
    displayItems($npcRooms, 'npcs', 'npcsGroup', icons.npc, 4);
  $: minimap &&
    !hideItems &&
    currentFloor !== null &&
    $teleportRooms &&
    displayItems($teleportRooms, 'teleports', 'teleportsGroup', icons.teleport, 9);
  $: minimap &&
    currentFloor !== null &&
    highlightRooms &&
    displayItems(highlightRooms, 'highlightRooms', 'highlightRoomsGroup', icons.highlightRoom, 8);
  $: minimap &&
    !hideItems &&
    currentFloor !== null &&
    $foreclosedRooms &&
    displayItems($foreclosedRooms, 'foreclosedRooms', 'foreclosedRoomsGroup', icons.saleRoom, 2);
  const displayItems = (items, keys, group, icon, zIndexOffset = 1) => {
    if (!markers[keys]) {
      return;
    }

    const prev = Object.keys(markers[keys]);
    Object.values(items).forEach(item => {
      const coordinates = item.coordinates || item;
      if (!coordinates) {
        return;
      }
      const latLng = coordsToLatLng(coordinates);
      if (getCoordinatesFloor(coordinates) !== Number(currentFloor)) {
        return;
      }
      if (keys === 'teleports' && coordinates === currentCoordinates) {
        return;
      }
      if (markers[keys][coordinates]) {
        markers[keys][coordinates].setLatLng(latLng);
        prev.splice(prev.indexOf(coordinates), 1);
        return;
      }
      // L.marker.autoresizable()
      markers[keys][coordinates] = L.marker(latLng, {
        icon,
        interactive: [onTeleportChange && 'teleports', onHighlightRoom && 'highlightRooms']
          .filter(Boolean)
          .includes(keys),
        zIndexOffset,
      });
      if (keys === 'teleports' && onTeleportChange) {
        markers[keys][coordinates].on('click', () => onTeleportChange(coordinates));
      }
      if (keys === 'highlightRooms' && onHighlightRoom) {
        markers[keys][coordinates].on('click', () => onHighlightRoom(coordinates));
      }
      markers[group].layers.addLayer(markers[keys][coordinates]);
    });
    prev.forEach(k => {
      markers[keys][k].remove();
      delete markers[keys][k];
    });
  };

  /** Leaflet helpers */
  const coordsToLatLng = coords => {
    const [x, y] = coords.split(',').map(Number);
    return [y + 0.5, x + 0.5].map(r => r / baseSize);
  };
  const latLngToCoords = (lat, lng) => {
    const x = Math.round(lng * baseSize - 0.5);
    const y = Math.round(lat * baseSize - 0.5);
    return [x, y].join(',');
  };
  const toggleLayerGroup = key => {
    if (markers[key].expanded) {
      markers[key].layers.addTo(minimap);
    } else {
      markers[key].layers.remove();
    }
  };

  onMount(() => {
    mounted = true;
  });

  $: if (mounted && enabled && !minimap) {
    const layerOpts = {
      tileSize,
      maxNativeZoom: 6,
      maxZoom: 6,
      minNativeZoom: 6,
      minZoom: 4,
      // bounds,
      noWrap: true,
    };

    // Use simple CMS with inverted -y
    L.CRS.Dungeon = L.extend({}, L.CRS.Simple, {
      transformation: new L.Transformation(1, 0, 1, 0),
      infinite: false,
    });

    // L.Marker.Autoresizable = L.Marker.extend({
    //   onAdd: function (map) {
    //     map.on('zoomend', this._changeIcon, this);
    //     L.Marker.prototype.onAdd.call(this, map);
    //   },
    //   onRemove: function (map) {
    //     map.off('zoomend', this._changeIcon, this);
    //     L.Marker.prototype.onRemove.call(this, map);
    //   },
    //   _changeIcon: function () {
    //     // const zoom = this._map.getZoom();
    //     // console.log('ZOOM', zoom, Math.pow(2, zoom));
    //     // // if (zoom <= 10) {
    //     // //   this.setIcon(...);
    //     // // } elseif (zoom > 10 && zoom <= 15) {
    //     // //   this.setIcon(...);
    //     // // } else {
    //     // //   this.setIcon(...);
    //     // // }
    //   }
    // });
    // L.marker.autoresizable = (latlng, opts) => new L.Marker.Autoresizable(latlng, opts);

    // Initialize map
    minimap = L.map(id, {
      attributionControl: false,
      crs: L.CRS.Dungeon,
      tms: true,
      maxBoundsViscosity: 0.5,
      zoomControl: false,
    });

    // Set coords
    minimap.setView(coordsToLatLng(currentCoordinates || '0,0'), defaultZoom);

    // Disable doubleClickZoom due to poor support for dblclick & click event handlers
    minimap.doubleClickZoom.disable();

    // Add zoom to bottom right
    L.control.zoom({ position: 'topright' }).addTo(minimap);

    L.TileLayer.Dungeon = L.TileLayer.extend({
      getTileUrl: ({ x, y }) => {
        const env = ASSET_ENV;
        const cache = Date.now();
        return `https://assets.dev.ethernal.world/${env}/map/chunks/${x},${y},${currentFloor}.png?${cache}`;
      },
    });
    L.tileLayer.dungeon = (url, opts) => new L.TileLayer.Dungeon(url, opts);
    tilemap = L.tileLayer.dungeon('', layerOpts).addTo(minimap);

    // Add current position
    // L.marker.autoresizable()
    markers.currentPosition = L.marker(coordsToLatLng(currentCoordinates || '0,0'), {
      zIndexOffset: 9999,
      icon: icons.currentPosition,
      interactive: false,
    });
    if (Number(currentFloor) === getCoordinatesFloor(currentCoordinates)) {
      markers.currentPosition.addTo(minimap);
    }

    // Highlighted rooms group
    markers.highlightRoomsGroup = { expanded: true, layers: L.layerGroup([]) };
    toggleLayerGroup('highlightRoomsGroup');

    // Add POI layer groups
    markers.npcsGroup = { expanded: true, layers: L.layerGroup([]) };
    markers.chestsGroup = { expanded: true, layers: L.layerGroup([]) };
    markers.bossesGroup = { expanded: true, layers: L.layerGroup([]) };
    markers.monsterGroup = { expanded: true, layers: L.layerGroup([]) };
    markers.playersGroup = { expanded: true, layers: L.layerGroup([]) };
    markers.foreclosedRoomsGroup = { expanded: true, layers: L.layerGroup([]) };
    markers.teleportsGroup = { expanded: teleportsOverlay, layers: L.layerGroup([]) };

    toggleLayerGroup('monsterGroup');
    toggleLayerGroup('npcsGroup');
    toggleLayerGroup('chestsGroup');
    toggleLayerGroup('bossesGroup');
    toggleLayerGroup('playersGroup');
    toggleLayerGroup('teleportsGroup');
    toggleLayerGroup('foreclosedRoomsGroup');

    // Add POI layer controls
    if (!hideToggles) {
      const poiLayer = (keys, text, src) => ({
        _active: true,
        onAdd: function (map) {
          const elImg = L.DomUtil.create('img');
          elImg.src = src;
          elImg.title = text;
          elImg.alt = text;
          const el = L.DomUtil.create('button');
          el.appendChild(elImg);
          L.DomUtil.addClass(el, 'minimap-control-btn');

          el.onclick = evt => {
            evt.preventDefault();
            this._active = !this._active;
            if (!this._active) {
              L.DomUtil.addClass(el, 'disabled');
            } else {
              L.DomUtil.removeClass(el, 'disabled');
            }

            keys.forEach(key => {
              const layer = markers[key].layers;
              if (this._active) {
                layer.addTo(map);
              } else {
                layer.remove();
              }
            });
            return true;
          };

          return el;
        },
      });
      L.Control.Characters = L.Control.extend(poiLayer(['playersGroup'], 'Chararacters', IconCharacter));
      L.Control.Monsters = L.Control.extend(poiLayer(['bossesGroup', 'monsterGroup'], 'Monsters', IconMonster));
      L.Control.Items = L.Control.extend(poiLayer(['npcsGroup', 'chestsGroup'], 'Items', IconItems));
      L.Control.ForeclosedRooms = L.Control.extend(poiLayer(['foreclosedRoomsGroup'], 'Foreclosed Rooms', IconCoin));
      L.control.characters = opts => new L.Control.Characters(opts);
      L.control.monsters = opts => new L.Control.Monsters(opts);
      L.control.items = opts => new L.Control.Items(opts);
      L.control.foreclosedRooms = opts => new L.Control.ForeclosedRooms(opts);
      L.control.characters({ position: 'topright' }).addTo(minimap);
      L.control.monsters({ position: 'topright' }).addTo(minimap);
      L.control.items({ position: 'topright' }).addTo(minimap);
      L.control.foreclosedRooms({ position: 'topright' }).addTo(minimap);
    }

    // @TODO - LATER ADD BOUNDING MAP RECTANGLE AND REPOSITION ON MAP MOVE
    // marker.bounds = L.rectangle([[0, 0], [0, 0]], { color: "#999", weight: 1 }).addTo(minimap);
    // @TODO - LISTEN FOR CHANGE TO RENDER MAP BOUNDERY IN MINIMAP
    // global.map.mapViewport
    //   .on('zoomed-end', (...args) => {})
    //   .on('drag-end', (...args) => {})
    //   .on('moved-end', (...args) => {});

    // Refocus map on click
    if (allowRefocus) {
      minimap.on('click', ({ latlng: { lat, lng } }) => {
        const coords = latLngToCoords(lat, lng);
        const [x, y] = coords.split(',');

        if (
          x >= currentViewport.minX &&
          x <= currentViewport.maxX &&
          y >= currentViewport.minY &&
          y <= currentViewport.maxY
        ) {
          console.log('clicked inside map bounds', coords, x, y);
          if ($isMobile && toggleMap) {
            toggleMap();
          }
          global.map.refocus(coords);
        } else {
          console.log('clicked outside map bounds', coords, x, y);
        }
      });
    }

    // SHOW DEBUG GRID
    // L.GridLayer.GridDebug = L.GridLayer.extend({
    //   createTile: coords => {
    //     const tile = document.createElement('div');
    //     tile.style.outline = '1px solid rgba(255,255,255,0.5)';
    //     tile.style.fontWeight = 'bold';
    //     tile.style.fontSize = '10px';
    //     tile.style.color = 'white';
    //     tile.innerHTML = [coords.z, coords.x, coords.y].join('/');
    //     return tile;
    //   },
    // });
    // L.gridLayer.gridDebug = opts => new L.GridLayer.GridDebug({...opts, ...layerOpts });
    // minimap.addLayer(L.gridLayer.gridDebug());
  }
</script>

<style lang="scss">
  @import '../../styles/variables';

  .minimap {
    height: 100%;
    background-color: $color-background;

    @media screen and (min-width: $desktop-min-width) {
      width: 100%;
      background-color: $color-background;
    }

    &--map {
      width: 100%;
      height: 100%;
      background: transparent;
    }

    :global(.leaflet-bar a, .minimap-control-btn) {
      cursor: pointer;
      width: 36px;
      height: 32px;
      line-height: 32px;
      background-color: $color-dark;
      color: $color-light;
      border-bottom-color: $color-grey;
    }
    :global(.minimap-control-btn) {
      cursor: pointer !important;
      border-radius: 4px;
      border: none;
      outline: none;
      font-size: 9px;
      text-align: center;
      line-height: 16px;
    }
    :global(.minimap-control-btn img) {
      height: 16px;
      vertical-align: middle;
    }
    :global(.leaflet-disabled, .minimap-control-btn.disabled) {
      background-color: $color-dark;
      color: $color-light;
      opacity: 0.48;
    }
    :global(.leaflet-disabled) {
      cursor: not-allowed;
    }
  }
</style>

<div class="minimap">
  <div {id} class="minimap--map"></div>
</div>
