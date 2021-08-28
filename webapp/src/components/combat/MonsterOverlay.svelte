<script>
  import { scale } from 'svelte/transition';

  import { dungeon } from 'stores/dungeon';
  import {
    characterCoordinates,
    characterId,
    characterSlots,
    characterStatus,
    currentCombat,
    onlineCharacters,
  } from 'lib/cache';
  import { groupActions, monsterImage } from 'utils/data';
  import { capitalize } from 'utils/text';

  import BoxButton from 'components/BoxButton';
  import Duel from 'components/combat/Duel';
  import GearAction from 'components/bag/GearAction';

  import IconHelp from 'assets/icons/help_4x.png';

  export let hidden;
  export let toggleMonsterOverlayForEscape;

  $: combat = $currentCombat;
  $: monster = combat && combat.monster;
  $: duels = combat && combat.duels;
  $: others =
    duels &&
    Object.keys(duels)
      .filter(id => id !== $characterId)
      .filter(id => Object.keys($onlineCharacters).includes(id));
  $: monsterType = monster && (monster.type === 'trash' ? 'Mob' : capitalize(monster.type));

  $: requestedHelp = combat && combat.needsHelp && combat.needsHelp.includes($characterId);

  let roomCoords;
  $: {
    const [x, y, z = 0] = $characterCoordinates.split(',');
    roomCoords = [x, y, z].join(', ');
  }

  $: brokenGear =
    [$characterSlots.attackGear, $characterSlots.defenseGear].filter(
      ({ maxDurability, durability }) => maxDurability !== 0 && !durability,
    ).length > 0;

  let isDisabled = false;

  const attack = async () => {
    isDisabled = true;
    const response = await $dungeon.cache.action('attack');
    // eslint-disable-next-line no-console
    console.log('duel', response);
    isDisabled = false;
  };

  const escape = async () => {
    isDisabled = true;
    const { turn } = await $dungeon.cache.action('escape');
    // eslint-disable-next-line no-console
    console.log('escaped', turn);
    isDisabled = false;
    global.map.startMap();
  };

  const requestHelp = async () => {
    isDisabled = true;
    const response = await $dungeon.cache.action('need-help');
    isDisabled = false;
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .box {
    position: absolute;
    text-align: center;
    top: 0;
    left: 0px;
    right: 0px;
    bottom: $footer-web-height;
    background: $color-background;
    z-index: 15;

    @media screen and (max-width: $mobile-max-width) {
      top: -$mobile-menu-height;
      bottom: 0;
    }
    @media screen and (min-width: $desktop-min-width) {
      left: $desktop-menu-width;
    }
  }
  .inner {
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    margin-left: 22px;
    margin-right: 22px;
    background: $color-black;
    padding: 20px;
    height: 100%;

    @media screen and (min-width: $desktop-min-width) {
      // padding: 0 20px;
    }
  }
  .innerer {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    max-width: 700px;
  }
  .buttons {
    padding-top: 10px;
    max-width: 400px;

    .icon {
      filter: invert(1);
      height: 1.2em;
      margin-right: 3px;
      vertical-align: text-bottom;
    }
  }
  .cols {
    display: flex;
    margin-top: 5px;
    justify-content: space-between;
  }
  .image {
    position: relative;
    height: 100%;

    img {
      position: absolute;
      top: 0;
      bottom: 0;
      height: 100%;
      max-height: 350px;
      width: auto;
      margin: 0 auto;
      transform: translate(-50%, 0);
    }
  }
  p {
    margin: 0;
    padding-bottom: 5px;
    color: $color-darker-text;
  }
  .name {
    color: $color-light;
    text-transform: capitalize;
  }
</style>

{#if ['attacking monster', 'claiming rewards', 'just died'].includes($characterStatus)}
  <div class="{hidden ? 'canvas-hidden' : ''}">
    <Duel {toggleMonsterOverlayForEscape} />
  </div>
{:else if combat}
  <div class="{hidden ? 'canvas-hidden' : ''}">
    <div class="box">
      <div class="inner">
        <div class="innerer">
          <p>
            A
            <span class="name">{monster.name}</span>
            jumped out from the corner of room
            <span class="name">{roomCoords}</span>
            !
          </p>
          {#if others.length === 1}
            <p>
              <span class="name">{duels[others[0]].attacker.characterName}</span>
              is attacking it! Join them?
            </p>
          {:else if others.length > 1}
            <p>
              <span class="name">{others.length}</span>
              other explorers are attacking it! Join them?
            </p>
          {/if}

          <div class="image" in:scale>
            <img alt="{monster.name}" src="{monsterImage(monster.image)}" />
          </div>

          <p>Level {monster.stats.level} | {monster.stats.health} HP | {monsterType}</p>
          <div>
            <div class="cols">
              <div>
                {#each groupActions({ actions: monster.attacks, slotType: 'attack' }) as action}
                  <GearAction {action} noIcon />
                {/each}
              </div>
              <div>
                {#each groupActions({ actions: monster.defenses, slotType: 'defense' }) as action}
                  <GearAction {action} noIcon />
                {/each}
              </div>
            </div>
          </div>

          <div class="buttons">
            <BoxButton type="full" loadingText="Attacking..." onClick="{attack}" {isDisabled} needsFood>
              {#if brokenGear}Attack with bare hands{:else}Attack{/if}
            </BoxButton>
            <div class="cols">
              <BoxButton type="full" loadingText="Escaping..." onClick="{escape}" {isDisabled} needsFood>
                Escape
              </BoxButton>
              <div style="width: 10px;"></div>
              <BoxButton type="full" isDisabled="{isDisabled || requestedHelp}" needsFood onClick="{requestHelp}">
                <img class="icon" src="{IconHelp}" alt="alt" />
                {#if requestedHelp}Requested help{:else}Call for help{/if}
              </BoxButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
