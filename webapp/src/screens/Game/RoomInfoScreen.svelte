<script>
  import { onMount } from 'svelte';

  import { menuOverlay } from 'stores/screen';
  import { dungeon, map } from 'stores/dungeon';
  import {
    characterBalances,
    characterId,
    characterVault,
    currentFloor,
    currentRoom,
    foreclosedRooms,
    keeperRooms,
    onlineCharacters,
  } from 'lib/cache';
  import { roomsText } from 'data/text';
  import { getAreaByType } from 'data/elements';
  import { fetchCache } from 'lib/cache';
  import roomGenerator from 'lib/roomGenerator';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';
  import ContentLayout from 'components/layouts/ContentLayout';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';
  import MiniMap from 'components/map/MiniMap';

  import IconHere from 'assets/icons/marker_2x.png';
  import {derived} from "svelte/store";

  export let back;
  export let coordinates;

  const DEACTIVATE_COST = 100; // 100 coins in vault to deactivate a room
  const ROOM_COST = 2; // 10 coins, later will be dynamic

  let area;
  let confirmAbandonRoom;
  let currentCoordinates;
  let discoverer;
  let dungeonApproved = false;
  let error;
  let isOwner;
  let loading;
  let makeOffer;
  let offers = [];
  let room;
  let shortUrl;
  let unlocking;
  let inRoom;

  /**
   * Fetch dungeon approved (unlock) status on mount
   */
  onMount(async () => {
    dungeonApproved = await $dungeon.isDungeonApproved();
    await $dungeon.cache.fetchVault();
  });

  // @TODO - ALLOW FOR ROOM UPDATE TO FORCE REFRESH THIS
  $: (async () => {
    if ((coordinates || $currentRoom.coordinates) !== currentCoordinates) {
      currentCoordinates = coordinates || $currentRoom.coordinates;
      shortUrl = `http://ethrn.al/a/r/${currentCoordinates}`;

      if ($currentRoom.coordinates === coordinates) {
        inRoom = true;
      }

      const result = await $dungeon.cache.getRoom(currentCoordinates);
      room = roomGenerator(result);
      if (room) {
        area = getAreaByType(room.areaType);

        if (room.keeper && room.keeper.character) {
          discoverer = $onlineCharacters[room.keeper.character];
          if (!discoverer) {
            discoverer = await fetchCache(`characters/${room.keeper.character}`);
          }
        }
      }
    }
  })();
  $: isOriginRoom = /^0,0(,\d+)?$/.test(currentCoordinates);
  $: isOwner = $keeperRooms.map(r => r.coordinates).includes(currentCoordinates);
  $: isInRoom = $currentRoom.coordinates == currentCoordinates;
  $: isOnFloor = Number($currentFloor) === getCoordinatesFloor(currentCoordinates);
  $: dungeonOwned = room && $dungeon.contract.address.toLowerCase() === room.keeper.player;
  $: canBuyRoom = room && !isOwner && isInRoom && ($foreclosedRooms.includes(currentCoordinates) || dungeonOwned);
  $: hasEnoughBuyCost = $characterBalances.coins >= ROOM_COST;
  $: canToggleRoom =
    (room && !room.keeper.active) ||
    ($characterVault && $characterVault.balance && $characterVault.balance.coins >= DEACTIVATE_COST);

  $: isAbandonDisabled = loading || unlocking;
  $: isActiveDisabled = loading || unlocking || !canToggleRoom;
  $: isBuyDisabled = loading || unlocking || !hasEnoughBuyCost;

  /**
   * Unlock dungeon for transfers
   */
  const unlockDungeon = async () => {
    if (!dungeonApproved) {
      unlocking = true;
      await $dungeon.approveDungeon();
      dungeonApproved = await $dungeon.isDungeonApproved();
      unlocking = false;
    }
  };

  /**
   * Toggle the active status of  room
   */
  const onActiveToggle = async () => {
    loading = true;
    error = null;
    try {
      // Always attempt to unlock dungeon
      unlockDungeon();

      if (room.keeper.active) {
        await $dungeon.deactivateRoom(room.coordinates);
      } else {
        await $dungeon.activateRoom(room.coordinates);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = { activate: 'Please try again.' };
    }
    loading = false;
  };

  /**
   * @TODO - Make offer to owner for room
   */
  // const onMakeOffer = () => {
  //   makeOffer = true;
  // };

  /**
   * @TODO - Accept offer by owner for room
   */
  // const onConfirmOffer = async () => {
  //   //
  // };

  /**
   * Buy room outright (foreclosure or abandoned)
   */
  const onBuyRoom = async () => {
    loading = true;
    error = null;
    try {
      // Always attempt to unlock dungeon
      unlockDungeon();

      await $dungeon.buyRoom(room.coordinates);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = { buy: 'Please try again.' };
    }
    loading = false;
  };

  /**
   * Abandon a room to the dungeon
   * This will toggle a confirmation check before permitting.
   */
  const onAbandonRoom = async () => {
    // Toggle confirmation
    if (!confirmAbandonRoom) {
      confirmAbandonRoom = true;
      return;
    }

    // Execute room abandonment
    loading = true;
    error = null;
    try {
      await $dungeon.abandonRoom(room.coordinates);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = { activate: 'Please try again.' };
    }
    confirmAbandonRoom = false;
    loading = false;
  };

  /**
   * Cancel the abandonment confirmation
   */
  const onCancelAbandonRoom = () => {
    confirmAbandonRoom = false;
  };

  /**
   * Add to room redirect
   */
  const onAddToRoom = () => {
    menuOverlay.open('dungeonKeeperShop', { coordinates: currentCoordinates });
  };

  /**
   * Refocus the map on given location
   */
  const refocusMap = () => {
    menuOverlay.close();
    $map.refocus(currentCoordinates);
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: flex-start;

    &.space-evenly {
      align-items: flex-start;
      justify-content: space-evenly;

      & > * {
        width: 50%;
      }
    }

    &.cols {
      margin: 0 -5px;

      & > * {
        padding: 0 5px;

        &.truncate {
          overflow: hidden;
        }
      }
    }
  }

  .avatar {
    margin-right: 10px;
    align-items: center;
    justify-content: center;
    background: rgba($color-black, 0.64);
    display: flex;
    padding: 16px;

    img {
      width: 48px;
    }
  }

  p {
    font-size: 11px;
    line-height: 16px;
    padding: 5px 0;

    span {
      color: $color-xLightGrey;
    }

    &.truncate {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    a {
      text-decoration: underline;
    }

    .area-color {
      display: inline-block;
      width: 8px;
      height: 8px;
    }
  }

  .res {
    color: $color-darker-text;

    img {
      height: 11px;
      margin-right: 5px;
    }
  }

  .minimap {
    position: relative;
    height: 145px;
    border: 1px solid $color-grey;
    margin-bottom: 5px;

    &--info {
      position: absolute;
      bottom: 0;
      left: 5px;
      right: 5px;
      z-index: 500;
      align-items: baseline;
      padding-top: 10px;
      // background: linear-gradient(to top, rgba($color-black, 0.48), rgba($color-black, 0.48) 60%, transparent);
    }
  }
  :global(.minimap--info .btn.map-footer-icon) {
    width: 30px;
    height: 30px;
    margin: 0 5px 5px;
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

  .error,
  .warning {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
  }
  .warning {
    color: $color-yellow;
  }
</style>

{#if room}
  <ContentLayout>
    <div slot="header">
      <Header title="{room.customName || room.name}" showMapButton="{!back}" closeable="{back}" />
    </div>

    <div slot="content">
      <div class="minimap">
        <MiniMap id="room-info-map" coordinates="{currentCoordinates}" enabled hideItems />
        <div class="flex cols minimap--info">
          <BoxButton type="secondary map-footer-icon" onClick="{refocusMap}">
            <span class="icon">
              <img src="{IconHere}" alt="here" />
            </span>
          </BoxButton>
        </div>
      </div>

      <div>
        <div class="flex cols">
          <div>
            <div class="avatar">
              <img src="{room.image}" alt="room" />
            </div>

            {#if isOwner}
              <BoxButton
                isDisabled="{!isOnFloor || $foreclosedRooms.includes(currentCoordinates)}"
                type="secondary-small quick-action"
                onClick="{() => onAddToRoom()}"
              >
                + to Room
              </BoxButton>
            {:else if !canBuyRoom}
              <!-- [Make offer] -->
            {/if}
          </div>
          <div class="truncate">
            <p>
              <span>Coordinates:</span>
              {formatCoordinates(currentCoordinates)}
            </p>
            {#if isOriginRoom}
              <p>
                <span>Portal Entrance</span>
              </p>
            {:else}
              <p>
                <span>Keeper:</span>
                {(discoverer && discoverer.characterName) || '--'}
              </p>
              <p class="truncate selectable">
                <span>Owner:</span>
                {dungeonOwned ? '--' : room.keeper.player}
              </p>
              <p>
                <span>Rewards:</span>
                <span class="res">
                  <img src="/images/game-icons/coin_4x.png" alt="coin" />
                  {room.keeper.income.coins}
                </span>
                <span class="res">
                  <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
                  {room.keeper.income.fragments}
                </span>
              </p>
            {/if}
          </div>
        </div>
        {#if error && error.activate}
          <p class="error">{error.activate}</p>
        {/if}
      </div>

      {#if canBuyRoom}
        <Line />
        <div class="text-center">
          <BoxButton type="secondary-small quick-action" isDisabled="{isBuyDisabled}" onClick="{() => onBuyRoom()}">
            Buy room for {ROOM_COST} coins
          </BoxButton>

          {#if !hasEnoughBuyCost}
            <p class="warning">You do not have enough coins to buy.</p>
          {/if}
          {#if error && error.activate}
            <p class="error">{error.activate}</p>
          {/if}
        </div>
      {/if}

      <Line />

      <!-- DISABLED : ROOM OVER OFFER VIEW -->
      {#if false && isOwner && offers.length > 0}
        {#each offers as offser}
          <div class="flex cols">
            <div>
              <p>
                <span>Offer:</span>
                20
              </p>
              <p>
                <span>Last price:</span>
                20
              </p>
            </div>
            <div>
              <p class="truncate">
                <span>By:</span>
                0x123123123123123123123123123123123123123
              </p>
              <p>[Accept Offer]</p>
            </div>
          </div>
        {/each}
      {/if}

      <!-- DISABLED : ROOM OFFER SCREEN -->
      {#if false && !isOwner}
        <div>
          <div class="flex cols">
            <div>
              <p>
                <span>Offer:</span>
                20
              </p>
              <p>
                <span>Last price:</span>
                20
              </p>
            </div>
            <div>
              <p>
                <span>By:</span>
                0x123123123123123123123123123123123123123
              </p>
              <p>[Make Offer]</p>
            </div>
          </div>

          {#if makeOffer}
            <div class="flex cols">
              <div>[+][COINS][-]</div>
              <div>OFFER</div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- DISABLED UNTIL OFFERING IS AVAILABLE -->
      <!-- <Line /> -->

      <div class="flex cols space-evenly">
        <div>
          <p>
            <span>Type:</span>
            {roomsText.kinds[room.kind]}
          </p>
          <p>
            <span>Room block:</span>
            <a href="{BLOCK_EXPLORER_URL}/{room.blockNumber}" rel="noopener nofollow" target="_blank">
              #{room.blockNumber}
            </a>
          </p>
        </div>
        <div>
          <p>
            <span>Area:</span>
            <span
              class="area-color"
              style="{`background-color: #${(area.color && area.color.toString(16)) || '979797'};`}"
            ></span>
            {area.key || 'Default'}
          </p>
          <p class="truncate">
            <span>URI:</span>
            <a href="{shortUrl}">{shortUrl.replace(/^https?:\/\//, '')}</a>
          </p>
        </div>
      </div>

      {#if isOwner}
        <Line />

        {#if confirmAbandonRoom}
          <p class="text-center">
            Room ownership will be tranferred to the dungeon.
          </p>
        {/if}

        <div class="flex cols">
          {#if !confirmAbandonRoom}
            <p>
              <span>STATUS Rewards</span>
              {#if room.keeper.active && !$foreclosedRooms.includes(currentCoordinates)}ON{:else}OFF{/if}
            </p>
          {/if}

          {#if canToggleRoom && !confirmAbandonRoom}
            <div>
              <BoxButton
                type="secondary-small quick-action"
                isDisabled="{isActiveDisabled}"
                onClick="{() => onActiveToggle()}"
              >
                {#if room.keeper.active}Deactivate{:else}Activate{/if}
              </BoxButton>
            </div>
          {/if}

          {#if confirmAbandonRoom}
            <BoxButton
              type="wide quick-action"
              isDisabled="{isAbandonDisabled}"
              onClick="{() => onCancelAbandonRoom()}"
            >
              Nevermind
            </BoxButton>
            <BoxButton type="wide full quick-action" isDisabled="{isAbandonDisabled}" onClick="{() => onAbandonRoom()}">
              Yes, abandon
            </BoxButton>
          {:else}
            <div>
              <BoxButton
                type="secondary-small quick-action"
                isDisabled="{isAbandonDisabled}"
                onClick="{() => onAbandonRoom()}"
              >
                Abandon
              </BoxButton>
            </div>
          {/if}
        </div>
      {/if}
    </div>

  </ContentLayout>
{/if}
