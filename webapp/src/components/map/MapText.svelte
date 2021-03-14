<script>
  import { fade } from 'svelte/transition';

  import { dungeon } from 'stores/dungeon';
  import {
    characterId,
    uniqueGearAvailable,
    bossRooms,
    npcRooms,
    bountyRooms,
    chatMessages,
    currentTrade,
    onlineCharacters,
    currentFloor,
  } from 'lib/cache';
  import { quickActions } from 'lib/chat';
  import { gearImage, monsterImage } from 'utils/data';
  import { capitalize, typewriter } from 'utils/text';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';
  import ChatMessages from 'components/map/ChatMessages';

  import IconHere from 'assets/icons/marker_2x.png';
  import IconDiamond from 'assets/diamond.png';
  import IconCombat from 'assets/monster.png';
  import IconScroll from 'assets/scroll.png';
  import IconChat from 'assets/icons/chat_4x.png';

  export let combat;
  export let lines;

  let disabled;
  let tab;

  $: rareArt = $uniqueGearAvailable.filter(({ name }) => /^Rare Art -/.test(name));

  // Always enable messages
  $: if ($currentTrade && $currentTrade.trade && tab !== 'messages') {
    tab = 'messages';
  }

  const bountySponsors = bounty => {
    const sponsors = bounty.sponsors
      .map(sponsor => $onlineCharacters[sponsor] && $onlineCharacters[sponsor].characterName)
      .filter(v => v)
      .map(sponsor => `<em class="highlight">${sponsor}</em>`)
      .join(', ');
    return sponsors.length ? sponsors : 'Someone';
  };

  const toggle = type => {
    tab = tab === type ? false : type;
  };

  const delay = async t => new Promise(r => setTimeout(r, t));

  const onQuickAction = async msg => {
    disabled = true;
    // throttle quickactions
    await $dungeon.sendRoomMessage(msg);
    await delay(800);
    disabled = false;
  };

  const acceptTrade = async () => {
    disabled = true;
    try {
      const { buyer, seller, history: deals } = $currentTrade.trade;
      const { deal } = deals[deals.length - 1];

      // Accept trade request
      await $dungeon.acceptTradeRequest(buyer);

      // Currently only doing purchases, so continue with proposed transaction
      await $dungeon.proposeTrade(buyer, seller, deal);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    disabled = false;
  };

  const denyTrade = async () => {
    disabled = true;
    try {
      await $dungeon.denyTrade($currentTrade.trade.buyer);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    disabled = false;
  };

  const cancelTrade = async () => {
    disabled = true;
    try {
      await $dungeon.cancelTrade($currentTrade.trade.seller);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    disabled = false;
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .map-text {
    position: relative;
    display: flex;
    flex-direction: column;
    margin-left: 12px;
    margin-right: 12px;
    height: $mobile-menu-height;
    background-color: $color-dark;

    &.combat {
      height: $mobile-menu-combat-height;
    }

    &, &.combat {
      @media screen and (min-width: $desktop-min-width) {
        height: 100%;
        margin: 0;
      }
    }

    &--container {
      // IDK WHY 49px, JUST GO WITH IT FOR NOW...
      height: calc(100% - 49px);

      .combat & {
        height: 100%;
      }

      padding: 6px 20px;
      overflow-y: scroll;
      font-size: 11px;

      p {
        padding: 0 0 4px 0;
        font-size: 13px;

        &:first-child {
          padding-top: 6px;
        }
        &:last-child {
          padding-bottom: 6px;
        }
      }

      .announcement {
        padding: 6px 0;

        &:first-child {
          padding-top: 12px;
        }
        &:last-child {
          padding-bottom: 12px;
        }

        .subtle {
          color: rgba($color-light, 0.8);

          em {
            color: $color-light;
            font-style: normal;
          }
        }

        &.flex {
          display: flex;
          justify-content: stretch;
          align-items: start;
          margin: 0 -3px;

          & > * {
            margin: 0 3px;
            flex: 1;
          }
          .fix {
            flex: 0;
          }
        }

        img {
          display: inline-block;
          width: auto;
          height: 10px;

          &.icon {
            height: 26px;
            width: auto;
            margin: -2px 0;
            vertical-align: middle;
          }

          &.art {
            height: 24px;
            padding: 4px 6px 0 0;
          }
        }

        :global(.secondary.map-footer-icon) {
          display: inline-block;
          height: 26px;
          width: 26px;
          margin: -2px 2px -2px 6px;
          vertical-align: middle;
        }
        :global(.secondary.map-footer-icon img) {
          height: 60%;
          width: auto;
        }
      }
    }

    &--buttons {
      position: relative;
      display: flex;
      margin: 6px 0;

      &:before {
        content: '';
        pointer-events: none;
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 2;
        left: 0;
        width: 12px;
        background: linear-gradient(to left, rgba($color-dark, 0), rgba($color-dark, 0.8));
      }

      :global(button img) {
        height: auto;
        width: 16px;
        vertical-align: middle;
      }

      &--quick-actions {
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        padding: 0 6px;

        :global(button) {
          margin: 0 2px;
        }
      }

      &--tabs {
        position: relative;
        flex: 0;
        white-space: nowrap;
        padding-right: 6px;

        &:before {
          content: '';
          pointer-events: none;
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 2;
          left: -12px;
          width: 12px;
          background: linear-gradient(to right, rgba($color-dark, 0), rgba($color-dark, 0.8) 90%);
        }
      }
    }
  }
</style>

<div class="map-text" class:combat>
  <div class="map-text--container with-desktop-scrollbars">
    {#if !combat && tab === 'messages'}
      <!-- Chat Messages -->
      <ChatMessages />
    {:else if !combat && tab === 'rare-art' && rareArt.length}
      <!-- UNIQUE GEAR - RARE ART-->
      <div class="announcement flex" in:fade="{{ duration: 200 }}">
        <div class="fix">
          <img alt="announcement" src="{IconDiamond}" />
        </div>
        <p>
          <span class="subtle">
            <em>[{rareArt.length} / 6]</em>
            Rare Art remains in the dungeon.
          </span>
          <br />
          {#each rareArt as gear}
            <img class="art" alt="{gear.name}" src="{gearImage(gear)}" />
          {/each}
        </p>
      </div>
    {:else if !combat && tab === 'monsters' && ($bossRooms.length || $npcRooms.length)}
      <!-- BIG BOSS COMBAT -->
      {#each $bossRooms as room (room.coordinates)}
        <div class="announcement flex" in:fade="{{ duration: 200 }}">
          <div class="fix">
            <img class="icon" alt="{room.combat.monster.name}" src="{monsterImage(room.combat.monster.image)}" />
          </div>
          <p class="subtle">
            A
            <em>{room.combat.monster.name}</em>
            has appeared on floor
            <em style="white-space: nowrap;">{getCoordinatesFloor(room.coordinates)}</em>
            at
            <em style="white-space: nowrap;">{formatCoordinates(room.coordinates, 2)}.</em>
          </p>
          <div class="fix">
            <BoxButton
              type="secondary map-footer-icon"
              isDisabled="{getCoordinatesFloor(room.coordinates) !== Number($currentFloor)}"
              onClick="{() => global.map.refocus(room.coordinates)}"
            >
              <img src="{IconHere}" alt="here" />
            </BoxButton>
          </div>
        </div>
      {/each}

      <!-- BOUNTY -->
      {#each $bountyRooms as room (room.coordinates)}
        <div class="announcement flex" in:fade="{{ duration: 200 }}">
          <div class="fix">
            <img class="icon" alt="{room.combat.monster.name}" src="{monsterImage(room.combat.monster.image)}" />
          </div>
          <p class="subtle">
            {@html bountySponsors(room.bounty)} added a bounty to
            <em>{room.combat.monster.name}</em>
            on floor
            <em style="white-space: nowrap;">{getCoordinatesFloor(room.coordinates)}</em>
            at
            <em style="white-space: nowrap;">{formatCoordinates(room.coordinates, 2)}.</em>
          </p>
          <div class="fix">
            <BoxButton
                    type="secondary map-footer-icon"
                    isDisabled="{getCoordinatesFloor(room.coordinates) !== Number($currentFloor)}"
                    onClick="{() => global.map.refocus(room.coordinates)}"
            >
              <img src="{IconHere}" alt="here" />
            </BoxButton>
          </div>
        </div>
      {/each}

      <!-- NPC COMBAT -->
      {#each $npcRooms.filter(({npc}) => npc.type === 'recycler' && !npc.personal) as room (room.coordinates)}
        <div class="announcement flex" in:fade="{{ duration: 200 }}">
          <div class="fix">
            <!-- <img class="icon" alt="{room.combat.monster.name}" src="{monsterImage(room.combat.monster.image)}" /> -->
          </div>
          <p class="subtle">
            An alchemist on floor
            <em style="white-space: nowrap;">{getCoordinatesFloor(room.coordinates)}</em>
            at
            <em style="white-space: nowrap;">{formatCoordinates(room.coordinates, 2)}.</em>
          </p>
          <div class="fix">
            <BoxButton
              type="secondary map-footer-icon"
              isDisabled="{getCoordinatesFloor(room.coordinates) !== Number($currentFloor)}"
              onClick="{() => global.map.refocus(room.coordinates)}"
            >
              <img src="{IconHere}" alt="here" />
            </BoxButton>
          </div>
        </div>
      {/each}
    {:else}
      <!-- MAP TEXT -->
      {#each lines as line}
        <p class="map-text--text" in:typewriter>
          {@html line}
        </p>
      {/each}
    {/if}
  </div>

  {#if !combat}
    <div class="map-text--buttons">
      <div class="map-text--buttons--quick-actions">
        {#if tab === 'messages'}
          {#if $currentTrade && $currentTrade.trade}
            {#if $currentTrade.trade.seller == $characterId}
              <BoxButton
                type="secondary-small quick-action emphasize"
                isDisabled="{disabled}"
                onClick="{() => acceptTrade()}"
              >
                👍
              </BoxButton>
              <BoxButton
                type="secondary-small quick-action emphasize"
                isDisabled="{disabled}"
                onClick="{() => denyTrade()}"
              >
                👎
              </BoxButton>
            {:else}
              <BoxButton
                type="secondary-small quick-action emphasize"
                isDisabled="{disabled}"
                onClick="{() => cancelTrade()}"
              >
                Cancel
              </BoxButton>
            {/if}
          {:else}
            {#each quickActions as action}
              <BoxButton
                type="secondary-small quick-action"
                isDisabled="{disabled}"
                onClick="{() => onQuickAction({ action })}"
              >
                {capitalize(action)}
              </BoxButton>
            {/each}
          {/if}
        {/if}
      </div>

      <div class="map-text--buttons--tabs">
        {#if !combat}
          {#if $bossRooms.length || $npcRooms.length}
            <BoxButton
              type="primary subtle secondary-small {tab !== 'monster' ? 'badge' : ''}"
              onClick="{() => toggle('monsters')}"
            >
              <img alt="toggle" src="{tab === 'monsters' ? IconScroll : IconCombat}" />
            </BoxButton>
          {/if}

          {#if rareArt.length}
            <BoxButton
              type="primary subtle secondary-small {tab !== 'rare-art' ? 'badge' : ''}"
              onClick="{() => toggle('rare-art')}"
            >
              <img alt="toggle" src="{tab === 'rare-art' ? IconScroll : IconDiamond}" />
            </BoxButton>
          {/if}
        {/if}

        <BoxButton
          type="primary subtle secondary-small {tab !== 'messages' && $chatMessages.unread ? 'badge' : ''}"
          onClick="{() => toggle('messages')}"
        >
          <img alt="toggle" src="{tab === 'messages' ? IconScroll : IconChat}" />
        </BoxButton>
      </div>
    </div>
  {/if}
</div>
