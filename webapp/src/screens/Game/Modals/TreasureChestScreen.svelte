<script>
  import nprogress from 'nprogress';
  import { tweened } from 'svelte/motion';
  import { sineInOut } from 'svelte/easing';

  import { dungeon } from 'stores/dungeon';
  import { characterBag, characterBalances, currentRoom, characterId, onlineCharacters } from 'lib/cache';
  import { mapModal } from 'stores/screen';
  import { monsterImage } from 'utils/data';

  import BoxButton from 'components/BoxButton';
  import Gear from 'components/bag/Gear';
  import ModalLayout from 'components/layouts/ModalLayout';

  import TreasureChestClosed from 'assets/treasure-chest-closed.png';
  import TreasureChestOpened from 'assets/treasure-chest-opened.png';
  import Resources from '../../../components/bag/Resources.svelte';

  let error;
  let loading;
  let loadingText;
  let reward;

  $: opened = $currentRoom.chest && $currentRoom.chest.status === 'opened';

  // Close if NPC is not in current room
  $: !$currentRoom.chest && mapModal.close();

  const revealedHeight = tweened(0, { delay: 100, duration: 600, easing: sineInOut });
  const revealedOpacity = tweened(0, { delay: 700, duration: 300, easing: sineInOut });
  $: {
    if ($currentRoom.chest && $currentRoom.chest.status === 'opened' && $currentRoom.chest.reward) {
      const { reward: result } = $currentRoom.chest;
      const me = result.characterId === $characterId;
      const balanceChange = result.balanceChange || [];
      const tokens = balanceChange.reduce((a, b) => a + b, 0) > 0;
      if (result.error) {
        error = 'Please try again';
      } else if (result.gear || tokens) {
        const [, , , , , coins, keys, fragments] = balanceChange;
        reward = {
          gear: result.gear,
          tokens,
          coins,
          keys,
          fragments,
          me,
          character: $onlineCharacters[result.characterId],
        };
      } else if (result.hpChange !== 0) {
        reward = {
          me,
          character: $onlineCharacters[result.characterId],
          monster: {
            name: 'Snake pit',
            image: 'mon0002.png',
            hpChange: result.hpChange,
          },
        };
      } else {
        reward = { empty: true };
      }
    } else if (!loading) {
      reward = null;
    }
  }
  $: reward && revealedHeight.set(100) && revealedOpacity.set(1);

  // Does chest need a key? And does character have a coin to spare.
  $: needsKey = $currentRoom.chest && $currentRoom.chest.needsKey;
  $: hasEnoughKeys = $characterBalances.coins > 0;

  // Will character have enough slots
  $: hasEnoughSlots = $characterBag.length < 10;

  // Check if able to open
  $: isDisabled = loading || (needsKey && !hasEnoughKeys) || (reward && reward.gear && !hasEnoughSlots);

  let leftLoadingText
  let rightLoadingText;
  $: {
    leftLoadingText = null;
    if (opened) {
      rightLoadingText = 'Closing...';
      if (reward.monster) {
        leftLoadingText = 'Keep chest open';
      } else if (reward.gear || reward.tokens) {
        leftLoadingText = 'Closing..';
        rightLoadingText = 'Taking...';
      }
    } else {
      rightLoadingText = 'Opening...';
    }
  }

  // General actions
  const onClick = async () => {
    loading = true;

    // if opened, then close chest and close modal
    if (opened) {
      // Take if gear, otherwise close it
      const take = reward.gear || reward.tokens;
      await nprogress.observe(
        $dungeon.cache.socket.emit('finish-chest', { take, close: !take }),
        (async () => new Promise(resolve => $dungeon.cache.socket.once('chest-updated', resolve)))(),
      );

      // Close modal
      mapModal.close();
      return;
    }

    // Open, mark as loaded, reveal
    await nprogress.observe(
      $dungeon.cache.action('open-chest'),
      (async () => new Promise(resolve => $dungeon.cache.socket.once('chest-opened', resolve)))(),
    );
    loading = false;
  };

  // On cancel, close modal
  const onLeave = async () => {
    loading = true;

    // Close it if gear or token, kill it it monster ("escape"), or do nothing
    if (opened && (reward.gear || reward.tokens || reward.monster)) {
      await nprogress.observe(
        $dungeon.cache.socket.emit('finish-chest', { take: false, close: !reward.monster }),
        (async () => new Promise(resolve => $dungeon.cache.socket.once('chest-updated', resolve)))(),
      );
    }

    // Close modal
    mapModal.close();
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.treasure-chest-screen) {
    @media screen and (min-width: $desktop-min-width) {
      max-width: 450px !important;
    }
  }

  .flex {
    display: flex;
    flex-direction: row;
    justify-content: stretch;

    &.header {
      position: relative;
      text-align: center;
      padding-bottom: 16px;

      p {
        padding: 0;
      }
    }

    p {
      flex: 1;
      width: 100%;

      @media screen and (max-width: $mobile-max-width) {
        font-size: 13px;
      }
    }
  }

  :global(.modal-layout--content div[slot='content']) {
    height: 100%;
  }

  .reward {
    overflow: hidden;
    text-align: center;

    img {
      height: 164px;
    }
  }
  .chest {
    text-align: center;
    img {
      height: 254px;
    }
  }

  .button {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px 0;
  }

  .error {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
    text-align: center;
  }
</style>

<ModalLayout class="full-height treasure-chest-screen" closeable="{false}">
  <div slot="header">
    <div class="flex header">
      {#if reward}
        {#if reward.gear || reward.tokens}
          <p>
            {#if reward.me}You found loot!{:else}There is loot in the chest!{/if}
          </p>
        {:else if reward.monster}
          <p>
            {#if reward.me}
              You were attacked by a {reward.monster.name}!
            {:else}
              {reward.monster.name} attacked {reward.character ? reward.character.characterName : 'other explorer'}!
            {/if}
            Hit for {Math.abs(reward.monster.hpChange)} damage.
          </p>
        {:else}
          <p>Nothing inside.</p>
        {/if}
      {:else}
        <p>
          There’s a
          {#if needsKey}locked{:else}closed{/if}
          chest in the room.
        </p>
      {/if}
    </div>
  </div>

  <div slot="content">
    <!-- REVEAL THE RESULT -->
    {#if reward}
      <div class="reward" style="opacity: {$revealedOpacity}; max-height: {$revealedHeight}%;">
        {#if reward.tokens}
          <Resources {...reward} hideEmpty />
        {/if}
        {#if reward.gear}
          <Gear gear="{reward.gear}" as="loot" />
        {/if}
        {#if reward.monster}
          <img src="{monsterImage(reward.monster.image)}" alt="monster" />
        {/if}
      </div>
    {/if}

    <div class="chest">
      <img src="{opened ? TreasureChestOpened : TreasureChestClosed}" alt="treasure chest" />
    </div>
  </div>

  <div slot="footer">
    <div class="button">
      <BoxButton type="wide full" isDisabled="{loading}" onClick="{() => onLeave()}" loadingText={leftLoadingText}>
        {#if opened && reward.monster}
          Keep chest open
        {:else if opened && (reward.gear || reward.tokens)}
          Close chest
        {:else}Leave it{/if}
      </BoxButton>
      <BoxButton type="wide full" {isDisabled} {onClick} loadingText={rightLoadingText}>
        {#if loading}
          ...
        {:else if opened && reward}
          {#if reward.gear}
            {#if hasEnoughSlots}Take loot{:else}Not enough slots{/if}
          {:else if reward.tokens}Take loot{:else}Close chest{/if}
        {:else if needsKey && !hasEnoughKeys}Need a key{:else if needsKey}Open with a key{:else}Open chest{/if}
      </BoxButton>
    </div>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>
</ModalLayout>
