<script>
  import { characterBalances, characterBag, characterSlots, characterStatus } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';

  import BagLayout from 'components/layouts/BagLayout';
  import Consumables from 'components/bag/Consumables';
  import Gear from 'components/bag/Gear';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';

  let loading;

  // --- GEAR DROPPING ---
  $: equipped = [$characterSlots.attackGear, $characterSlots.defenseGear];

  const isEquipped = gear => equipped.find(g => g.id === gear.id);

  const dropGear = async gear => {
    // eslint-disable-next-line no-console
    console.log('dropping', gear);
    await $dungeon.drop(gear);
  };

  // --- CONSUMABLE DROPPING ---

  let expandConsumables;

  // Selected items
  $: selectedItems = {};

  const onAddItem = (key, val) => {
    selectedItems[key] = val;
    // Svelte assignment re-render
    selectedItems = selectedItems;
  };

  const dropConsumables = async () => {
    loading = true;

    try {
      console.log('dropping', selectedItems);
      await $dungeon.dropElements(selectedItems);
      selectedItems = {};
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    loading = false;
  };

  const onExpand = () => {
    selectedItems = {};
    expandConsumables = !expandConsumables;
  };
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
  }
</style>

<BagLayout>
  <div slot="header">
    <Header title="Bag" subtitle="{$characterBag.length}/10" />
  </div>

  <div slot="content">
    <Consumables
      {onExpand}
      disabled="{loading}"
      expanded="{expandConsumables}"
      balances="{$characterBalances}"
      {selectedItems}
      onChange="{onAddItem}"
      onDrop="{dropConsumables}"
    />

    <div class="block">
      <h6 class="text-center italic darker">Gear</h6>

      <div class="block">
        {#each $characterBag as gear (gear.id)}
          <Gear
            {gear}
            equipped="{isEquipped(gear)}"
            disabled="{$characterStatus === 'dead'}"
            onDrop="{() => dropGear(gear)}"
          />
          <Line />
        {/each}
      </div>
    </div>
  </div>
</BagLayout>
