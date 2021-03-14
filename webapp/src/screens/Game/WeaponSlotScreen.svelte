<script>
  import { characterSlots, characterBag } from 'lib/cache';
  import { distinctById } from 'utils/data';
  import SlotItemsList from 'components/bag/SlotItemsList';

  $: selected = $characterSlots.attackGear;
  $: items = distinctById($characterBag.filter(g => g.slotType === 'attack' && g.id !== selected.id));
</script>

<SlotItemsList type="Weapon" {items} {selected} />
