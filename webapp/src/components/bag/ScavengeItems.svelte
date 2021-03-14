<script>
  import { dungeon } from 'stores/dungeon';

  import BoxButton from 'components/BoxButton';
  import Element from 'components/bag/Element';
  import Gear from 'components/bag/Gear';
  import Line from 'components/Line';

  export let items;
  export let fullBag;
  export let disabled;

  const takeElements = async type => {
    // Get value based on type
    let value = items.elements[type];
    if (type === 5) {
      value = items.coins;
    } else if (type === 6) {
      value = items.keys;
    } else if (type === 7) {
      value = items.fragments;
    }

    // If a character is not defined, then this is a dropped loot elements
    if (!items.character) {
      await $dungeon.pickElement(type + 1, value);
      return;
    }

    // Otherwise scavenge from corpse
    await $dungeon.scavengeElements(items.character, type + 1, value);
  };

  const takeGear = async gear => {
    await $dungeon.scavengeGear(items.character, gear.id);
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .elements {
    padding-left: 20px;
    padding-right: 20px;
    padding-bottom: 10px;
    display: flex;
    min-width: 260px;
    justify-content: space-between;

    :global(.loot-action) {
      width: auto;
      margin-left: 6px;
    }
  }
  .slot {
    flex: 1;
    padding: 11px;
  }
  .res {
    color: $color-darker-text;
  }
  img {
    height: 11px;
    margin-right: 5px;
  }
  .loot {
    padding-bottom: 15px;
  }
  p {
    padding-bottom: 5px;
  }
</style>

<div class="elements">
  {#if items.keys > 0}
    <div class="res slot text-center">
      <img src="/images/game-icons/key_4x.png" alt="key" />
      {items.keys}
      <BoxButton
        type="loot-action"
        loadingText="..."
        onClick="{() => takeElements(6)}"
        isDisabled="{disabled}"
        needsFood
      >
        Take
      </BoxButton>
    </div>
  {/if}

  {#if items.coins > 0}
    <div class="res slot text-center">
      <img src="/images/game-icons/coin_4x.png" alt="coin" />
      {items.coins}
      <BoxButton
        type="loot-action"
        loadingText="..."
        onClick="{() => takeElements(5)}"
        isDisabled="{disabled}"
        needsFood
      >
        Take
      </BoxButton>
    </div>
  {/if}

  {#if items.fragments > 0}
    <div class="res slot text-center">
      <img src="/images/game-icons/fragment_4x.png" alt="coin" />
      {items.fragments}
      <BoxButton
        type="loot-action"
        loadingText="..."
        onClick="{() => takeElements(7)}"
        isDisabled="{disabled}"
        needsFood
      >
        Take
      </BoxButton>
    </div>
  {/if}

  <!-- @TODO - ADD FRAGMENTS -->
</div>

{#if items.elements && items.elements.reduce((acc, el) => acc + el) > 0}
  <h4 class="text-center ">Elements</h4>
  <div class="elements">
    {#if items.elements[0] > 0}
      <Element type="fire" value="{items.elements[0]}" onTake="{() => takeElements(0)}" {disabled} />
    {/if}
    {#if items.elements[1] > 0}
      <Element type="air" value="{items.elements[1]}" onTake="{() => takeElements(1)}" {disabled} />
    {/if}
    {#if items.elements[2] > 0}
      <Element type="electricity" value="{items.elements[2]}" onTake="{() => takeElements(2)}" />
    {/if}
    {#if items.elements[3] > 0}
      <Element type="earth" value="{items.elements[3]}" onTake="{() => takeElements(3)}" {disabled} />
    {/if}
    {#if items.elements[4] > 0}
      <Element type="water" value="{items.elements[4]}" onTake="{() => takeElements(4)}" {disabled} />
    {/if}
  </div>
{/if}

{#if items.gear && items.gear.length > 0}
  <h4 class="text-center">Gear</h4>
  {#each items.gear as gear (gear.id)}
    <Gear {gear} onTake="{() => takeGear(gear)}" disabled="{fullBag || disabled}" />
    <Line />
  {/each}
{/if}
