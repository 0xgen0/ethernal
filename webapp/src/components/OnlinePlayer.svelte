<script>
  import { currentFloor } from 'lib/cache';
  import { mapOverlay } from 'stores/screen';
  import { map } from 'stores/dungeon';
  import { classPortrait, statusText } from 'utils/data';
  import { getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';

  import IconHere from 'assets/icons/marker_2x.png';

  export let player;

  $: isDisabled = getCoordinatesFloor(player.coordinates) !== Number($currentFloor);

  const refocusMap = coordinates => {
    mapOverlay.close();
    $map.refocus(coordinates);
  };
</script>

<style lang="scss">
  @import '../styles/variables';

  img {
    width: 60%;
    height: auto;
    vertical-align: middle;
  }
  .flex {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
  }
  .col {
    flex-direction: column;
    width: 100%;
  }
  .avatar {
    margin-right: 10px;
    align-items: center;
    justify-content: center;
    background: $color-black;
    min-height: 48px;
    display: flex;
    min-width: 48px;
  }
  .avatar img {
    width: 32px;
    height: 32px;
  }
  .status {
    color: $color-darker-text;
    padding-right: 0px;
    &--italic {
      color: $color-darker-text;
      font-style: italic;
    }
  }
  .info > div:first-child {
    font-size: 12px;
    padding-bottom: 2px;
  }
</style>

<div class="player flex">
  <div class="avatar">
    <a href="/character/{player.characterId}">
      <img src="{classPortrait(player && player.stats && player.stats.characterClass)}" alt="profile" />
    </a>
  </div>

  <div class="info flex col">
    <div>
      <a href="/character/{player.characterId}">{player && player.characterName ? player.characterName : ''}</a>
    </div>

    <div class="label">
      {#if player && player.stats}
        <span class="status">LVL:</span>
        {player.stats.level}&nbsp;
        <span class="status">XP:</span>
        {player.stats.xp}
      {/if}
    </div>

    <div class="status--italic label">{player && player.status ? statusText(player.status) : ''}</div>
  </div>

  <div class="position">
    <BoxButton type="secondary-small" {isDisabled} onClick="{() => refocusMap(player.coordinates)}">
      <img src="{IconHere}" alt="here" />
    </BoxButton>
  </div>
</div>
