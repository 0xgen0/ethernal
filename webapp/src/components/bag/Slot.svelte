<script>
  import { groupActions } from 'utils/data';

  import BorderedContainer from 'components/BorderedContainer';
  import Box from 'components/Box';
  import BoxButton from 'components/BoxButton';
  import GearAction from 'components/bag/GearAction';
  import GearIcon from 'components/bag/GearIcon';

  export let gear;
  export let onClick;
  export let watermark;

  $: broken = gear && (gear.maxDurability !== 0 && gear.durability <= 0);

  const as = onClick ? BoxButton : Box;

  if (gear === 'placeholder') {
    gear = {
      id: 1,
      level: 0,
      name: 'fake sword',
      set: 'Flame',
      slotType: 'attack',
      actions: [
        {
          target: 'health',
          bonus: 1,
          value: 3,
          element: 'none',
          elemValue: 0,
        },
        {
          target: 'health',
          bonus: 2,
          value: 3,
          element: 'none',
          elemValue: 0,
        },
        {
          target: 'protection',
          bonus: 2,
          value: 3,
          element: 'none',
          elemValue: 0,
        },
        {
          target: 'attack',
          bonus: 2,
          value: 3,
          element: 'none',
          elemValue: 0,
        },
      ],
    };
  }
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    flex-direction: column;
  }
  .cols {
    flex-direction: row;
  }
  .center {
    justify-content: center;
  }
  .icon {
    position: relative;
    width: 50px;
    height: 50px;
    background: $color-panel;
    border: 1px solid $color-grey;
    margin-bottom: 8px;
  }
  .action {
    padding-left: 10px;
  }
  .watermark {
    width: 25px;
    padding-top: 12px;
    opacity: 0.5;
  }
</style>

<svelte:component this="{as}" type="slot" class="gear" {onClick}>
  <div class="center flex cols">
    {#if gear && !broken}
      <div class="icon">
        <BorderedContainer class="bordered-img-box">
          <GearIcon {gear} />
        </BorderedContainer>
      </div>

      <div class="center flex cols">
        <div class="action flex">
          {#each groupActions(gear) as action}
            <GearAction {action} noIcon durability={gear.durability} />
          {/each}
        </div>
      </div>
    {:else}
      <div class="icon">
        {#if watermark}
          <img class="watermark" src="{`/images/game-icons/${watermark}`}">
        {/if}
      </div>
    {/if}
  </div>
</svelte:component>
