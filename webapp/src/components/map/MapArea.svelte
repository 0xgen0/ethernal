<script>
  import { onMount, onDestroy } from 'svelte';
  import * as Sentry from '@sentry/browser';
  import { characterFeatures } from 'lib/cache';
  import nprogress from 'nprogress';
  import router from 'page';
  import 'pixi.js';
  import { Viewport } from 'pixi-viewport';

  window.PIXI = PIXI;
  require('pixi-layers');

  import log from 'utils/log';
  import { menuOverlay, notificationOverlay } from 'stores/screen';
  import { dungeon, map as mapStore } from 'stores/dungeon';
  import { currentRoom, characterStatus, currentFloor } from 'lib/cache';
  import { getAreaByType } from 'data/elements';

  import MapRenderer from 'canvas/map/render/MapRenderer';
  import { MAX_FPS } from 'canvas/common/Utils';
  import MapUpdates from 'canvas/map/MapUpdates';
  import UI from 'canvas/map/UI';

  import BoxButton from 'components/BoxButton';
  import MiniMap from 'components/map/MiniMap';

  import IconHere from 'assets/icons/marker_2x.png';
  import IconMinimap from 'assets/icons/minimap_4x.png';
  import IconLoading from 'assets/icons/loading_2x.png';
  import IconClose from 'assets/close.png';

  export let hidden;

  let app;
  let container;
  let _w;
  let _h;
  let ui;
  let map;
  let mapViewport;
  let mapUpdates;
  let mapNavEnabled = false;
  let expandMiniMap = false;
  let roomCoordinates;

  $: area = getAreaByType($currentRoom.areaType);

  /** Route handler */
  let startingCoordinates;
  router('/room/:coords', ({ params }) => {
    const { coords } = params;
    if (!map || loader.progress !== 100) {
      startingCoordinates = coords;
    } else {
      map.refocus(coords);
    }
  });
  router.start();

  /** PIXI loader handlers */
  const loader = PIXI.Loader.shared;
  const resize = () => {
    _w = container.clientWidth;
    _h = container.clientHeight;
    mapViewport.resize(_w, _h);
    app.renderer.resize(_w, _h);
  };
  const handleLoadProgress = ({ progress }) => {
    log.debug(`${progress}% loaded`);
    nprogress.set(progress / 100);
  };
  const handleLoadAsset = (_, resource) => {
    log.debug(`Asset loaded ${resource.name}`);
  };
  const handleLoadError = () => {
    log.error('Load error');
    nprogress.error();
  };

  /** Page init */
  const init = async () => {
    if (map != null || loader.progress !== 100) {
      return;
    }

    ui = new UI(mapViewport, $dungeon.cache, app);

    if (map == null) {
      map = new MapRenderer(mapViewport, app, ui);
      global.map = map;
      map.init();
      app.ticker.add(() => {
        map.onUpdate();
        map.onPostUpdate();
      });
    }

    mapUpdates = new MapUpdates($dungeon.cache, map);
    await mapUpdates.init(startingCoordinates);
    mapStore.set(map);

    mapNavEnabled = true;
  };

  /** Page mount */
  onMount(() => {
    // Load them google fonts before starting...!
    window.WebFontConfig = {
      google: {
        families: ['Space Mono', 'VT323'],
      },
      active() {
        init();
      },
    };

    /** --- PIXI MAP --- */
    /* eslint-disable */
    // include the web-font loader script
    (function () {
      const wf = document.createElement('script');
      wf.src = `${
        document.location.protocol === 'https:' ? 'https' : 'http'
      }://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js`;
      wf.type = 'text/javascript';
      wf.async = 'true';
      const s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(wf, s);
    })();
    /* eslint-enabled */

    _w = container.clientWidth;
    _h = container.clientHeight;

    let _w2 = _w / 2;
    let _h2 = _h / 2;
    if (Math.floor(_w2) !== _w2) {
      _w -= 1;
    }
    if (Math.floor(_h2) !== _h2) {
      _h -= 1;
    }

    PIXI.tilemap.Constant.maxTextures = 4;

    /* set up pixi app */
    try {
      app = new PIXI.Application({
        width: _w,
        height: _h,
        resolution: window.devicePixelRatio,
        autoDensity: true,
        backgroundColor: 0x000000,
      });

      PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

      app.ticker.maxFPS = MAX_FPS;
      app.stage = new PIXI.display.Stage();
      app.stage.sortableChildren = true;

      mapViewport = new Viewport({
        screenWidth: _w,
        screenHeight: _h,
        worldWidth: _w,
        worldHeight: _h,
        interaction: app.renderer.plugins.interaction, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
      });
      app.stage.addChild(mapViewport);
      mapViewport
        .drag()
        .wheel()
        // .pinch()
        .decelerate()
        .clampZoom({ minWidth: _w / 3, minHeight: _h / 3, maxWidth: _w * 3, maxHeight: _h * 3 });

      loader.add('icon_def', '/images/ui/icon_def.png');
      loader.add('icon_select_atk', '/images/ui/attackSelectIcon.png');
      loader.add('icon_select_def', '/images/ui/defenseSelectIcon.png');

      // UI icons for modifier stats.
      loader.add('modifier_icon_armor_s', '/images/ui/modifier/icon_armor_s.png');
      loader.add('modifier_icon_atk_s', '/images/ui/modifier/icon_atk_s.png');
      loader.add('modifier_icon_def_s', '/images/ui/modifier/icon_def_s.png');
      loader.add('modifier_icon_dmg_s', '/images/ui/modifier/icon_dmg_s.png');
      loader.add('modifier_icon_hp_s', '/images/ui/modifier/icon_hp_s.png');
      loader.add('icon_armor_s', '/images/ui/icon_armor_s.png');

      loader.add('portrait_adv', '/images/ui/portraits/port_adv_6x.png');
      loader.add('portrait_bar', '/images/ui/portraits/port_bar_6x.png');
      loader.add('portrait_war', '/images/ui/portraits/port_war_6x.png');
      loader.add('portrait_wiz', '/images/ui/portraits/port_wiz_6x.png');

      loader.add('icon_atk_s', '/images/ui/icon_atk_s.png');
      loader.add('icon_def_s', '/images/ui/icon_def_s.png');
      loader.add('icon_dmg_s', '/images/ui/icon_dmg_s.png');
      loader.add('icon_hp_s', '/images/ui/icon_hp_s.png');

      // UI icons for combat cards.
      loader.add('icon_action_armor', '/images/ui/icon_action_armor.png');
      loader.add('icon_action_atk', '/images/ui/icon_action_atk.png');
      loader.add('icon_action_def', '/images/ui/icon_action_def.png');
      loader.add('icon_action_dmg', '/images/ui/icon_action_dmg.png');
      loader.add('icon_action_hp', '/images/ui/icon_action_hp.png');

      loader.add('fx_curses', `/images/fx_curses.json?${COMMIT}`);
      loader.add('character_classes', `/images/map/character_classes.json?${COMMIT}`);

      // New Map TileSets.
      loader.add('arrows', '/images/map/arrows.png');
      loader.add('path', '/images/map/path.png');
      // all map folder, except arrows and path
      loader.add('tilemaps', `/images/map/tilemaps.json?${COMMIT}`);
      loader.add('sheet', `/images/pixi-art.json?${COMMIT}`);

      // Icon box for the map radial menu.
      loader.add('icon_box_02', '/images/ui/icons/interaction/box02_36x36.png');
      // Icons for the map radial menu.
      loader.add('help_icon_16', '/images/ui/icons/interaction/help_16x16.png');
      loader.add('chat_icon_16', '/images/ui/icons/interaction/chat_16x16.png');
      loader.add('mail_icon_16', '/images/ui/icons/interaction/mail_16x16.png');
      loader.add('trade_icon_16', '/images/ui/icons/interaction/trade_16x16.png');
      loader.add('party_icon_16', '/images/ui/icons/interaction/party_16x16.png');
      loader.add('guild_icon_16', '/images/ui/icons/interaction/guild02_16x16.png');

      loader.onStart.add(nprogress.start);
      loader.onProgress.add(handleLoadProgress);
      loader.onLoad.add(handleLoadAsset);
      loader.onComplete.add(nprogress.done);
      loader.onError.add(handleLoadError);

      // Make sure all textures copy this setting when loaded in & instantiated.
      PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
      loader.load(init);
      container.appendChild(app.view);

      /* make responsive */
      window.addEventListener('resize', resize);
    } catch (err) {
      if (/WebGL unsupported in this browser/.test(err.message)) {
        notificationOverlay.open('generic', { class: 'error', text: 'Ethernal requires a hardware accelerated WebGL-enabled device to play.', closeable: false });
      }
      Sentry.captureException(err);
    }
  });

  onDestroy(() => {
    window.removeEventListener('resize', resize);
  });

  const toggleMiniMap = () => {
    expandMiniMap = !expandMiniMap;
  };

  const onRoomClick = coordinates => {
    menuOverlay.open('roomInfo', { coordinates });
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(-360deg);
    }
  }

  .map-area {
    position: relative;
    width: 100%;
    height: 100%;

    &--loading {
      pointer-events: none;
      position: absolute;
      top: calc(50% - #{$header-height});
      left: 0;
      right: 0;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.12s ease-out;
      text-align: center;
      font-size: 12px;

      img {
        width: auto;
        height: 2em;
      }

      .is-loading & {
        opacity: 0.48;

        img {
          animation: rotate 1s infinite;
          transform-origin: center center;
        }
      }
    }

    &--canvas {
      width: 100%;
      height: 100%;
    }

    &--footer {
      pointer-events: none;
      display: flex;
      position: absolute;
      bottom: 0;
      right: 0;
      left: 0;
      z-index: 10;
      justify-content: stretch;
      align-items: flex-end;
      padding: 20px 12px 0px 12px;
      background: linear-gradient(to top, rgba($color-black, 0.8), rgba($color-black, 0.8) 90%, transparent);

      @media screen and (min-width: $desktop-min-width) {
        height: 40px;
        padding: 24px 0 16px 24px;
      }

      h3,
      a {
        cursor: pointer;
        pointer-events: all;
        color: currentColor;
        transition: opacity 0.2s ease-in-out;

        &:hover {
          opacity: 0.64;
        }
      }

      h4 a {
        text-decoration: underline;
      }
    }

    .right {
      display: inline-flex;
      flex-shrink: 0;
      margin-left: 12px;

      @media screen and (min-width: $desktop-min-width) {
        min-height: 48px;
      }

      :global(button) {
        margin-left: 8px;

        @media screen and (min-width: $desktop-min-width) {
          margin-left: 10px;
        }
      }
    }

    .left {
      display: inline-flex;
      flex: 1;
    }

    .icon {
      line-height: 1em;

      img {
        display: inline-block;
        width: 60%;
        height: auto;
        vertical-align: middle;
      }
    }

    .gameover {
      width: 100%;
      max-width: $desktop-menu-width;
      margin: 0 auto;
      text-align: center;

      @media screen and (max-width: $mobile-max-width) {
        padding-top: 50px;
      }
    }

    .room-title {
      padding-top: 0px;
      margin-left: 8px;

      h3 {
        .underline {
          text-decoration: underline;
          text-decoration-color: rgba($color-light, 0.42);
          text-underline-position: under;
        }
      }

      @media screen and (min-width: $desktop-min-width) {
        margin-left: 10px;
      }

      @media screen and (max-width: $mobile-max-width) {
        h3 {
          font-size: 12px;
        }
        h4 {
          font-size: 10px;
        }
      }
    }

    .area-name {
      margin: 1px 0 5px 10px;
      font-size: 13px;

      @media screen and (max-width: $mobile-max-width) {
        font-size: 10px;
      }
    }

    .area-info {
      flex-direction: column;
      text-align: right;
      display: flex;
      // justify-content: space-between;
      // margin: 0 24px;
      // padding: 10px 0 8px;
      color: $color-lightGrey;
      text-transform: uppercase;

      @media screen and (max-width: $mobile-max-width) {
        h4 {
          font-size: 10px;
        }
      }
    }

    .area-color {
      display: inline-block;
      width: 8px;
      height: 8px;
    }

    .lighter {
      color: $color-lightGrey;
    }
  }

  .minimap {
    position: absolute;
    bottom: 58px;
    right: 0;
    z-index: 15;

    @media screen and (max-width: $mobile-max-width) {
      top: -$mobile-menu-height;
      left: 0;
      right: 0;
    }

    @media screen and (min-width: $desktop-min-width) {
      bottom: 88px;
      max-width: 290px;
      max-height: 260px;
      min-width: 50px;
      min-height: 50px;
      width: 100%;
      height: 100%;
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
  }
</style>

<div class="map-area {$$props.class || ''} {mapNavEnabled ? '' : 'is-loading'} {hidden ? 'canvas-hidden' : ''}">
  <div class="map-area--loading">
    <img src="{IconLoading}" alt="loading..." />
  </div>

  <div class="map-area--canvas" bind:this="{container}"></div>

  {#if expandMiniMap}
    <div class="minimap">
      <MiniMap enabled="{mapNavEnabled}" toggleMap="{() => toggleMiniMap()}" />
    </div>
  {/if}

  <div class="map-area--footer">
    {#if $characterStatus === 'dead'}
      <div class="gameover">
        {#if $menuOverlay.screen !== 'rebirth'}
          <BoxButton type="wide full" onClick="{() => menuOverlay.open('rebirth')}">Create a new character</BoxButton>
        {/if}
      </div>
    {:else}
      <div class="left">
        <BoxButton type="secondary map-footer-icon" onClick="{() => map && map.refocus()}">
          <span class="icon">
            <img src="{IconHere}" alt="here" />
          </span>
        </BoxButton>
        <div class="room-title">
          <h3 on:click="{() => onRoomClick($currentRoom.coordinates)}">
            <span class="underline">{$currentRoom.customName || $currentRoom.name}</span>
            <span class="lighter">{$currentRoom.formattedCoordinates}</span>
          </h3>
          <h4>
            Room Block
            <a href="{BLOCK_EXPLORER_URL}/{$currentRoom.blockNumber}" rel="noopener nofollow" target="_blank">
              #{Number($currentRoom.blockNumber)}
            </a>
          </h4>
        </div>
      </div>

      <div class="right">
        <div class="area-info">
          {#if area}
            <div class="area-name">
              <div
                class="area-color"
                style="{`background-color: #${(area.color && area.color.toString(16)) || '979797'};`}"
              ></div>
              {area.key || ''} Area
            </div>
          {/if}
          <h4>Floor {$currentFloor}</h4>
        </div>

        {#if $characterFeatures.minimap}
          <BoxButton
            type="secondary map-footer-icon"
            class="{expandMiniMap ? 'highlight' : ''}"
            onClick="{() => toggleMiniMap()}"
          >
            {#if expandMiniMap}
              <span class="icon">
                <img src="{IconClose}" alt="minimap" />
              </span>
            {:else}
              <span class="icon">
                <img src="{IconMinimap}" alt="minimap" />
              </span>
            {/if}
          </BoxButton>
        {/if}
      </div>
    {/if}
  </div>
</div>
