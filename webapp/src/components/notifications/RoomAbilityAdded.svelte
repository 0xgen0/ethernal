<script>
  import { currentFloor, onlineCharacters } from 'lib/cache';
  import { notificationOverlay } from 'stores/screen';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';

  import IconHere from 'assets/icons/marker_2x.png';

  export let ability;
  export let character;
  export let coordinates;

  const characterName = ($onlineCharacters[character] || {}).characterName;

  let type = 'something'; // ...?
  if (ability.monster) {
    type = 'monster';
  } else if (ability.chest) {
    type = 'chest';
  }
  const aOrAnType = /^[aeiou]/i.test(type) ? 'an' : 'a';

  const floor = getCoordinatesFloor(coordinates);
  const xy = formatCoordinates(coordinates, 2);
  const isDisabled = floor !== Number($currentFloor);
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
  <em>{characterName || 'A player'}</em>
  added {aOrAnType}
  <em>{type}</em>
  to
  <em>{xy}</em>
  on floor
  <em>{floor}.</em>
</p>
