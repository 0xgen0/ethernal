<script>
  import {
    characterStatus,
    characterName,
    characterLevel,
    characterNextLevel,
    characterXP,
    characterBalances,
  } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';

  import CharacterLayout from 'components/layouts/CharacterLayout';
  import BoxButton from 'components/BoxButton';
  import Explorer from 'components/map/Explorer';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';
  import Slots from 'components/bag/Slots';

  $: dead = $characterStatus === 'dead';
  $: disabled = $characterNextLevel.coinsRequired > $characterBalances.coins;

  let levelingUp = false;
  const levelUp = async () => {
    levelingUp = true;
    await $dungeon.levelUp($characterLevel + 1);
    levelingUp = false;
  };
</script>

<CharacterLayout>
  <div slot="header">
    <Header title="Character" />
  </div>

  <div slot="content">
    <div>
      <Explorer class="as-bag-layout" mode="stats" />

      <div class="block">
        {#if levelingUp}
          <BoxButton type="full wide" isDisabled="{true}">Leveling up...</BoxButton>
        {:else if dead}
          <BoxButton type="full wide" isDisabled="{true}">You’re dead :(</BoxButton>
        {:else if $characterLevel >= 9}
          <BoxButton type="full wide" isDisabled="{true}">Go to the next level</BoxButton>
        {:else if $characterXP >= $characterNextLevel.xpRequired}
          <BoxButton type="full wide" onClick="{levelUp}" isDisabled="{disabled}" needsFood notInDuel>
            Level up for {$characterNextLevel.coinsRequired} coins
          </BoxButton>
        {:else}
          <BoxButton type="full wide" isDisabled="{true}">
            {$characterNextLevel.xpRequired - $characterXP} XP to level up
          </BoxButton>
        {/if}
      </div>
    </div>

    <Line />

    <div class="block">
      <Slots />
    </div>
  </div>
</CharacterLayout>
