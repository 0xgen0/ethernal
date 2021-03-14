<script>
  import { menuOverlay } from 'stores/screen';
  import { characterStatus } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';

  import ContentLayout from 'components/layouts/ContentLayout';
  import BoxButton from 'components/BoxButton';

  $: status = $characterStatus;
  $: if (status !== 'just died') {
    // eslint-disable-next-line no-console
    console.log('not your time yet ...');
    menuOverlay.close();
  }

  const ok = async () => {
    if (status === 'just died') {
      $dungeon.cache.action('finish', { gear: false });
      await $dungeon.cache.once('acknowledged-death', e => e.character === $dungeon.cache.character);
    }
    menuOverlay.close();
  };
</script>

<ContentLayout class="with-dark-bg">
  <div slot="content" class="text-center as-space-around">
    <div>
      <h1>You have died</h1>
      <p>
        Items in your bag are dropped in the room for others to scavenge. Create a new character and come back to claim
        your items.
      </p>
    </div>
    <BoxButton onClick="{ok}" type="wide full">OK</BoxButton>
  </div>
</ContentLayout>
