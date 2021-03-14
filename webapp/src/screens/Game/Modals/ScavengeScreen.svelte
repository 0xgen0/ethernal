<script>
  import { scavengeLoot, currentRoom, characterBag } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';
  import { menuOverlay } from 'stores/screen';

  import Gear from 'components/bag/Gear';
  import Line from 'components/Line';
  import ModalLayout from 'components/layouts/ModalLayout';
  import ScavengeItems from 'components/bag/ScavengeItems';

  $: scavenge = $menuOverlay.coordinates ? $dungeon.cache.rooms[$menuOverlay.coordinates].scavenge : $scavengeLoot;
  $: hasBalance =
    scavenge &&
    Object.values(scavenge.balance || {})
      .flat()
      .filter(Boolean).length;
  $: hasCorpses = scavenge && scavenge.corpses.length;
  $: hasGear = scavenge && scavenge.gear.length;

  // Leave if nothing to scavenge
  $: if (!(scavenge || hasBalance || hasCorpses || hasGear)) {
    menuOverlay.close();
  }
  $: disabled = $menuOverlay.coordinates ? $currentRoom.coordinates !== $menuOverlay.coordinates : false;
  $: fullBag = (hasGear || hasCorpses) && $characterBag.length >= 10;

  const takeGearFromRoom = async gear => {
    await $dungeon.pick(gear.id);
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.scavenge-room-screen) {
    @media screen and (min-width: $desktop-min-width) {
      max-width: 450px !important;
    }
  }

  .flex.header {
    display: flex;
    flex-direction: row;
    padding: 0 24px;
    justify-content: center;

    :global(button) {
      margin-right: 12px;
    }
  }
</style>

<ModalLayout class="full-height scavenge-room-screen">
  <div slot="header">
    <div class="flex header">
      <h2>Scavenge Loot</h2>
    </div>
  </div>

  <div slot="content">
    <div>
      {#if scavenge}
        {#if fullBag}
          <h4 class="text-center pad-bottom-20">
            Your bag is full.
            <br />
            You have to drop some gear to proceed.
          </h4>
        {/if}

        {#if scavenge.corpses}
          {#each scavenge.corpses as loot}
            <div class="loot">
              <h2 class="text-center">{loot.characterName}</h2>
              <h4 class="text-center">LVL {loot.stats.level}</h4>

              <ScavengeItems items="{loot}" {disabled} {fullBag} />
            </div>
          {/each}
        {/if}

        {#if scavenge.balance}
          <ScavengeItems items="{scavenge.balance}" {disabled} {fullBag} />
        {/if}

        {#if scavenge.gear.length > 0}
          <h2 class="text-center">In the room</h2>
          {#each scavenge.gear as gear (gear.id)}
            <Gear {gear} onTake="{() => takeGearFromRoom(gear)}" disabled="{fullBag || disabled}" />
            <Line />
          {/each}
        {/if}
      {:else}
        <p class="text-center">There is no loot in this room.</p>
      {/if}
    </div>
  </div>
</ModalLayout>
