<script>
  import { pluralize } from 'utils/text';

  export let keys;
  export let coins;
  export let fragments;
  export let hideEmpty = false;
  export let excludeCoins = false;

  // @NOTE: THERE IS NO GUARANTEE THIS WILL WORK IN FUTURE VERSIONS.
  // https://github.com/sveltejs/svelte/issues/2106#issuecomment-501000254
  const slots = Object.keys($$props.$$slots || {});
</script>

<style lang="scss">
  @import '../../styles/variables';

  .center {
    display: flex;
    justify-content: center;
  }
  .slot {
    padding: 11px;
  }
  .res {
    color: $color-darker-text;
    font-size: 14px;
  }
  img {
    height: 11px;
    margin-right: 5px;
  }
</style>

<div class="center">
  {#if slots.length}
    <span class="slot">
      <slot />
    </span>
  {/if}
  {#if !(hideEmpty && !keys)}
    <span class="res slot" title="{`${keys} ${pluralize('key', keys)}`}">
      <img src="/images/game-icons/key_2x.png" alt="key" />
      {keys}
    </span>
  {/if}
  {#if !excludeCoins && !(hideEmpty && !coins)}
    <span class="res slot" title="{`${coins} ${pluralize('coin', coins)}`}">
      <img src="/images/game-icons/coin_2x.png" alt="coin" />
      {coins}
    </span>
  {/if}
  {#if !(hideEmpty && !fragments)}
    <span class="res slot" title="{`${fragments} ${pluralize('fragment', fragments)}`}">
      <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
      {fragments}
    </span>
  {/if}
</div>
