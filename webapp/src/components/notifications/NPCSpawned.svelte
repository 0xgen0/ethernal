<script>
  import { onlineCharacters, currentFloor } from 'lib/cache';
  import { monsterImage } from 'utils/data';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';

  import IconHere from 'assets/icons/marker_2x.png';

  export let npc;
  export let coordinates;

  const names = { recycler: 'alchemist' };

  // Freeze prop values upon instantiation
  const currentNpcName = names[npc.type];
  const currentCoords = coordinates;

  const floor = getCoordinatesFloor(currentCoords);
  const room = formatCoordinates(currentCoords, 2);
  const isDisabled = floor !== Number($currentFloor);

  const indefArticle = /^[aeiou]/i.test(currentNpcName) ? 'An' : 'A';
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
  :global(p .secondary.map-footer-icon img) {
    height: 60%;
    width: auto;
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
  <BoxButton type="secondary map-footer-icon" {isDisabled} onClick="{() => global.map.refocus(currentCoords)}">
    <img src="{IconHere}" alt="here" />
  </BoxButton>
  {indefArticle}
  <em>{currentNpcName}</em>
  has appeared on floor
  <em style="white-space: nowrap;">{floor}</em>
  in room
  <em style="white-space: nowrap;">{room}.</em>
</p>
