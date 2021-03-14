<script>
  import { currentFloor } from 'lib/cache';
  import { notificationOverlay } from 'stores/screen';
  import { t as formatText } from 'data/text';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';

  import IconHere from 'assets/icons/marker_2x.png';

  export let coordinates;
  export let sold;

  const floor = getCoordinatesFloor(coordinates);
  const xy = formatCoordinates(coordinates, 2);
  const isDisabled = floor !== Number($currentFloor);

  let text;
  if (sold) {
    text = formatText`Someone bought room <em>${'xy'}</em> on floor ${'floor'}.`({ xy, floor });
  } else {
    text = formatText`Room <em>${'xy'}</em> on floor ${'floor'} is for sale.`({ xy, floor });
  }

</script>

<style lang="scss">
  @import '../../styles/variables';

  :global(p .secondary.map-footer-icon) {
    display: inline-block;
    height: 26px;
    width: 26px;
    float: right;
    margin: 0 6px -2px 12px;
    vertical-align: middle;
  }

  p {
    color: rgba($color-light, 0.8);

    em {
      color: $color-light;
      font-style: normal;
    }
  }
</style>

<p>
  <BoxButton type="secondary map-footer-icon" {isDisabled} onClick="{() => global.map.refocus(coordinates)}">
    <img src="{IconHere}" alt="here" />
  </BoxButton>
  {@html text}
</p>
