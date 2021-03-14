<script>
  import elements from 'data/elements';

  import BoxButton from 'components/BoxButton';

  export let type;
  export let value;
  export let onTake;
  export let disabled;

  const color = value !== 0 ? elements[type].color : null;
  const { icon } = elements[type];
</script>

<style lang="scss">
  @import '../../styles/variables';

  .center {
    display: flex;
    justify-content: center;
    flex-direction: column;
  }
  .element {
    width: 46px;
    height: 46px;
    line-height: 1em;
    background-color: $color-background;
  }
  .value {
    margin-top: -5px;
    padding-right: 4px;
    color: $color-grey;
  }
  img {
    padding-top: 10px;
    height: 18px;
  }
  .taking {
    padding-top: 5px;
  }
</style>

<div class="center">
  <div class="element text-center">
    <img src="{icon}" alt="{type}" />
    <div class="value text-right" style="{color ? `color:${color}` : ''}">{value}</div>
  </div>
  {#if onTake}
    <div class="taking">
      <BoxButton type="secondary" onClick="{onTake}" isDisabled="{disabled || value < 1}" loadingText="..." needsFood>
        Take
      </BoxButton>
    </div>
  {/if}
</div>
