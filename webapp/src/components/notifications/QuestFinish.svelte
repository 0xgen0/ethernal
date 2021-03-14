<script>
  import { onMount } from 'svelte';

  import { characterQuests, currentFloor } from 'lib/cache';
  import { notificationOverlay } from 'stores/screen';
  import quests from 'data/quests';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';

  import IconHere from 'assets/icons/marker_2x.png';

  export let questId;

  let isDisabled;
  let text = '';

  const quest = quests[questId];
  const currentQuest = $characterQuests[questId];
  if (quest && quest.notification && currentQuest) {
    const floor = getCoordinatesFloor(currentQuest.coordinates);
    const room = formatCoordinates(currentQuest.coordinates);
    isDisabled = floor !== Number($currentFloor);

    text = quest.notification.text({ room, floor });
  }

  onMount(() => {
    if (!quest || !quest.notification || !currentQuest) {
      notificationOverlay.close();
      return;
    }

    // setTimeout(() => notificationOverlay.close(), 5000);
  });
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
  }
</style>

<p>
  <BoxButton
    type="secondary map-footer-icon"
    {isDisabled}
    onClick="{() => global.map.refocus(currentQuest.coordinates)}"
  >
    <img src="{IconHere}" alt="here" />
  </BoxButton>
  {@html text}
</p>
