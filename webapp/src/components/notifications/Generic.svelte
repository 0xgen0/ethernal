<script>
  import { currentFloor } from 'lib/cache';
  import { notificationOverlay } from 'stores/screen';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';

  import IconHere from 'assets/icons/marker_2x.png';

  export let coordinates;
  export let image;
  export let text;

  let isDisabled;
  if (coordinates) {
    const floor = getCoordinatesFloor(coordinates);
    const room = formatCoordinates(coordinates, 2);
    isDisabled = floor !== Number($currentFloor);
  }
</script>

<style lang="scss">
  @import '../../styles/variables';

  :global(p.notification-text .secondary.map-footer-icon) {
    display: inline-block;
    height: 26px;
    width: 26px;
    float: right;
    margin: 0 6px -2px 12px;
    vertical-align: middle;
  }

  p.notification-text {
    color: rgba($color-light, 0.8);

    :global(em) {
      color: $color-light;
      font-style: normal;
    }
  }
</style>

<p class="notification-text">
  {#if coordinates}
    <BoxButton type="secondary map-footer-icon" {isDisabled} onClick="{() => global.map.refocus(coordinates)}">
      <img src="{IconHere}" alt="here" />
    </BoxButton>
  {/if}
  {#if image}
    <img src="{image}" class="icon" alt="image" />
  {/if}
  {@html text}
</p>
