<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  import QuantitySelection from 'components/QuantitySelection';

  export let value = 0;
  export let minValue;
  export let maxValue;
  export let limitValue;
  export let infinite = false;
  export let onQuantityChange;

  const minPercentage = tweened(infinite ? 100 : Math.min(100, Math.max(0, (minValue / maxValue) * 100)), {
    duration: 1000,
    easing: cubicOut,
  });
  const percentage = tweened(infinite ? 100 : Math.min(100, Math.max(0, (value / maxValue) * 100)), {
    duration: 1000,
    easing: cubicOut,
  });

  const limitPercentage = Math.min(100, Math.max(0, (limitValue / maxValue) * 100));
  $: minPercentage.set(Math.min(100, Math.max(0, (minValue / maxValue) * 100)));
  $: percentage.set(Math.min(100, Math.max(0, (value / maxValue) * 100)));
</script>

<style lang="scss">
  @import '../styles/variables';

  .flex {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: stretch;
    width: 100%;
  }

  .area {
    padding: 1px;
    margin: 0 12px;
    border: 1px solid $color-grey;
  }
  .maxBar {
    position: relative;
    width: 100%;
    height: 24px;
  }
  .value-bar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    height: auto;
    z-index: -1;
    background-color: $color-light;
    mix-blend-mode: difference;
    transition: mix-blend-mode 0.2s linear;
    opacity: 0.72;

    &.min-value,
    &.range-value {
      opacity: 1;
      background-color: $color-highlight;
      mix-blend-mode: unset;
    }
    &.range-value {
      opacity: 0.72;
    }
    &.limit-value {
      left: unset;
      right: 0;
      background-color: rgba($color-light, 0.3);
    }
  }
  .limit-bar {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 1px;
    height: auto;
    background-color: $color-light;
    z-index: 1;
    transform: translateX(-50%);

    &:after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 2px;
      display: block;
      border: 4px solid transparent;
      border-top-color: $color-light;
      mix-blend-mode: none;
      overflow: visible;
      transform: translateX(calc(-50% - 1px));
    }
  }
  .value-area {
    width: 100%;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: $color-background;
    display: flex;
    justify-content: space-between;
    padding: 0 6px;
    color: $color-light;
    box-sizing: border-box;
  }
  .max-value,
  .value {
    font-size: 14px;
    letter-spacing: -0.02em;
  }
  .max-value {
    text-align: right;
    color: $color-lightGrey;
  }
</style>

<QuantitySelection
  min="{minValue}"
  max="{limitValue}"
  {value}
  onChange="{val => onQuantityChange(val)}"
  showMax="{false}"
>
  <div class="area">
    <div class="maxBar">
      <div class="value-area">
        <strong class="value" class:red="{$minPercentage <= 15}">{Math.max(0, value)}</strong>
        {#if !infinite}
          <span class="max-value">/{maxValue}</span>
        {/if}
      </div>
      <div style="width: {$minPercentage}%" class="value-bar min-value"></div>
      <div style="left: {$minPercentage}%; width: {$percentage - $minPercentage}%;" class="value-bar range-value"></div>
      <div style="width: {100 - $minPercentage}%" class="value-bar limit-value"></div>
      <div style="left: {limitPercentage}%" class="limit-bar"></div>
    </div>
  </div>
</QuantitySelection>
