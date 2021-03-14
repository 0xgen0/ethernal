<script>
  import { isDesktop, gameOverlay, mapOverlay, menuOverlay } from 'stores/screen';
  import { dungeon } from 'stores/dungeon';
  import {
    characterCoordinates,
    characterFeatures,
    characterId,
    currentCombat,
    currentRoom,
    characterStatus,
    scavengeLoot,
    keeperRooms,
  } from 'lib/cache';

  import BoxButton from 'components/BoxButton';

  import IconClose from 'assets/close.png';
  import IconCombat from 'assets/monster.png';
  import IconDiscord from 'assets/icons/discord_4x.png';
  import IconDungeonKeeper from 'assets/icons/dkeeper_4x.png';
  import IconHelp from 'assets/icons/help_4x.png';
  import IconMap from 'assets/icons/map_2x.png';
  import IconMenu from 'assets/icons/menu_2x.png';

  export let monsterOverlay;
  export let toggleMonsterOverlay = null;

  let roomCoords;
  $: {
    const [x, y, z = 0] = $characterCoordinates.split(',');
    roomCoords = [x, y, z].join(', ');
  }
  $: isDisabled = ['just died', 'dead'].includes($characterStatus);
  $: showMonsterOverlay =
    !$mapOverlay.screen &&
    (($currentRoom && $currentRoom.hasMonster) || $characterStatus === 'claiming rewards') &&
    toggleMonsterOverlay &&
    $characterStatus !== 'dead';

  $: isAttacking = ['attacking monster', 'claiming rewards', 'just died'].includes($characterStatus);

  const addBounty = () => {
    gameOverlay.open('addBounty');
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    justify-content: flex-end;
    align-items: center;

    & > * {
      margin-left: 5px;

      &:first-child {
        margin-left: 0;
      }
    }
  }

  .room-info {
    font-size: 11px;
    color: $color-lightGrey;
    text-transform: uppercase;

    span {
      color: $color-light;
    }
  }

  img {
    display: inline-block;
    width: 50%;
    height: auto;
    vertical-align: middle;
  }
</style>

<div class="flex">
  {#if showMonsterOverlay}
    <div class="room-info">
      {#if monsterOverlay}
        Room:
        <br />
        <span>{roomCoords}</span>
      {:else}
        <BoxButton type="secondary" {isDisabled} onClick="{toggleMonsterOverlay}">
          <img src="{monsterOverlay ? IconMap : IconCombat}" alt="{monsterOverlay ? 'map' : 'combat'}" />
        </BoxButton>
      {/if}
    </div>

    {#if isAttacking}
      <BoxButton type="secondary" isDisabled="{isDisabled}" onClick="{addBounty}">
        <img src="{IconHelp}" alt="help" />
      </BoxButton>
    {/if}
  {/if}

  {#if $isDesktop}
    <div>
      <a class="btn secondary" href="https://discord.gg/EwqKJVd" target="_blank" rel="noopener nofollow">
        <img src="{IconDiscord}" alt="discord" />
      </a>
    </div>
  {/if}

  {#if $characterFeatures.dungeonKeeper}
    <div>
      <BoxButton
        type="secondary"
        isDisabled="{isDisabled || showMonsterOverlay}"
        onClick="{() => menuOverlay.toggle('dungeonKeeper')}"
      >
        <img src="{IconDungeonKeeper}" alt="dungeon keeper" />
      </BoxButton>
    </div>
  {/if}

  <div>
    <BoxButton type="secondary" {isDisabled} onClick="{() => menuOverlay.toggle('menu')}">
      {#if $menuOverlay.screen === 'menu'}
        <img src="{IconClose}" alt="close" />
      {:else}
        <img src="{IconMenu}" alt="menu" />
      {/if}
    </BoxButton>
  </div>
</div>
