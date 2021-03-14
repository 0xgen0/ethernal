<script>
  import { menuOverlay } from 'stores/screen';
  import { characterSlots, characterBag, characterQuests } from 'lib/cache';
  import { distinctById } from 'utils/data';

  import Line from 'components/Line';
  import Slot from 'components/bag/Slot';

  $: ({ attackGear, defenseGear } = $characterSlots);
  $: minimap = $characterQuests[1] && $characterQuests[1].status === 'completed' && $characterQuests[1].reward.gear;
  $: accessories = [...distinctById($characterBag.filter(g => g.slotType === 'accessory')), minimap, null, null];
</script>

<style lang="scss">
  @import '../../styles/variables';

  .gear {
    display: flex;
    flex-direction: row;
    justify-content: space-around;

    .slot {
      width: 50%;
    }
  }
</style>

<div>
  <!-- <p>Tap on a slot to equip an item</p> -->
  <h6 class="text-center italic darker">Weapon & Defense</h6>

  <div class="block">
    <div class="gear">
      <div class="slot">
        <Slot gear="{$characterSlots.attackGear}" onClick="{() => menuOverlay.open('weaponSlot')}" watermark="hand-l.png" />
      </div>
      <Line vertical />
      <div class="slot">
        <Slot gear="{$characterSlots.defenseGear}" onClick="{() => menuOverlay.open('defenseSlot')}" watermark="hand-r.png" />
      </div>
    </div>
  </div>

  <div class="block">
    <h6 class="text-center italic darker">Accessories</h6>
    <div class="gear">
      <Slot gear="{accessories[0]}" />
      <Slot gear="{accessories[1]}" />
      <Slot gear="{accessories[2]}" />
    </div>
  </div>
</div>
