<script>
  import { onMount, onDestroy } from 'svelte';
  import 'pixi.js';

  window.PIXI = PIXI;
  require('pixi-layers');

  import { dungeon } from 'stores/dungeon';
  import { mapOverlay, menuOverlay } from 'stores/screen';
  import { combatLog } from 'lib/cache';

  import CombatRenderer from 'canvas/combat/render/CombatRenderer';
  import Combat from 'canvas/combat/Combat';
  import { MAX_FPS } from 'canvas/common/Utils';

  import MapText from 'components/map/MapText';

  let app;
  let container;
  let _w;
  let _h;

  const resize = () => {
    _w = container.clientWidth;
    _h = container.clientHeight;
    app.renderer.resize(_w, _h);
  };

  const duel = {
    combat: null,
    renderer: null,
  };

  onMount(() => {
    _w = container.clientWidth;
    _h = container.clientHeight;

    if (global.map) {
      global.map.stopMap();
    }

    /* set up pixi app */
    app = new PIXI.Application({
      width: _w,
      height: _h,
      resolution: window.devicePixelRatio,
      autoDensity: true,
      backgroundColor: 0x000000,
    });

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.RESOLUTION = window.devicePixelRatio;

    app.ticker.maxFPS = MAX_FPS;

    app.stage = new PIXI.display.Stage();
    app.stage.sortableChildren = true;

    const loader = PIXI.Loader.shared;

    global.duel = duel;
    const createScene = () => {
      const { characterId } = $dungeon.cache;
      try {
        duel.combat = new Combat(characterId, $dungeon.cache.currentCombat);
        duel.renderer = new CombatRenderer(app, _w, _h, duel.combat);

        duel.combat.init(duel.renderer);

        duel.renderer.init();

        // Update the render for combats here.
        app.ticker.add(() => {
          if ($dungeon.cache.currentCombat) {
            duel.renderer.update();
          }
        });

        // If for some reason the monster is already dead, prompt the result.
        // eslint-disable-next-line no-console
        console.log($dungeon.cache.characterStatus);
        if (duel.combat.monster.isDead()) {
          // ...
        } else if ($dungeon.cache.characterStatus === 'just died' || duel.combat.character.isDead()) {
          duel.renderer.characterDefeated();
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('COMBAT ERROR', e);
        if ($dungeon.cache.characterStatus) {
          if ($dungeon.cache.characterStatus === 'claiming rewards') {
            mapOverlay.open('loot');
          } else if ($dungeon.cache.characterStatus === 'just died') {
            menuOverlay.open('gameOver');
          }
        }
      }
    };

    if (loader.progress === 100) {
      createScene();
    }

    loader.onComplete.add(createScene);

    container.appendChild(app.view);

    /* make responsive */
    window.addEventListener('resize', resize);
  });

  onDestroy(() => {
    if (global.map) {
      global.map.startMap();
    }

    try {
      duel.combat.destroy();
      duel.renderer.destroy();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }

    app.destroy();
    global.duel = null;
    window.removeEventListener('resize', resize);
  });
</script>

<style lang="scss">
  @import '../../styles/variables';

  .box {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: $footer-height;
    width: 100%;
    height: 100%;
    background: $color-background;
    margin: 0 auto;
    z-index: 10;
    pointer-events: none;

    @media screen and (max-width: $mobile-max-width) {
      top: -$mobile-menu-height;
      height: calc(100% + #{$mobile-menu-height});
    }

    & > * {
      pointer-events: all;
    }

    @media screen and (min-width: $desktop-min-width) {
      max-width: unset;
      background: unset;
    }
  }

  .pixi-canvas {
    width: 100%;
    height: 100%;
    background: $color-background;

    @media screen and (max-width: $mobile-max-width) and (min-height: 500px) {
      height: calc(100% - #{$footer-web-height});
    }

    @media screen and (min-width: $desktop-min-width) {
      position: absolute;
      top: 0;
      left: $desktop-menu-width;
      bottom: $footer-height;
      right: 0;
      max-width: 425px;
      margin: 0 auto;
      height: auto;
    }
  }

  .map-text {
    width: 100%;
    margin-top: 2px;

    @media screen and (min-width: $desktop-min-width) {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      width: $desktop-menu-width;
      height: calc(50% - #{$header-height} - 2px);
    }
  }

  @media (max-width: 550px) {
    .map-text {
      max-width: unset;
    }
  }
</style>

<div class="box">
  <div class="map-text">
    <MapText combat lines="{$combatLog}" />
  </div>
  <div class="pixi-canvas" bind:this="{container}"></div>
</div>
