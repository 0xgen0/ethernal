<script>
  // @NOTE: THERE IS NO GUARANTEE THIS WILL WORK IN FUTURE VERSIONS.
  // https://github.com/sveltejs/svelte/issues/2106#issuecomment-501000254
  const slots = Object.keys($$props.$$slots);
</script>

<div class="content-layout {$$props.class || ''}">

  <div class="content-layout--area">
    {#if slots.includes('header')}
      <div class="content-layout--header">
        <slot name="header" />
      </div>
    {/if}

    {#if slots.includes('content')}
      <div class="content-layout--content">
        <slot name="content" />
      </div>
    {/if}

    {#if slots.includes('footer')}
      <div class="content-layout--footer">
        <slot name="footer" />
      </div>
    {/if}

    <!-- IF NO NAMED SLOTS ARE GIVEN, RENDER DEFAULT SLOT -->
    {#if slots.length === 1 && slots.includes('default')}
      <div class="content-layout--content">
        <slot />
      </div>
    {/if}
  </div>
</div>
