<script>
  import { fade } from 'svelte/transition';

  import { mapModal } from 'stores/screen';

  import BoxButton from 'components/BoxButton';

  import IconClose from 'assets/close.png';

  export let store = mapModal;
  export let closeable = true;
  // export let expandable = false;
  // export let expanded;

  // @NOTE: THERE IS NO GUARANTEE THIS WILL WORK IN FUTURE VERSIONS.
  // https://github.com/sveltejs/svelte/issues/2106#issuecomment-501000254
  const slots = Object.keys($$props.$$slots);
</script>

<div class="modal-layout {$$props.class || ''}" transition:fade="{{ duration: 200 }}">

  <!-- CLOSE AND (@TODO) EXPAND BUTTONS -->
  <div class="modal-layout--buttons">
    <!-- @TODO - ALLOW MODAL HEIGHT TO EXPAND FULL -->
    <!--
      {#if expandable}
        <BoxButton type="plain">...</BoxButton>
      {/if}
    -->
    {#if closeable}
      <BoxButton type="plain" class="close" onClick="{() => store.close()}">
        <img src="{IconClose}" alt="Close" />
      </BoxButton>
    {/if}
  </div>

  <div class="modal-layout--area">
    {#if slots.includes('header')}
      <div class="modal-layout--header">
        <slot name="header" />
      </div>
    {/if}

    {#if slots.includes('content')}
      <div class="modal-layout--content">
        <slot name="content" />
      </div>
    {/if}

    {#if slots.includes('footer')}
      <div class="modal-layout--footer">
        <slot name="footer" />
      </div>
    {/if}

    <!-- IF NO NAMED SLOTS ARE GIVEN, RENDER DEFAULT SLOT -->
    {#if slots.length === 1 && slots.includes('default')}
      <div class="modal-layout--content">
        <slot />
      </div>
    {/if}
  </div>
</div>
