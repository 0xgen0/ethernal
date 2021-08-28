<script>
  import {
    characterId,
    characterStatus,
    rewardsToCollect,
    currentCombat,
    defaultGearEquipped,
    characterBag,
    characterSlots,
  } from 'lib/cache';
  import { mapOverlay } from 'stores/screen';
  import { dungeon } from 'stores/dungeon';

  import ContentLayout from 'components/layouts/ContentLayout';
  import BoxButton from 'components/BoxButton';
  import Gear from 'components/bag/Gear';
  import Header from 'components/bag/Header';
  import Resources from 'components/bag/Resources';
  import Line from 'components/Line';

  let takeGear = true;

  $: status = $characterStatus;
  $: reward = $rewardsToCollect;
  $: resources = reward ?
      {
        coins: reward.balanceChange[5],
        keys: reward.balanceChange[6],
        fragments: reward.balanceChange[7]
      } : {};
  $: combat = $currentCombat;
  $: notifyAboutEquip = reward && reward.gear && $defaultGearEquipped;
  $: droppableGear = $characterBag.filter(
    ({ id }) =>
      Object.values($characterSlots)
        .map(g => g.id)
        .indexOf(id) === -1,
  );
  $: fullBag = reward && reward.gear && takeGear && $characterBag.length === 10;
  // @TODO - Later account for multiple gear
  $: rewardGearCount = reward && reward.gear && takeGear ? 1 : 0;

  const finish = async (gear = takeGear) => {
    if ($characterStatus === 'claiming rewards') {
      $dungeon.cache.action('finish', { gear });
      await new Promise(resolve => {
        const destroy = $dungeon.cache.onUpdate('characterStatus', ({ character }) => {
          if (character === $characterId) {
            resolve();
            destroy();
          }
        });
      });
    }
    mapOverlay.close();
  };

  const drop = async gear => {
    // eslint-disable-next-line no-console
    console.log('dropping', gear);
    await $dungeon.drop(gear);
  };
</script>

<ContentLayout class="overlay-screen">
  <div slot="header">
    {#if reward}
      <div class="text-center pad-top-10">
        <p>
          Well done. You defeated the <span class="highlight">{combat.monster.name}</span>.
          <br />
          You gained <span class="highlight">{reward.xpGained}XP</span>.
        </p>
      </div>
    {/if}

  </div>

  <div slot="content" class="overlay-screen--content as-space-between">
    {#if reward}
      <div>
        <Header class="as-inline" title="Loot" button="{false}" subtitle="{rewardGearCount}" />

        {#if Object.values(resources).reduce((a,b) => a + b) > 0}
          <Resources {...resources} hideEmpty>
            Collected
          </Resources>
        {/if}

        {#if reward.gear}
          <div class="pad-top-10">
            {#if takeGear}
              <Gear
                gear="{reward.gear}"
                as="loot"
                onDrop="{() => {
                  takeGear = false;
                }}"
              />
            {:else}
              <Gear
                gear="{reward.gear}"
                as="loot"
                onTake="{() => {
                  takeGear = true;
                }}"
              />
            {/if}
            {#if notifyAboutEquip}
              <p class="darker pad-top-10 text-center">
                <em>You can equip this gear in the Bag or Profile page.</em>
              </p>
            {/if}
            <div class="pad-top-10 pad-bottom-10">
              <Line light />
            </div>
          </div>
        {/if}

        <div class="pad-top-10 pad-bottom-20">
          {#if fullBag}
            <h4 class="pad-bottom-20 text-center">
              Your bag is full.
              <br />
              You have to drop some gear to proceed.
            </h4>
          {/if}

          <BoxButton type="wide full" isDisabled="{fullBag}" loadingText="Claiming..." onClick="{() => finish()}">
            Claim loot
          </BoxButton>
        </div>

        {#if reward.gear && droppableGear && droppableGear.length}
          <div class="pad-top-20 pad-bottom-20">
            <Header class="as-inline" title="In your bag" button="{false}" subtitle="{$characterBag.length}/10" />
            {#each droppableGear as gear (gear.id)}
              <Gear {gear} onDrop="{() => drop(gear)}" />
              <Line />
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <div>
        <p class="text-center">You have to kill a monster to collect loot.</p>
        <BoxButton type="wide full" loadingText="Confirming..." onClick="{() => finish(false)}">Ok</BoxButton>
      </div>
    {/if}
  </div>
</ContentLayout>
