<script>
  import elements from 'data/elements';
  import { pluralize } from 'utils/text';

  import BoxButton from 'components/BoxButton';
  import Element from 'components/bag/Element';
  import QuantitySelection from 'components/QuantitySelection';
  import Resources from 'components/bag/Resources';

  export let balances = {};
  export let disabled;
  export let expanded;
  export let onChange;
  export let onDrop;
  export let onExpand;
  export let selectedItems = {};
  export let excludeCoins = false;
  export let carrierCost = 0;

  // --- CONSUMABLE DROPPING ---

  const elementTypes = ['fire', 'air', 'electricity', 'earth', 'water'];

  $: elementBalances = { ...balances };
  $: if (elementBalances.elements) {
    elementTypes.forEach((k, i) => {
      elementBalances[k] = balances.elements[i] || 0;
    });
  }

  $: hasAnyElements = elementTypes.map(e => elementBalances[e]).filter(Boolean).length;
  $: hasAnyConsumables =
    hasAnyElements || ['keys', !excludeCoins && 'coins', 'fragments'].map(e => balances[e]).filter(Boolean).length;
  $: hasSelected = Object.values(selectedItems).filter(Boolean).length;
</script>

<style lang="scss">
  @import '../../styles/variables';

  .content--consumables {
    padding: 12px;
    margin-bottom: 24px;
    border: 1px solid rgba($color-grey, 0.42);

    :global(.qty-select) {
      padding: 0 0 12px 0;
    }

    .drop-button {
      padding: 12px 0;
    }

    p {
      margin-top: -8px;
      padding: 0 0 12px 0;
      em {
        color: $color-lightGrey;
        font-size: 10px;
      }
    }
  }
</style>

<div class="content--consumables">
  {#if hasAnyConsumables && expanded}
    <div>
      {#if balances.keys}
        <h6 class="text-center italic darker">Keys</h6>
        <QuantitySelection
          {disabled}
          icon="/images/game-icons/key_2x.png"
          min="0"
          max="{balances.keys}"
          value="{selectedItems.keys || 0}"
          onChange="{val => onChange('keys', val)}"
        />
      {/if}
      {#if !excludeCoins && balances.coins}
        <h6 class="text-center italic darker">Coins</h6>
        <QuantitySelection
          {disabled}
          icon="/images/game-icons/coin_2x.png"
          min="0"
          max="{balances.coins}"
          maxLimit="{balances.coins - carrierCost}"
          value="{selectedItems.coins || 0}"
          onChange="{val => onChange('coins', val)}"
        />
        {#if carrierCost}
          <p class="text-center">
            <em>(Excluding {carrierCost} {pluralize('coin', carrierCost)} for transfer cost)</em>
          </p>
        {/if}
      {/if}
      {#if balances.fragments}
        <h6 class="text-center italic darker">Fragments</h6>
        <QuantitySelection
          {disabled}
          icon="/images/game-icons/fragment_4x.png"
          min="0"
          max="{balances.fragments}"
          value="{selectedItems.fragments || 0}"
          onChange="{val => onChange('fragments', val)}"
        />
      {/if}

      <!-- Only show if character has elements -->
      {#if hasAnyElements}
        <h6 class="text-center italic darker">Elements</h6>
        {#each elementTypes as type}
          {#if elementBalances[type]}
            <QuantitySelection
              {disabled}
              icon="{elements[type].icon}"
              min="0"
              max="{elementBalances[type]}"
              value="{selectedItems[type] || 0}"
              onChange="{val => onChange(type, val)}"
            />
          {/if}
        {/each}
      {/if}

      {#if onDrop}
        <div class="drop-button">
          <BoxButton
            type="wide full"
            isDisabled="{!hasSelected || disabled}"
            onClick="{onDrop}"
            loadingText="Dropping..."
          >
            Drop items
          </BoxButton>
        </div>
      {/if}
    </div>
  {:else}
    <Resources {excludeCoins} keys="{balances.keys}" coins="{balances.coins}" fragments="{balances.fragments}" />

    <div class="block">
      <h6 class="text-center italic darker">Elements</h6>
      <div class="as-row as-space-between">
        {#each elementTypes as type}
          <Element {type} value="{elementBalances[type]}" />
        {/each}
      </div>
    </div>
  {/if}

  {#if onExpand && hasAnyConsumables}
    <div class="text-center">
      <BoxButton type="secondary-action" onClick="{onExpand}">
        {#if expanded}Back{:else}Choose{/if}
      </BoxButton>
    </div>
  {/if}
</div>
