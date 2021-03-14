<script>
  import {onMount} from 'svelte';

  import {dungeon} from 'stores/dungeon';
  import {characterVault} from 'lib/cache';

  import BagLayout from 'components/layouts/BagLayout';
  import Header from 'components/bag/Header';
  import Gear from 'components/bag/Gear';
  import Line from 'components/Line';
  import Resources from "../../components/bag/Resources.svelte";
  import Element from "../../components/bag/Element.svelte";

  onMount(async () => {
    await $dungeon.cache.fetchVault();
  });
</script>

<style lang="scss">
  @import '../../styles/variables';

  p {
    font-style: italic;
    font-weight: normal;
    font-size: 10px;
    line-height: 15px;
    text-align: center;
    color: $color-grey;
    padding-left: 40px;
    padding-right: 40px;
  }
</style>

<BagLayout>
  <div slot="header">
    <Header title="Vault" />
  </div>

  <div slot="content">
    <p>To use these items you must first send them to your bag in a Carrier room.</p>

    <Resources
        keys="{$characterVault.balance.keys}"
        coins="{$characterVault.balance.coins}"
        fragments="{$characterVault.balance.fragments}"
    />

    <div class="block">
      <h6 class="text-center italic darker">Elements</h6>
      <div class="as-row as-space-between">
        <Element type="fire" value="{$characterVault.balance.elements[0]}" />
        <Element type="air" value="{$characterVault.balance.elements[1]}" />
        <Element type="electricity" value="{$characterVault.balance.elements[2]}" />
        <Element type="earth" value="{$characterVault.balance.elements[3]}" />
        <Element type="water" value="{$characterVault.balance.elements[4]}" />
      </div>
    </div>

    {#if $characterVault.gear.length}
      <div class="block">
        <h6 class="text-center italic darker">Gear</h6>

        <div class="block">
          {#each $characterVault.gear as gear (gear.id)}
            <Gear {gear} />
            <Line />
          {/each}
        </div>
      </div>
    {/if}
  </div>
</BagLayout>
