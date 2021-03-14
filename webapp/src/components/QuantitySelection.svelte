<script>
  import { onDestroy } from 'svelte';

  import BoxButton from 'components/BoxButton';

  export let disabled = false;
  export let label;
  export let icon;
  export let min = 0;
  export let max;
  export let minLimit;
  export let maxLimit;
  export let value;
  export let onChange;
  export let showMax = true;

  // @NOTE: THERE IS NO GUARANTEE THIS WILL WORK IN FUTURE VERSIONS.
  // https://github.com/sveltejs/svelte/issues/2106#issuecomment-501000254
  const slots = $$props.$$slots ? Object.keys($$props.$$slots) : [];

  $: mMin = minLimit != null ? minLimit : min;
  $: mMax = maxLimit != null ? maxLimit : max;

  const onClick = incr => {
    const num = Math.max(mMin, Math.min(mMax, value + incr));
    return onChange(num);
  };

  let _intv;
  const onMouseDown = incr => {
    _intv = setTimeout(() => {
      _intv = setInterval(() => {
        if ((incr > 0 && value >= mMax) || (incr < 0 && value <= mMin)) {
          clearInterval(_intv);
        }
        try {
          onClick(incr);
        } catch (err) {
          console.error('onMouseDown hold', err);
        }
      }, 1000 / Math.max(10, (mMax - mMin) / 10));
    }, 300);

    try {
      onClick(incr);
    } catch (err) {
      console.error('onMousedown end', err);
    }
  };
  const onMouseUp = () => {
    clearInterval(_intv);
  };

  onDestroy(() => {
    clearInterval(_intv);
  });
</script>

<style lang="scss">
  @import '../styles/variables';

  .qty-select {
    display: flex;
    width: 100%;
    flex-direction: row;
    justify-content: stretch;
    align-items: center;
    white-space: nowrap;

    &--info {
      flex: 1;
      width: 100%;
      padding: 0 3px;
      text-align: center;
      color: rgba($color-light, 0.8);

      em {
        color: $color-light;
        font-style: normal;
      }
    }

    .icon {
      margin-right: 2px;
      max-height: 12px;
      vertical-align: baseline;
    }

    :global(.btn) {
      min-width: auto;
    }
  }
</style>

<div class="qty-select">
  <BoxButton
    type="secondary-action"
    onClick="{() => true}"
    onMouseDown="{() => onMouseDown(-1)}"
    {onMouseUp}
    isDisabled="{disabled || mMin == value}"
  >
    -
  </BoxButton>
  <div class="qty-select--info">
    <!-- ALLOW CONTENT OR RENDER DEFAULT DISPLAY of [i] #/# -->
    {#if slots.length}
      <slot />
    {:else}
      {#if icon}
        <img class="icon" src="{icon}" alt="{label || 'icon'}" />
      {/if}
      <em>{value}</em>
      / {max}
      {#if label}
        <em>{label}</em>
      {/if}
    {/if}
  </div>
  <BoxButton
    type="secondary-action"
    onClick="{() => true}"
    onMouseDown="{() => onMouseDown(1)}"
    {onMouseUp}
    isDisabled="{disabled || mMax == value}"
  >
    +
  </BoxButton>
  {#if showMax}
    &nbsp;
    <BoxButton type="secondary-action" onClick="{() => onChange(mMax)}" isDisabled="{disabled || mMax == value}">
      Max
    </BoxButton>
  {/if}
</div>
