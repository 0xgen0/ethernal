<script>
  import { groupActions } from 'utils/data';
  import { capitalize } from 'utils/text';

  import GearAction from 'components/bag/GearAction';
  import GearIcon from 'components/bag/GearIcon';
  import BoxButton from 'components/BoxButton';

  export let gear;
  export let equipped;
  export let onEquip;
  export let onTake;
  export let onDrop;
  export let onAddItem;
  export let onRemoveItem;
  export let disabled = false;
  export let playerClassName = null;
  export let playerLevel = null;
  export let as;

  $: ({ durability, maxDurability = 1000 } = gear);
  $: durabilityPercentage = maxDurability > 0 && durability / maxDurability;

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

  const groupedActions = groupActions(gear);
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
  }
  .stretch {
    justify-content: space-between;
  }
  .cols {
    flex-direction: row;
    flex-wrap: wrap;

    .label {
      padding-right: 10px;

      &:last-child {
        padding-right: 0;
      }

      &--wide {
        padding: 4px 0;
        flex: 0 0 100%;

        .type {
          display: inline-block;
          white-space: nowrap;

          &:after {
            content: ' ';
            width: 4px;
            display: inherit;
          }

          img {
            height: 14px;
            vertical-align: text-bottom;
          }
        }
      }
    }
  }
  .gear {
    font-size: 10px;
  }
  .name {
    font-size: 14px;
    padding-bottom: 4px;
    text-transform: capitalize;
  }
  .stats {
    display: flex;
    flex-direction: column;
    padding-left: 9px;
    justify-content: center;
    align-items: flex-start;
  }
  .equipped {
    color: $color-darker-text;
    font-size: 11px;
    line-height: 10px;
    font-style: italic;
  }
  .attr {
    color: $color-darker-text;
  }
  .red {
    color: $color-highlight;
  }
  .action {
    font-style: italic;
    font-size: 11px;
    min-width: 55px;
    padding-top: 5px;
    text-align: center;
    color: $color-even-darker-text;
  }
  .description {
    width: 100%;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .buttons {
    margin-left: 10px;
  }
</style>

<div class="gear">
  <div class="cols flex">
    <div class="description">
      <div class="flex stretch">
        <div class="flex">
          <GearIcon {gear} />
          <div class="stats">
            <div class="equipped">{equipped ? 'Equipped' : ''}</div>
            <div class="name">{gear.name}</div>
            <div class="flex cols">
              <div class="label">
                <span class="attr">LVL:</span>
                {gear.level}
              </div>
              {#if maxDurability > 0}
                <div class="label">
                  <span class="attr">Durability:</span>
                  <span class:red="{durability <= 3}">{durability}</span>
                </div>
              {/if}
              {#if gear.set}
                <div class="label">
                  <span class="attr">Set:</span>
                  {gear.set}
                </div>
              {/if}
              {#if gear.classes && gear.classes.length > 0 && gear.classes.length < 4}
                <div class="label label--wide">
                  {#each gear.classes as klass}
                    <div class="type">
                      <img src="/images/classes/{klass}.png" class="icon" alt="{klass}" />
                      {capitalize(klass === 'adventurer' ? 'explorer' : klass)}
                    </div>
                  {/each}
                </div>
              {/if}
              {#if gear.rarity && gear.rarity !== 'common'}
                <div class="label label--wide">
                  <span class="attr">Rarity:</span>
                  {capitalize(gear.rarity)}
                </div>
              {/if}
            </div>
          </div>
        </div>
        <div class="buttons">
          {#if onEquip}
            {#if playerLevel !== null && gear.level > playerLevel}
              <BoxButton type="loot-action" isDisabled="{true}">
                LVL {gear.level}
                <br />
                required
              </BoxButton>
            {:else if playerClassName && gear.classes && gear.classes.length > 0 && !gear.classes
                .map(g => (g === 'adventurer' ? 'explorer' : g))
                .includes(playerClassName.toLowerCase())}
              <BoxButton type="loot-action" isDisabled="{true}">Restricted</BoxButton>
            {:else}
              <BoxButton
                type="loot-action"
                onClick="{onEquip}"
                isDisabled="{disabled}"
                loadingText="Equipping..."
                needsFood
                notInDuel
              >
                Equip
              </BoxButton>
            {/if}
          {/if}
          {#if onTake}
            <BoxButton type="loot-action" onClick="{onTake}" isDisabled="{disabled}" loadingText="Taking..." needsFood>
              Take
            </BoxButton>
          {/if}
          {#if onDrop && !equipped}
            <BoxButton
              type="loot-action"
              onClick="{onDrop}"
              isDisabled="{disabled}"
              loadingText="Dropping..."
              loadingForever
              needsFood
            >
              {#if as === 'loot'}Toss{:else}Drop{/if}
            </BoxButton>
          {/if}
          {#if onAddItem}
            <BoxButton type="loot-action" onClick="{onAddItem}" isDisabled="{disabled}" loadingText="..." needsFood>
              Select
            </BoxButton>
          {/if}
          {#if onRemoveItem}
            <BoxButton
              type="loot-action selected"
              onClick="{onRemoveItem}"
              isDisabled="{disabled}"
              loadingText="..."
              needsFood
            >
              Selected
            </BoxButton>
          {/if}
        </div>
      </div>
      {#if groupedActions.length > 0}
        <div class="flex">
          <div class="action">Actions:</div>
          <div class="flex wrap">
            {#each groupedActions as action}
              <GearAction {action} />
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
