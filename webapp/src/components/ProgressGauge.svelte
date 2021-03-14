<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let current = 0;
  export let duration = 1000;
  export let limit = 0;
  export let increments = 4;
  export let warning = false;

  let percentage;
  let incrementWidth = 100 / increments;

  $: value = limit > 0 ? Math.min(100, Math.max(0, (current / limit) * 100)) : 0;
  $: {
    if (!percentage) {
      percentage = tweened(value, { duration, easing: cubicOut });
    }
    percentage.set(value);
  }
</script>

<style lang="scss">
  @import '../styles/variables';

  .progress-gauge {
    position: relative;
    height: 100%;
    background-color: $color-grey;

    &--increment {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 3;
      margin-left: -1px;
      border-left: 2px solid $color-panel;
    }

    &--value {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 1;
      background-color: $color-light;

      &.warning {
        background-color: $color-highlight;
      }
    }
  }
</style>

<div class="progress-gauge">
  {#each Array(Math.max(0, increments - 1)) as _, i}
    <div class="progress-gauge--increment" style="left: {incrementWidth * (i + 1)}%;"></div>
  {/each}
  <div class="progress-gauge--value" class:warning style="width: {$percentage}%;"></div>
</div>
