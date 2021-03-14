<script>
  import { dungeon } from 'stores/dungeon';
  import { mapModal } from 'stores/screen';
  import { characterBalances, characterHP, characterMaxHP, characterPortrait } from 'lib/cache';

  import BoxButton from 'components/BoxButton';
  import HPBarToggle from 'components/HPBarToggle';
  import ModalLayout from 'components/layouts/ModalLayout';

  // !!! NEEDS TO BE CONSISTENT WITH CONTRACT !!!
  const COINS_PER_HP = 1;

  let hp;
  let cost;
  let error;
  let loading = true;

  const calcRemainingHP = val => Math.max(0, Math.min(val, Math.floor($characterBalances.coins / COINS_PER_HP)));

  $: limitValue = hp = calcRemainingHP($characterMaxHP - $characterHP);

  // Determine how much player can afford before calling healCost
  $: Promise.resolve()
    .then(() => {
      loading = true;
      error = null;
    })
    .then(() => $dungeon.cache.healCost(hp))
    .then(val => {
      cost = val && !val.error ? val : null;
    })
    .catch(() => {
      cost = null;
    })
    .finally(() => {
      loading = false;
    });
  $: isDisabled =
    loading ||
    !cost ||
    !hp ||
    hp <= 0 ||
    $characterHP === $characterMaxHP ||
    Math.max(COINS_PER_HP, cost) > $characterBalances.coins;

  const onClick = async () => {
    error = null;
    try {
      await $dungeon.heal(hp);
      mapModal.close();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
      if (err.reason === 'does not own enough') {
        error = 'Not enough coins. Try again later.';
      }
    }
  };

  const onQuantityChange = val => {
    hp = calcRemainingHP(val - $characterHP);
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.heal-screen) {
    @media screen and (min-width: $desktop-min-width) {
      max-width: 350px !important;
    }
  }

  .flex {
    display: flex;
    flex-direction: row;
    justify-content: stretch;

    &.header {
      padding-right: 24px;

      :global(button) {
        margin-right: 12px;
      }
    }

    &.bar {
      padding: 12px 12px;
      align-items: center;
    }

    img {
      height: 40px;
      width: auto;
    }

    p {
      flex: 1;
      width: 100%;

      @media screen and (max-width: $mobile-max-width) {
        font-size: 13px;
      }
    }
  }

  .button {
    padding: 8px 12px 0;
  }

  .error {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
    text-align: center;
  }
</style>

<ModalLayout class="heal-screen">
  <div class="flex header">
    <BoxButton type="secondary">
      <img src="{$characterPortrait}" alt="profile" />
    </BoxButton>
    <p>You are in the temple. Each HP costs {COINS_PER_HP} coins to heal.</p>
  </div>

  <div class="flex bar">
    <HPBarToggle
      minValue="{$characterHP}"
      maxValue="{$characterMaxHP}"
      limitValue="{$characterHP + limitValue}"
      value="{$characterHP + hp}"
      {onQuantityChange}
    />
  </div>

  <div class="button">
    <BoxButton type="wide full" {isDisabled} {onClick} loadingText="Healing...">
      {#if loading}
        ...
      {:else if $characterHP === $characterMaxHP}
        You have full health
      {:else if Math.max(COINS_PER_HP, cost) > $characterBalances.coins}
        Not enough coins to heal
      {:else if hp <= 0}You must add HP to heal!{:else}Heal {hp} HP for {cost || '--'} coins{/if}
    </BoxButton>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>
</ModalLayout>
