<script>
  import { menuOverlay, isMobile } from 'stores/screen';
  import { map } from 'stores/dungeon';
  import { currentFloor, foreclosedRooms } from 'lib/cache';

  import BoxButton from 'components/BoxButton';

  import IconHere from 'assets/icons/marker_2x.png';

  export let as = 'list';
  export let floor;
  export let onRoomClick;
  export let room;

  $: isFeeRoom = room && [2, 3, 5].includes(Number(room.kind));

  const refocusMap = coordinates => {
    if ($isMobile) {
      menuOverlay.close();
    }
    $map.refocus(coordinates);
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: flex-start;

    &.row {
      flex-direction: column;
      width: 100%;
      flex-grow: 1;
    }
  }

  .room {
    padding: 4px 0;

    .cursor {
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: rgba($color-light, 0.32);
      // text-underline-position: under;
    }

    .avatar {
      margin-right: 10px;
      align-items: center;
      justify-content: center;
      background: rgba($color-black, 0.64);
      display: flex;
      padding: 10px;

      img {
        width: 32px;
      }
    }

    .info {
      padding-top: 10px;
    }

    h5 {
      font-size: 12px;
    }

    p {
      font-size: 12px;
      padding-bottom: 0;
    }

    .res {
      color: $color-darker-text;
      padding-right: 7px;

      img {
        height: 11px;
        margin-right: 5px;
      }
    }

    .status {
      margin-left: 10px;

      .status-text {
        font-size: 10px;
        color: $color-darker-text;
        padding-right: 0px;

        &--italic {
          color: $color-darker-text;
          font-style: italic;
        }
      }

      img {
        width: 60%;
        height: auto;
        vertical-align: middle;
      }
    }

    &.view-list {
      //
    }

    &.view-grid {
      cursor: pointer;
      padding: 10px;
      background-color: lighten($color-panel, 4);

      &.type-fee {
        //
      }

      .avatar {
        min-width: unset;
        min-height: unset;

        img {
          width: 40px;
          height: auto;
        }
      }

      h5,
      .status {
        display: none;
      }
    }
  }
</style>

<div
  class="room view-{as} type-{isFeeRoom ? 'fee' : 'reward'}"
  on:click="{() => as === 'grid' && onRoomClick(room.coordinates)}"
>
  <div class="flex">
    <div class="avatar cursor" on:click="{() => onRoomClick(room.coordinates)}">
      {#if room.image}
        <img src="{room.image}" alt="room" />
      {:else}&nbsp;{/if}
    </div>

    <div class="info flex row">
      <h5 class="cursor" on:click="{() => onRoomClick(room.coordinates)}">
        {room.customName || room.name} ({room.formattedCoordinates})
      </h5>
      <p>
        {#if $foreclosedRooms.includes(room.coordinates)}
          <span class="res">FORECLOSED</span>
        {/if}
        {#if room.keeper && room.keeper.income}
          <span class="res">
            <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
            {room.keeper.income.fragments}
          </span>
          {#if isFeeRoom}
            <span class="res">
              <img src="/images/game-icons/coin_4x.png" alt="coin" />
              {room.keeper.income.coins}
            </span>
          {/if}
        {/if}
      </p>
    </div>

    <div class="status">
      <BoxButton
        type="secondary-small"
        isDisabled="{Number(floor) !== Number($currentFloor)}"
        onClick="{() => refocusMap(room.coordinates)}"
      >
        <img src="{IconHere}" alt="here" />
      </BoxButton>
    </div>
  </div>
</div>
