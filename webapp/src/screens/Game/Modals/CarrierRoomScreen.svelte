<script>
  import { onMount } from 'svelte';

  import { dungeon } from 'stores/dungeon';
  import { characterBalances, characterBag, characterPortrait, characterSlots, characterVault } from 'lib/cache';
  import { pluralize } from 'utils/text';

  import BoxButton from 'components/BoxButton';
  import Consumables from 'components/bag/Consumables';
  import Gear from 'components/bag/Gear';
  import Line from 'components/Line';
  import ModalLayout from 'components/layouts/ModalLayout';

  import IconBag from 'assets/icons/bag_s_2x.png';
  import IconVault from 'assets/icons/vault_s_2x.png';

  let error;
  let isBag = true;
  let notEnoughCoins = false;
  let cost = '--';
  let loading = true;
  let sending = false;
  let approvedElements = false;
  let approvedGears = false;
  let expandConsumables;

  // --- COMMON ---

  // Selected items
  $: selectedItems = {};

  // Expand/collapse consumbles panel
  const onExpand = () => {
    selectedItems = {};
    expandConsumables = !expandConsumables;
  };

  // Tab toggle direction
  const toggleDirection = () => {
    isBag = !isBag;
    selectedItems = {};
    expandConsumables = false;
    error = null;
  };

  // Vault items and wallet approvals
  $: unlocked = isBag || (!!expandConsumables && approvedElements) || (!expandConsumables && approvedGears);

  // Check approvals on mount, fetch vault
  onMount(async () => {
    [approvedElements, approvedGears] = await Promise.all([
      $dungeon.isCarrierApproved('Elements'),
      $dungeon.isCarrierApproved('Gears'),
    ]);
    await $dungeon.cache.fetchVault();
  });

  // Filter out equipped gear from bag
  $: transferableBag = $characterBag.filter(
    ({ id }) =>
      Object.values($characterSlots)
        .map(g => g.id)
        .indexOf(id) === -1,
  );

  // Calculate transfer cost and determine if has enough coin
  $: (async () => {
    cost = await $dungeon.carrierCost();
    let minCoins = $characterBalances.coins;
    if (isBag && !!expandConsumables) {
      minCoins -= selectedItems.coins || 0;
    }
    notEnoughCoins = cost > minCoins;
    loading = false;
  })();
  $: costPhrase = `${cost} ${pluralize('coin', cost)}`;

  // Check if item already added
  $: isAdded = ({ id }) => Object.keys(selectedItems).includes(id);

  // Check bag has enough available slots to transfer to bag
  $: tooManyItems = !isBag && !expandConsumables && Object.keys(selectedItems).length > 10 - $characterBag.length;
  $: notEnoughSlots = !isBag && !expandConsumables && Object.keys(selectedItems).length >= 10 - $characterBag.length;

  // Check if able to transfer
  $: isDisabled = loading || sending || notEnoughCoins || tooManyItems;

  // Add/remove items and force svelte assignment re-render
  const onAddItem = ({ id }, amount) => {
    if (amount) {
      selectedItems[id] = amount;
    } else {
      delete selectedItems[id];
    }
    // Svelte assignment re-render
    selectedItems = selectedItems;
  };
  const onRemoveItem = ({ id }) => {
    delete selectedItems[id];
    // Svelte assignment re-render
    selectedItems = selectedItems;
  };

  $: isAllSelected = Object.keys(selectedItems).length === transferableBag.length;
  const toggleAllItems = () => {
    if (isBag) {
      if (isAllSelected) {
        selectedItems = {};
      } else {
        transferableBag.forEach(({ id }) => (selectedItems[id] = true));
        selectedItems = selectedItems;
      }
    }
  };

  // Delay
  const delay = async t => new Promise(r => setTimeout(r, t));

  // Handle approval
  const unlockVault = async () => {
    loading = true;
    if (!!expandConsumables && !approvedElements) {
      await $dungeon.approveCarrier('Elements');
      approvedElements = await $dungeon.isCarrierApproved('Elements');
    } else if (!expandConsumables && !approvedGears) {
      await $dungeon.approveCarrier('Gears');
      approvedGears = await $dungeon.isCarrierApproved('Gears');
    }
    loading = false;
  };

  // Handle transfer of NFT items
  const transferItems = async () => {
    error = null;
    sending = true;
    try {
      if (expandConsumables) {
        if (isBag) {
          await $dungeon.sendElementsToVault(selectedItems);
        } else {
          // Always attempt to unlock vault before transfer
          await unlockVault();
          await $dungeon.retrieveElementsFromVault(selectedItems);
        }
      } else {
        const ids = Object.keys(selectedItems);
        if (isBag) {
          await $dungeon.sendGearsToVault(ids);
        } else {
          // Always attempt to unlock vault before transfer
          await unlockVault();
          await $dungeon.retrieveGearsFromVault(ids);
        }
      }

      // Wait for BE to catch up, then fetch vault...
      await delay(3000);
      await $dungeon.cache.fetchVault();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
      if (err.reason === 'does not own enough') {
        error = 'Not enough coins. Try again later.';
      }
    } finally {
      selectedItems = {};
      expandConsumables = false;
      sending = false;
    }
  };

  // Unlock vault, otherwise transfer items
  const onClick = () => {
    if (!unlocked) {
      unlockVault();
    } else {
      transferItems();
    }
  };

  // --- ELEMENTS ---
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.carrier-room-screen) {
    @media screen and (min-width: $desktop-min-width) {
      max-width: 450px !important;
    }
  }

  .flex {
    display: flex;
    flex-direction: row;
    justify-content: stretch;

    &.header {
      padding-right: 24px;

      :global(button) {
        margin-right: 12px;
      }

      img {
        height: 40px;
        width: auto;
      }

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

  .select-all {
    :global(button) {
      width: auto;
    }
  }

  .button {
    padding: 8px 12px 0;
  }

  .error {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
    text-align: center;
  }
</style>

<ModalLayout class="full-height carrier-room-screen">
  <div slot="header">
    <div class="flex header">
      <BoxButton type="secondary">
        <img src="{$characterPortrait}" alt="profile" />
      </BoxButton>
      <p>You are in a carrier room. Send items between your bag and your vault. Each transfer costs {costPhrase}.</p>
    </div>

    <div class="flex tabs with-arrows">
      <BoxButton
        type="wide"
        class="{isBag ? 'selected' : ''}"
        disabled="{isBag}"
        onClick="{isBag ? null : toggleDirection}"
      >
        <img src="{IconBag}" alt="Bag" />
        Bag
      </BoxButton>
      <BoxButton
        type="wide"
        class="{!isBag ? 'selected' : ''}"
        disabled="{!isBag}"
        onClick="{!isBag ? null : toggleDirection}"
      >
        <img src="{IconVault}" alt="Vault" />
        Vault
      </BoxButton>
    </div>
  </div>

  <div slot="content">
    <div class="gear-list">
      {#if isBag}
        <Consumables
          {onExpand}
          disabled="{isDisabled}"
          expanded="{expandConsumables}"
          balances="{$characterBalances}"
          {selectedItems}
          onChange="{(id, amount) => onAddItem({ id }, amount)}"
          carrierCost="{cost}"
        />

        {#if !expandConsumables}
          {#if $characterBag.length === 0}
            <p class="text-center">You do not have any items in your bag</p>
          {:else}
            <div class="select-all text-right">
              <BoxButton type="loot-action" {isDisabled} onClick="{() => toggleAllItems()}">
                {#if isAllSelected}Unselect all{:else}Select all{/if}
              </BoxButton>
            </div>
            {#each transferableBag as gear (gear.id)}
              <Line />
              <Gear
                {gear}
                onAddItem="{isAdded(gear) ? null : () => onAddItem(gear, true)}"
                onRemoveItem="{isAdded(gear) ? () => onRemoveItem(gear) : null}"
                disabled="{isDisabled}"
              />
            {/each}
          {/if}
        {/if}
      {:else}
        <Consumables
          {onExpand}
          disabled="{!approvedElements || isDisabled}"
          expanded="{expandConsumables}"
          balances="{$characterVault.balance}"
          {selectedItems}
          onChange="{(id, amount) => onAddItem({ id }, amount)}"
        />

        {#if !expandConsumables}
          {#if $characterVault.gear.length === 0}
            <p class="text-right">You do not have any items in your vault</p>
          {/if}
          {#each $characterVault.gear as gear (gear.id)}
            <Gear
              {gear}
              onAddItem="{isAdded(gear) ? null : () => onAddItem(gear, true)}"
              onRemoveItem="{isAdded(gear) ? () => onRemoveItem(gear) : null}"
              disabled="{!approvedGears || isDisabled || (notEnoughSlots && !Object.keys(selectedItems).includes(gear.id))}"
            />
            <Line />
          {/each}
        {/if}
      {/if}
    </div>
  </div>

  <div slot="footer">
    <div class="button">
      <BoxButton
        type="wide full"
        isDisabled="{isDisabled || (unlocked && Object.keys(selectedItems).length === 0)}"
        {onClick}
        loadingText="{!unlocked ? 'Unlocking...' : 'Sending...'}"
      >
        {#if loading}
          ...
        {:else if sending}
          {!unlocked ? 'Unlocking...' : 'Sending...'}
        {:else if !unlocked}
          Unlock vault
        {:else if notEnoughCoins}
          Not enough coins to send
        {:else if tooManyItems}
          Not enough slots in bag
        {:else if Object.keys(selectedItems).length === 0}
          Choose items to send
        {:else}
          Send items to
          {#if isBag}the Vault{:else}your Bag{/if}
        {/if}
      </BoxButton>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>
  </div>
</ModalLayout>
