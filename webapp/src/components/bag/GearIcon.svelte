<script>
  import { gearImage } from 'utils/data';

  import ProgressGauge from 'components/ProgressGauge';

  export let gear;

  $: ({ durability, maxDurability = 1000 } = gear);
</script>

<style lang="scss">
  @import '../../styles/variables';

  .gear-icon {
    position: relative;
    width: 50px;
    height: 50px;
    background: $color-panel;

    .icon {
      width: auto;
      height: 100%;
    }
    .unique {
      position: absolute;
      width: 12px;
      height: 12px;
      top: 2px;
      left: 2px;
    }

    .durability-bar {
      position: absolute;
      bottom: 3px;
      left: 3px;
      right: 3px;
      z-index: 2;
      height: 2px;
    }
  }
</style>

<div class="gear-icon">
  {#if gear.unique}
    <img class="unique" src="/images/game-icons/diamond.png" alt="diamond" />
  {/if}

  <img class="icon" alt="{gear.name}" src="{gearImage(gear)}" />

  {#if durability < 1000 && maxDurability > 0}
    <div class="durability-bar">
      <ProgressGauge current="{durability}" limit="{maxDurability}" warning="{durability <= 3}" />
    </div>
  {/if}
</div>
