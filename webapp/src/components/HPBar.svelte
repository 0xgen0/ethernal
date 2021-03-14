<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let label = 'HP';
  export let value = 0;
  export let maxValue;
  export let infinite = false;

  const percentage = tweened(infinite ? 100 : Math.min(100, Math.max(0, (value / maxValue) * 100)), {
    duration: 1000,
    easing: cubicOut,
  });

  $: percentage.set(infinite ? 100 : Math.min(100, Math.max(0, (value / maxValue) * 100)));
  $: smaller = value > 999 || (maxValue && maxValue > 999)
</script>

<style lang="scss">
  @import '../styles/variables';

  .area {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .label {
    margin: 2px 2px 2px 0;
  }
  .maxBar {
    width: 100%;
    height: 14px;
    // background-color: rgba($color-light, 0.2);
    border: 1px solid $color-grey;
    padding: 1px;
    position: relative;
  }
  .value-bar {
    height: 14px;
    background-color: $color-light;
    mix-blend-mode: difference;
  }
  .value-area {
    width: 100%;
    position: absolute;
    color: $color-background;
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
    color: $color-light;
    box-sizing: border-box;
  }
  .max-value,
  .value {
    font-size: 12px;
    letter-spacing: -0.02em;

    @media screen and (max-width: $mobile-max-width) {
      font-size: 10px;
    }

    .smaller & {
      font-size: 10px;
      letter-spacing: -0.04em
    }
  }
  .max-value {
    text-align: right;
    color: $color-grey;
  }
  div.red {
    background-color: $color-highlight;
    mix-blend-mode: unset;
    transition: mix-blend-mode 0.2s linear;
  }
</style>

<div class="area" class:smaller>
  <div class="label">{label}</div>
  <div class="maxBar">
    <div class="value-area">
      <span class="value" class:red="{label === 'HP' && $percentage <= 15}">
        <strong>{Math.max(0, value)}</strong>
      </span>
      {#if !infinite}
        <span class="max-value">/{maxValue}</span>
      {/if}
    </div>
    <div class:red="{label === 'HP' && $percentage <= 15}" style="width: {$percentage}%;" class="value-bar"></div>
  </div>
</div>
