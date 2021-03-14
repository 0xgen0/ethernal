<script>
  import { fade } from 'svelte/transition';

  import { notificationOverlay } from 'stores/screen';

  import BoxButton from 'components/BoxButton';

  import BossSpawnedNotification from 'components/notifications/BossSpawned';
  // import CharacterJoinedNotification from 'components/notifications/CharacterJoined';
  import GenericNotification from 'components/notifications/Generic';
  import NPCSpawnedNotification from 'components/notifications/NPCSpawned';
  import QuestFinishNotification from 'components/notifications/QuestFinish';
  import RoomAbilityAddedNotification from 'components/notifications/RoomAbilityAdded';
  import RoomSaleNotification from 'components/notifications/RoomSale';
  import UniqueGearMintedNotification from 'components/notifications/UniqueGearMinted';

  import IconClose from 'assets/close.png';

  // Determine notification type
  // Put latest overlay into single-item array so that Svelte will use keyed blocks that works with transitions
  const screens = {
    bossSpawned: BossSpawnedNotification,
    // 'character-joined': CharacterJoinedNotification,
    generic: GenericNotification,
    npcSpawned: NPCSpawnedNotification,
    questFinish: QuestFinishNotification,
    roomAbilityAdded: RoomAbilityAddedNotification,
    roomSale: RoomSaleNotification,
    uniqueGearMinted: UniqueGearMintedNotification,
  };
  $: overlays = [
    $notificationOverlay && { screen: screens[$notificationOverlay.type], ...$notificationOverlay },
  ].filter(Boolean);
</script>

<style lang="scss">
  @import '../../styles/variables';

  .notification-overlay {
    box-sizing: border-box;
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    z-index: 13;
    max-width: 450px;
    max-height: calc(100% + #{$header-height} + #{$mobile-menu-height} - 12px);
    margin: 0 auto;

    @media screen and (min-width: $desktop-min-width) {
      top: 12px;
      left: $desktop-menu-width;
      right: 0;
      width: 100%;
      // offset footer height and with margin
      max-height: calc(100% - #{$footer-height} - 12px);
    }

    &--wrapper {
      display: flex;
      flex-direction: row;
      justify-content: stretch;
      align-items: center;
      min-height: 46px;
      box-sizing: border-box;
      padding: 12px 12px;
      background-color: $color-background;
      border: 1px solid $color-btn-grey;
      border-radius: 1px;
      box-shadow: 0 0 24px 12px rgba($color-dark, 0.72);

      & > * {
        flex: 1;
        width: 100%;
      }

      :global(button.plain) {
        flex: 0;
        margin: 0;
        padding: 2px;
      }
      :global(button.plain img) {
        width: auto;
        height: 12px;
      }

      :global(p) {
        padding: 0;
        line-height: 1em;
        text-align: center;
        font-size: 11px;

        @media screen and (min-width: $desktop-min-width) {
          font-size: 13px;
        }
      }

      :global(p img.icon) {
        display: inline-block;
        height: 26px;
        width: auto;
        margin: -2px 2px;
        vertical-align: middle;
      }
    }

    &.error {
      @media screen and (min-width: $desktop-min-width) {
        max-width: calc(80vw - #{$desktop-menu-width});
      }
    }

    &.error &--wrapper {
      background-color: $color-red;
      border-color: $color-red;
      color: $color-light;
      font-weight: 700;
    }
  }
</style>

{#each overlays as overlay (overlay.id)}
  <div class="notification-overlay notification-overlay-{overlay.type} {overlay.class || ''}" transition:fade="{{ duration: 200 }}">
    <div class="notification-overlay--wrapper">
      <div>
        <svelte:component this="{overlay.screen}" {...{ ...overlay, screen: null }} />
      </div>
      {#if overlay.closeable !== false}
        <BoxButton onClick="{() => notificationOverlay.close()}" type="plain">
          <img src="{IconClose}" alt="close" />
        </BoxButton>
      {/if}
    </div>
  </div>
{/each}
