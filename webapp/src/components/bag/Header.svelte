<script>
  import { isMobile, menuOverlay } from 'stores/screen';
  import BoxButton from 'components/BoxButton';

  import IconMap from 'assets/icons/map_2x.png';
  import IconClose from 'assets/close.png';

  export let title;
  export let subtitle = '';
  export let button = true;
  export let closeable = false;
  export let onClose;
  export let showMapButton;
  export let store;

  const onClick = () => {
    if (onClose) {
      onClose();
    } else {
      (store || menuOverlay).back();
    }
  };
</script>

<style lang="scss">
  @import '../../styles/variables.scss';

  .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    min-height: 28px;

    &.as-inline {
      position: relative;
      background: unset;
    }
  }

  .subtitle {
    width: 50px;
    font-size: 14px;
    white-space: nowrap;

    &--text--right {
      padding: 0 20px 10px 0;
    }
  }
  img {
    display: inline-block;
    width: 50%;
    height: auto;
    vertical-align: middle;

    &.map-icon {
      width: 65%;
    }
  }
</style>

<div class="header {$$props.class || ''}">
  <div class="subtitle">
    {#if ($isMobile && button) || showMapButton}
      <BoxButton type="primary subtle" onClick="{() => (store || menuOverlay).close()}">
        <img src="{IconMap}" alt="map" class="map-icon" />
      </BoxButton>
    {/if}
  </div>

  <div class="title">
    <h2>{title}</h2>
  </div>

  <div class="subtitle" style="text-align: end">
    {#if closeable}
      <BoxButton type="primary subtle" {onClick}>
        <img src="{IconClose}" alt="close" />
      </BoxButton>
    {:else}
      <div class="subtitle--text--right">{subtitle}</div>
    {/if}
  </div>
</div>
