<script>
  import { onMount } from 'svelte';
  import { DateTime } from 'luxon';

  import {
    characterId,
    characterInfo,
    characterPortrait,
    characterVault,
    currentRoom,
    foreclosedRooms,
    keeperIncome,
    keeperRooms,
  } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';
  import { pluralize } from 'utils/text';

  import BoxButton from 'components/BoxButton';
  import KeeperLayout from 'components/layouts/KeeperLayout';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';

  let error;
  let dungeonApproved = false;
  let loading;
  let tax;
  let unlocking;

  /**
   * Fetch dungeon approved (unlock) status on mount
   */
  onMount(async () => {
    dungeonApproved = await $dungeon.isDungeonApproved();
    await $dungeon.cache.fetchVault();
  });

  const calculateTimeUntil = ts => {
    const time = DateTime.fromSeconds(ts);
    const now = DateTime.local();
    const { days } = time.diff(now, 'days');
    const { hours } = time.diff(now, 'hours');
    const { minutes } = time.diff(now, 'minutes');
    const periods = days > 5 ? 0 : Math.ceil(Math.abs(days) / 5);
    const phrases = [
      days > 0 && `${Math.floor(days)} ${pluralize('day', Math.floor(days))}`,
      hours > 0 && `${Math.floor(hours % 24)} ${pluralize('hour', Math.floor(hours % 24))}`,
      minutes > 0 && `${Math.floor(minutes % 60)} ${pluralize('min', Math.floor(minutes % 60))}`,
    ].filter(Boolean);
    if (phrases.length > 0) {
      return { text: phrases.join(', '), days, hours, minutes, periods };
    }
    return { text: 'Past due', days, hours, minutes, periods };
  };

  $: taxDue = calculateTimeUntil($characterInfo.taxDueDate).days < 5;
  $: periodsToPay = calculateTimeUntil($characterInfo.taxDueDate).periods;
  $: timeUntil = calculateTimeUntil($characterInfo.taxDueDate).text;

  $: hasEnoughCoins =
    $characterVault && $characterVault.balance && tax !== null && $characterVault.balance.coins >= tax;

  $: isTaxDisabled = !tax || loading || unlocking || !hasEnoughCoins;

  $: (async () => {
    tax = await $dungeon.roomsTax(periodsToPay);
  })();

  const feeRoomKinds = ["2", "3", "4"];

  $: feeRooms = (!$keeperRooms && '--') || $keeperRooms.filter(({ kind }) => feeRoomKinds.includes(kind)).length;
  $: regularRooms = (!$keeperRooms && '--') || $keeperRooms.filter(({ kind }) => !feeRoomKinds.includes(kind)).length;
  $: myForeclosedRooms = $keeperRooms.filter(r => $foreclosedRooms.includes(r.coordinates));

  /**
   * Unlock dungeon for transfers
   */
  const unlockDungeon = async () => {
    if (!dungeonApproved) {
      unlocking = true;
      if (!dungeonApproved) {
        await $dungeon.approveDungeon();
        dungeonApproved = await $dungeon.isDungeonApproved();
      }
      unlocking = false;
    }
  };

  /**
   * Pay tax from coins in vault
   */
  const onPayTax = async () => {
    loading = true;
    error = null;
    try {
      await $dungeon.payRoomsTax(periodsToPay);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = { tax: 'Please try again.' };
    }
    loading = false;
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-evenly;
    padding: 3px 0;

    &.cols {
      margin: 0 -5px;

      & > * {
        margin: 0 5px;
      }
    }
  }

  .character-info {
    text-align: center;

    .flex.header {
      margin: 0 15px;
      align-items: center;
    }

    img {
      height: 32px;
      margin-right: 10px;
    }

    .truncate {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }

  .reward {
    width: 100%;
    margin: 16px 0;
    padding: 16px 0 8px;
    border: 1px solid $color-grey;
  }

  .reward-item {
    text-align: center;
    img {
      height: 16px;
      margin-right: 3px;
      vertical-align: text-top;
    }
  }

  .pay-btn {
    padding: 16px 0;
  }

  p {
    span {
      color: $color-xLightGrey;
    }

    em {
      color: $color-darker-text;
    }
  }

  .balance {
    padding-bottom: 16px;

    .res {
      color: $color-darker-text;

      & + .res {
        padding-left: 12px;
      }

      img {
        height: 11px;
        margin-right: 5px;
      }
    }
  }

  .error,
  .warning {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
    font-size: 11px;
  }
  .warning {
    padding-top: 6px;
    color: $color-yellow;
  }
</style>

{#if $keeperRooms.length > 0}
  <KeeperLayout>
    <div slot="header">
      <Header title="Dungeon Keeper" showMapButton />
    </div>

    <div slot="content">
      <div class="character-info">
        <p><small><span class="selectable">{$characterInfo.player}</span></small></p>
        <p>
          <span>Total rooms:</span>
          {$keeperRooms.length}
          {#if myForeclosedRooms.length > 0}
            <br />
            <span class="error">({myForeclosedRooms.length} {pluralize('foreclosed room', myForeclosedRooms.length)})</span>
          {/if}
        </p>
      </div>

      <div class="reward text-center">
        <div class="balance">
          <h4>In Vault</h4>
          <div>
            <span class="res">
              <img src="/images/game-icons/coin_4x.png" alt="coin" />
              {$characterVault.balance.coins}
            </span>
            <span class="res">
              <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
              {$characterVault.balance.fragments}
            </span>
          </div>
        </div>

        <h4>Rewards (added to vault)</h4>
        <div class="flex cols">
          <div>
            <p class="reward-item">
              <img src="/images/game-icons/coin_4x.png" alt="coin" />
              {$keeperIncome.coins}
            </p>
            <p>
              <small>
                <span>Fee Rooms:</span>
                {feeRooms}
              </small>
            </p>
          </div>
          <div>
            <p class="reward-item">
              <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
              {$keeperIncome.fragments}
            </p>
            <p>
              <small>
                <span>Regular Rooms:</span>
                {regularRooms}
              </small>
            </p>
          </div>
        </div>
      </div>

      <div class="text-center">
        <h4>Taxes</h4>
        <p>
          <small>
            <em>Tip: Abandon your room in the room screen to lessen or avoid taxes.</em>
          </small>
        </p>

        <div>
          <p>Due in {timeUntil}</p>
          {#if tax && taxDue}
            <div class="pay-btn">
              {#if dungeonApproved}
                {#if hasEnoughCoins}
                  <BoxButton type="wide full" loadingText="Paying..." isDisabled="{isTaxDisabled}" onClick="{() => onPayTax()}">
                    Pay {tax} {pluralize('coin', tax)} from vault
                  </BoxButton>
                {:else}
                  <BoxButton type="wide full" isDisabled="{true}">
                    Not enough coins in vault
                  </BoxButton>
                {/if}
              {:else}
                <BoxButton type="wide full" loadingText="Please sign transaction" onClick="{() => unlockDungeon()}">
                  Unlock vault
                </BoxButton>
              {/if}
              {#if error && error.tax}
                <p class="error">{error.tax}</p>
              {/if}
            </div>
            <p>Tax cost: 1 coin per 10 rooms every 5 days</p>
          {:else}
            <p>No taxes for you to pay at this time.</p>
          {/if}
        </div>
      </div>
    </div>
  </KeeperLayout>
{/if}
