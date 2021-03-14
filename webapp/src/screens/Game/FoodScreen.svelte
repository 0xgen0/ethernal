<script>
  import moment from 'moment';
  import { utils, BigNumber } from 'ethers';
  import { derived } from 'svelte/store';

  import { playerEnergy, characterStatus, needFood } from 'lib/cache';
  import config from 'data/config';
  import { dungeon } from 'stores/dungeon';
  import { time } from 'stores/time';
  import wallet from 'stores/wallet';
  import BagLayout from 'components/layouts/BagLayout';
  import Bar from 'components/Bar';
  import BoxButton from 'components/BoxButton';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';

  import IconFood from 'assets/icons/apple_2x.png';

  const minBalance = '10000000000000000';

  $: price = BigNumber.from(config($wallet.chainId).price);
  $: food = utils.formatEther($playerEnergy);
  $: level = BigNumber.from($playerEnergy).mul(100).div(BigNumber.from(price)).toNumber();
  $: dead = $characterStatus === 'dead';

  $: refillToMax = !($balance && BigNumber.from(price).add(minBalance).sub($playerEnergy).gt($balance));
  $: refillBN = refillToMax ? BigNumber.from(price).sub($playerEnergy) : $balance.sub(minBalance);
  $: refillAmount = refillBN.div('1000000000000000').toNumber() / 1000;

  const balance = derived([wallet, playerEnergy], async ([{ address }], set) => {
    wallet
      .getProvider()
      .getBalance(address)
      .then(b => set(b));
  });

  const ubf = derived([dungeon, playerEnergy], async ([$dungeon, _], set) => {
    const { amount, ubfBalance, nextSlotTime, claimed } = await $dungeon.ubfInfo();
    set({
      amount: amount.div('1000000000000000').toNumber() / 1000,
      balance: ubfBalance.div('1000000000000000').toNumber() / 1000,
      nextSlotTime: moment.unix(nextSlotTime),
      claimed,
    });
  });

  const pad = num => `0${num}`.slice(-2);

  const untilNext = derived([time, ubf], async ([$time, $ubf], set) => {
    if ($ubf) {
      const d = moment.duration($ubf.nextSlotTime.diff($time));
      if (d.asSeconds() < 1) {
        set(null);
      } else {
        set(`${pad(d.hours())}:${pad(d.minutes())}:${pad(d.seconds())}`);
      }
    }
  });

  const refill = async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('refilling', { amount: refillBN.toString(), balance: $balance.toString() });
      await $dungeon.refill(refillBN);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const claim = async () => {
    await $dungeon.claimUbf();
  };

  let copied;
  const copyAddress = () => {
    const el = document.createElement('textarea');
    el.value = $wallet.address;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .food-screen--content {
    min-width: 260px;

    &--status {
      display: flex;
      padding-top: 15px;
      padding-bottom: 15px;
      align-items: center;
      justify-content: center;

      .icon {
        display: inline-block;
        width: 15px;
        vertical-align: middle;
        padding-right: 3px;
      }
    }

    &--pay {
      width: 100%;
      padding-top: 15px;
      padding-bottom: 15px;
    }

    &--ubf {
      margin-top: 15px;
      padding: 15px;
      border: 1px solid rgba($color-grey, 0.42);

      h6 {
        font-size: 12px;
        font-style: italic;
      }

      .countdown {
        font-size: 20px;
      }

      .mono {
        font-family: 'Space Mono', 'Courier New', Courier, monospace;
      }
    }

    &--wallet {
      padding-top: 32px;
      p {
        padding-bottom: 12px;
        font-size: 12px;
      }
      p,
      span {
        color: $color-lightGrey !important;
      }
      span {
        cursor: alias;
        overflow-wrap: break-word;
        -moz-user-select: all;
        -webkit-user-select: text;
        user-select: all;
      }
    }
  }

  p {
    color: $color-lightGrey;
  }
  .highlight {
    color: $color-light;
  }
</style>

<BagLayout>
  <div slot="header">
    <Header title="Food" />
  </div>

  <div slot="content">
    <div class="food-screen--content text-center">
      <div class="food-screen--content--status">
        <img class="icon" src="{IconFood}" alt="Food" />
        <Bar percent="{level}" />
      </div>

      <div class="food-screen--content--pay">
        <h6 class="text-center italic darker">
          Fill
          {#if refillToMax}to 100%{:else}rest of balance.{/if}
        </h6>
        {#if $needFood && $ubf && (!$ubf.claimed || ($ubf.claimed && !$untilNext))}
          <BoxButton
            isDisabled="{level >= 100 || dead || refillBN.eq('0')}"
            onClick="{claim}"
            type="full"
            loadingText="Claiming free food..."
          >
            Claim free food & refill ({$ubf.amount} $MATIC)
          </BoxButton>
        {:else}
          <BoxButton
            isDisabled="{level >= 100 || dead || refillBN.eq('0')}"
            onClick="{refill}"
            type="full"
            loadingText="Refilling..."
          >
            Refill
            {#if $needFood}now{/if}
            ({refillAmount} $MATIC)
          </BoxButton>
        {/if}
      </div>

      <p>
        My $MATIC Balance:
        <span class="highlight">{($balance && $balance.div('1000000000000000').toNumber() / 1000) || '...'}</span>
      </p>

      {#if $ubf}
        <div class="food-screen--content--ubf">
          <h6>Ethernal Food Bank</h6>
          <p>
            <small>
              Total Food Bank:
              <span class="highlight">{$ubf.balance} $MATIC</span>
            </small>
          </p>
          {#if $ubf.claimed && $untilNext}
            <p class="countdown">
              Free food in
              <span class="mono highlight">{$untilNext}</span>
            </p>
          {/if}
          <p>
            Current free food:
            <span class="highlight">{$ubf.amount} $MATIC</span>
            <br />
            <small>(Claim when food bar is empty)</small>
          </p>
        </div>
      {/if}

      <div class="food-screen--content--wallet">
        <p>Wallet address:</p>
        <p>
          <small><span class="selectable">{$wallet.address}</span></small>
        </p>
        <BoxButton onClick="{copyAddress}" type="secondary-action">{copied ? 'Copied!' : 'Copy'}</BoxButton>
      </div>
    </div>
  </div>
</BagLayout>
