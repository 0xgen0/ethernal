<script>
  import { dungeon } from 'stores/dungeon';
  import { characterBag, characterSlots, currentRoom } from 'lib/cache';
  import { mapModal } from 'stores/screen';
  import { pluralize, typewriter } from 'utils/text';

  import BoxButton from 'components/BoxButton';
  import Gear from 'components/bag/Gear';
  import Line from 'components/Line';
  import ModalLayout from 'components/layouts/ModalLayout';

  import IconNPCAlchemist from 'assets/npc-alchemist.png';

  let error;
  let confirming = false;
  let sending = false;
  let npcText =
    'Bring items to me and I will turn them into fragments for you to generate new rooms.';
  let gambler = false;

  let npcName = 'The Alchemist';

  // Close if NPC is not in current room
  $: !$currentRoom.npc && mapModal.close();

  // Filter out equipped gear from bag
  $: transferableBag = $characterBag.filter(
    ({ id }) =>
      Object.values($characterSlots)
        .map(g => g.id)
        .indexOf(id) === -1,
  );

  // Selected items
  $: selectedItems = new Set();

  // Check if item already added
  $: isAdded = ({ id }) => selectedItems.has(id);

  // Check if able to transfer
  $: isDisabled = $characterBag.length === 0 || sending;

  // Add/remove items and force svelte assignment re-render
  const onAddItem = ({ id }) => {
    selectedItems.add(id);
    // Svelte assignment re-render
    selectedItems = selectedItems;
  };
  const onRemoveItem = ({ id }) => {
    selectedItems.delete(id);
    // Svelte assignment re-render
    selectedItems = selectedItems;
  };

  // Handle trade
  const onClick = async () => {
    const gears = Array.from(selectedItems).map(gearId => transferableBag.find(({ id }) => id === gearId));
    const fragments = await $dungeon.recyclingReward(gears);

    // Gambler NPC (@TODO) does not allow confirming
    if (!confirming && !gambler) {
      confirming = true;
      npcText = `I can give you ${fragments} ${pluralize('fragment', fragments)} for these gear.`;
      return;
    }

    error = null;
    sending = true;

    try {
      const ids = Array.from(selectedItems);
      await $dungeon.recycle(ids);
      confirming = false;
      npcText = `Here ${pluralize('is', fragments, 'are')} your ${fragments} ${pluralize('fragment', fragments)}.`;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
    } finally {
      selectedItems = new Set();
      sending = false;
    }
  };

  // On second thought...
  const onCancel = () => {
    selectedItems = new Set();
    confirming = false;
    npcText = 'Ok, nevermind then.';
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.talk-to-npc-screen) {
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
      padding-right: 24px;
      padding-bottom: 16px;

      :global(button) {
        margin-right: 12px;
      }

      &:after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 12px;
        right: 12px;
        z-index: 2;
        height: 1px;
        overflow: hidden;
        background: rgba($color-grey, 0.5);
      }

      img {
        height: 100%;
        width: auto;
      }

      p {
        padding: 0;
      }

      .text {
        min-height: 128px;

        @media screen and (min-width: $desktop-min-width) {
          min-height: 90px;
        }
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

<ModalLayout class="full-height talk-to-npc-screen">
  <div slot="header">
    <div class="flex header">
      <BoxButton type="secondary">
        <img src="{IconNPCAlchemist}" alt="profile" />
      </BoxButton>
      <div class="text">
        <p>
          <strong>{npcName}:</strong>
        </p>
        <!-- USE KEYED BLOCKS TO RE-TRANSITION "IN" ON TEXT CHANGES -->
        {#each [{ id: Date.now(), text: npcText }] as text (text.id)}
          <p in:typewriter>
            {@html text.text}
          </p>
        {/each}
      </div>
    </div>
  </div>

  <div slot="content">
    <div class="gear-list">
      {#if transferableBag.length === 0}
        <p class="text-center">You do not have any items in your bag</p>
      {/if}

      {#each transferableBag as gear (gear.id)}
        <Gear
          {gear}
          onAddItem="{isAdded(gear) ? null : () => onAddItem(gear)}"
          onRemoveItem="{isAdded(gear) ? () => onRemoveItem(gear) : null}"
          disabled="{isDisabled || confirming}"
        />
        <Line />
      {/each}
    </div>
  </div>

  <div slot="footer">
    <div class="button">
      {#if confirming}
        <BoxButton type="wide full" {isDisabled} onClick="{() => onCancel()}">Nevermind</BoxButton>
      {/if}
      <BoxButton
        type="wide full"
        isDisabled="{isDisabled || selectedItems.size === 0}"
        {onClick}
        loadingText="Trading..."
      >
        {#if sending}
          Trading...
        {:else if confirming}
          Trade
        {:else if transferableBag.length === 0}
          No items to trade
        {:else if selectedItems.size === 0}Choose items to trade{:else}What do I get?{/if}
      </BoxButton>
    </div>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>
</ModalLayout>
