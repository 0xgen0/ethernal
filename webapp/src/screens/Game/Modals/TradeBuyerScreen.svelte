<script>
  import { onMount } from 'svelte';

  import {
    fetchCache,
    characterBag,
    characterBalances,
    characterSlots,
    characterId,
    onlineCharacters,
    currentRoom,
  } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';
  import { mapModal } from 'stores/screen';

  import BoxButton from 'components/BoxButton';
  import Consumables from 'components/bag/Consumables';
  import Gear from 'components/bag/Gear';
  import Line from 'components/Line';
  import ModalLayout from 'components/layouts/ModalLayout';
  import QuantitySelection from 'components/QuantitySelection';

  export let id;

  let balances;
  let character;
  let error;
  let expandConsumables;
  let loading = true;
  let offer = 0;

  // Get character info
  $: (async () => {
    if (id && (!character || character.id !== id)) {
      if ($onlineCharacters[id]) {
        character = $onlineCharacters[id];
      } else {
        character = await fetchCache(`characters/${id}`);
      }
      loading = false;
    }
  })();

  $: {
    const { coins, keys, fragments, elements } = character || {};
    balances = { coins, keys, fragments, elements };
  }

  // Selected items
  $: selectedItems = {};

  // Expand/collapse consumbles panel
  const onExpand = () => {
    selectedItems = {};
    expandConsumables = !expandConsumables;
  };

  $: disabled = loading || Object.values(selectedItems).length === 0 || offer < 1;

  // Check if item already added
  $: isAdded = ({ id }) => Object.keys(selectedItems).includes(id);

  // Check bag has enough available slots to transfer to bag
  $: tooManyItems = !expandConsumables && Object.keys(selectedItems).length > 10 - $characterBag.length;
  $: notEnoughSlots = !expandConsumables && Object.keys(selectedItems).length >= 10 - $characterBag.length;

  // Check if able to transfer
  $: isDisabled = loading || $characterBalances.coins === 0;
  $: isQtyDisabled = isDisabled || Object.values(selectedItems).length === 0;
  $: isOfferDisabled = isQtyDisabled || tooManyItems || offer < 1;

  // Filter out equipped gear from bag
  $: transferableBag =
    character && character.gear.filter(({ id }) => ![character.attackGear.id, character.defenseGear.id].includes(id));

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

  const changeOffer = val => (offer = val);

  const makeOffer = async () => {
    loading = true;
    error = null;

    try {
      let sellerDeal;
      if (expandConsumables) {
        sellerDeal = { amounts: $dungeon.convertConsumablesToArray(selectedItems) };
      } else {
        sellerDeal = { gears: Object.keys(selectedItems) };
      }
      const buyerDeal = { amounts: $dungeon.convertConsumablesToArray({ coins: offer }) };
      await $dungeon.requestTrade(id, buyerDeal, sellerDeal);
      mapModal.close();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
      loading = false;
    }
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.trade-buyer-screen) {
    @media screen and (min-width: $desktop-min-width) {
      max-width: 450px !important;
    }
  }

  .footer {
    display: flex;
    justify-content: space-evenly;
    margin: 0 -3px;

    &--offer,
    &--buttons {
      width: 50%;
      padding: 0 3px;
    }
  }

  .error {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
    text-align: center;
  }
</style>

<ModalLayout class="full-height trade-buyer-screen">
  <div slot="header">
    <h2 class="text-center">{character.characterName}’s Bag</h2>
  </div>

  <div slot="content">
    {#if $characterId == id}
      <p class="text-center">Please wait for the buyer to pick what they want from your bag.</p>
    {:else if character.coordinates !== $currentRoom.coordinates}
      <p class="text-center"><strong>{character.characterName}</strong> is not in the same room with you.</p>
    {:else}
      <Consumables
        {onExpand}
        disabled="{isDisabled}"
        expanded="{expandConsumables}"
        {balances}
        {selectedItems}
        onChange="{(id, amount) => onAddItem({ id }, amount)}"
        excludeCoins="{true}"
      />

      {#if !expandConsumables}
        {#if transferableBag.length === 0}
          <p class="text-center">{character.characterName} does not have any items</p>
        {/if}
        {#each transferableBag as gear (gear.id)}
          <Gear
            {gear}
            onAddItem="{isAdded(gear) ? null : () => onAddItem(gear, true)}"
            onRemoveItem="{isAdded(gear) ? () => onRemoveItem(gear) : null}"
            disabled="{isDisabled}"
          />
          <Line />
        {/each}
      {/if}
    {/if}
  </div>

  <div slot="footer">
    {#if $characterId != id && character.coordinates === $currentRoom.coordinates}
      <div class="footer">
        <div class="footer--offer">
          <QuantitySelection
            disabled="{isQtyDisabled}"
            icon="/images/game-icons/coin_2x.png"
            min="0"
            max="{$characterBalances.coins}"
            value="{offer}"
            onChange="{val => changeOffer(val)}"
          />
        </div>
        <div class="footer--buttons">
          <BoxButton type="wide full" isDisabled="{isOfferDisabled}" onClick="{makeOffer}" loadingText="...">
            {#if $characterBalances.coins === 0}
              Not enough coins
            {:else if tooManyItems || notEnoughSlots}
              Not enough slots
            {:else}
              Offer
            {/if}
          </BoxButton>
        </div>
      </div>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    {/if}
  </div>
</ModalLayout>
