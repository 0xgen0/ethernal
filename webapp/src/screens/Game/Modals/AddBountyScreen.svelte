<script>
  import { dungeon } from 'stores/dungeon';
  import { characterCoordinates, characterBalances } from 'lib/cache';

  import BoxButton from 'components/BoxButton';
  import Consumables from 'components/bag/Consumables';
  import Bounty from 'components/bag/Bounty';
  import ModalLayout from 'components/layouts/ModalLayout';
  import { gameOverlay } from 'stores/screen';

  export let coordinates = $characterCoordinates;

  $: bounty = $dungeon.cache.rooms[coordinates].bounty;
  $: selectedItems = {}
  $: isDisabled = Object.values(selectedItems).reduce((a,b) => a + b, 0) === 0;

  async function addBounty() {
    await $dungeon.addBounty(coordinates, selectedItems);
    gameOverlay.close();
  }
</script>

<ModalLayout class="menu-height add-bounty" store="{gameOverlay}">
  <div slot="header">
    Add bounty to monster
  </div>
  <div slot="content">
    <Bounty {bounty} />
    <Consumables
        bind:selectedItems="{selectedItems}"
        expanded="{true}"
        balances="{$characterBalances}"
    />
  </div>
  <div slot="footer">
    <BoxButton type="full" onClick="{addBounty}" loadingText="Adding..." {isDisabled}>
      Add bounty
    </BoxButton>
  </div>
</ModalLayout>
