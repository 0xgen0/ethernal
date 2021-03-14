<script>
  import { dungeon } from 'stores/dungeon';
  import { characterClassName, characterStatus, characterLevel } from 'lib/cache';
  import BagLayout from 'components/layouts/BagLayout';
  import Header from 'components/bag/Header';
  import Gear from 'components/bag/Gear';
  import Line from 'components/Line';

  export let type;
  export let items;
  export let selected;

  $: dead = $characterStatus === 'dead';
  $: filteredItems = items.filter(
    item =>
      item.classes.length === 0 ||
      item.classes.map(g => (g === 'adventurer' ? 'explorer' : g)).includes($characterClassName.toLowerCase()),
  );

  const equip = async item => {
    await $dungeon.equip(item);
  };
</script>

<BagLayout>
  <div slot="header">
    <Header title="Equip {type}" closeable />
  </div>

  <div slot="content">
    {#if selected && (selected.maxDurability === 0 || selected.durability > 0)}
      <div class="block">
        <h6 class="text-center darker italic pad-bottom-10">Equipped {type}</h6>
        <Gear gear="{selected}" />
      </div>
    {/if}

    {#if filteredItems.length}
      <div class="block">
        <h6 class="text-center darker italic pad-bottom-10">{type}s Available</h6>

        {#each filteredItems as item (item.id)}
          <Gear
            gear="{item}"
            disabled="{dead}"
            playerClassName="{$characterClassName}"
            playerLevel="{$characterLevel}"
            onEquip="{() => equip(item)}"
          />
          <Line />
        {/each}
      </div>
    {/if}
  </div>
</BagLayout>
