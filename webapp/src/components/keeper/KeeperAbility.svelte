<script>
  import { roomsText } from 'data/text';
  import { capitalize } from 'utils/text';
  import { monsterImage, gearImage } from 'utils/data';

  import BoxButton from 'components/BoxButton';

  export let ability;
  export let isDisabled;
  export let onChooseAbility;

  $: abilityName =
    ability.name || (ability.monster && (ability.monster.name || `${capitalize(ability.monster.type)} monster`));
  $: abilityImage =
    ability.monster && ability.monster.image
      ? monsterImage(ability.monster.image)
      : gearImage(ability.image ? { image: ability.image } : {});
  $: level = ability.monster && ability.monster.stats && ability.monster.stats.level;
  $: roomTypes =
    ability.requirements &&
    ability.requirements.kind &&
    ability.requirements.kind.map(k => roomsText.kinds[k] || 'Regular');

  const onClick = () => onChooseAbility(ability);
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: flex-start;

    &.row {
      flex-direction: column;
      width: 100%;
      flex-grow: 1;
    }
  }

  .keeper-ability {
    padding: 4px 0;

    .avatar {
      margin-right: 10px;
      align-items: center;
      justify-content: center;
      background: $color-black;
      display: flex;
      min-height: 48px;
      min-width: 48px;

      img {
        width: 32px;
        height: 32px;
      }
    }

    &.locked {
      .avatar {
        background-color: $color-grey;
        opacity: 0.64;

        span {
          font-size: 10px;
        }
      }

      .flex.row {
        justify-content: center;
      }
    }

    p {
      font-size: 12px;
      padding-bottom: 0;
      color: $color-darker-text;
    }

    div.res {
      padding-top: 4px;
    }
    .res {
      color: $color-light;
      padding-right: 4px;

      img {
        height: 11px;
        // margin-right: 5px;
      }
    }

    .highlight {
      color: $color-light;
    }
  }
</style>

<div class="keeper-ability" class:locked="{ability.locked}">
  <div class="flex">
    {#if ability.locked}
      <div class="avatar">
        <span class="unlock">Locked</span>
      </div>
      <div class="info flex row">
        <p>
          <span class="res">
            <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
            {ability.requirements.income}
          </span>
          to unlock next item
        </p>
      </div>
    {:else}
      <div class="avatar">
        <img src="{abilityImage}" alt="keeper" />
      </div>
      <div class="info flex row">
        <h5>{abilityName}</h5>
        {#if level !== undefined}
          <p>
            LVL:
            <span class="highlight">{level}</span>
          </p>
        {/if}
        <p>
          <span>ROOM:</span>
          <span class="highlight">
            {#if roomTypes && roomTypes.length > 0}{roomTypes.join(', ')}{:else}Any{/if}
          </span>
        </p>
      </div>

      <div class="status">
        <BoxButton type="secondary-small quick-action" {isDisabled} {onClick}>Add</BoxButton>
        <div class="res">
          {#if ability.price.coins}
            <img src="/images/game-icons/coin_4x.png" alt="coin" />
            {ability.price.coins}
          {/if}
          {#if ability.price.fragments}
            <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
            {ability.price.fragments}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
