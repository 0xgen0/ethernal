<script>
  import BoxButton from 'components/BoxButton';

  export let defaultSelect;
  export let isDisabled;
  export let items = [];
  export let onChange;
  export let type = 'wide';
  export let value;

  let ref;

  $: currentItem = value && items.find(item => Number(item.id) === Number(value));
</script>

<style lang="scss">
  @import '../styles/variables';

  .select-box {
    position: relative;

    select {
      cursor: pointer;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      opacity: 0;
      font-size: 1.2rem;
    }

    &--label {
      position: relative;
      &:after {
        content: '▾';
        position: absolute;
        top: 50%;
        right: 6px;
        z-index: 5;
        transform: translateY(-50%);
      }
    }
  }
</style>

<div class="select-box">
  <select bind:this="{ref}" on:change="{evt => onChange(evt)}">
    {#each items as item (item.id)}
      <option value="{item.id}" selected={item.id === currentItem.id}>{item.label}</option>
    {/each}
  </select>
  <BoxButton {type} onClick="{() => onOpen()}">
    <div class="select-box--label">
      {#if currentItem && currentItem.label}
        {currentItem.label}
      {:else if defaultSelect}{defaultSelect}{:else if items[0] && items[0].label}{items[0].label}{:else}Select item{/if}
    </div>
  </BoxButton>
</div>
