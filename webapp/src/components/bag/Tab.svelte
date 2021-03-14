<script>
  import BoxButton from 'components/BoxButton';

  // @NOTE: THERE IS NO GUARANTEE THIS WILL WORK IN FUTURE VERSIONS.
  // https://github.com/sveltejs/svelte/issues/2106#issuecomment-501000254
  const slots = Object.keys($$props.$$slots);

  export let tab;
  export let disabled = false;
  export let store;

  export let selected = store && $store.screen === tab;
</script>

<style>
  h5 {
    padding: 0 5px;
  }
</style>

<BoxButton type="tab" class="{selected ? 'selected' : ''}" isDisabled="{disabled}" onClick="{() => !disabled && store.open(tab)}">
  {#if slots.includes('icon')}
    <span class="icon">
      <slot name="icon" />
    </span>
  {/if}
  <h5>
    <slot />
  </h5>
</BoxButton>
