<script>
  import { characterSlots, characterBag } from 'lib/cache';
  import { distinctById } from 'utils/data';
  import SlotItemsList from 'components/bag/SlotItemsList';

  $: selected = $characterSlots.defenseGear;
  $: items = distinctById($characterBag.filter(g => g.slotType === 'defense' && g.id !== selected.id));
</script>

<SlotItemsList type="Defense" {items} {selected} />
