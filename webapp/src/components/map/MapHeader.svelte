<script>
  import { menuOverlay } from 'stores/screen';
  import { BigNumber } from 'ethers';

  import { playerEnergy, characterBalances, characterStatus, needFood } from 'lib/cache';
  import config from 'data/config';
  import wallet from 'stores/wallet';

  import AlertTick from 'components/AlertTick';
  import BoxButton from 'components/BoxButton';
  import Explorer from 'components/map/Explorer';
  import VerticalBar from 'components/VerticalBar';

  import IconFood from 'assets/icons/apple_2x.png';
  import IconBag from 'assets/icons/bag_2x.png';
  import IconKey from 'assets/icons/key_2x.png';
  import IconCoin from 'assets/icons/coin_2x.png';

  $: price = config($wallet.chainId).price;
  $: energy = $playerEnergy && BigNumber.from($playerEnergy).mul(100).div(BigNumber.from(price)).toNumber();
  $: energyLevel = Math.min(100, energy);
  $: coins = $characterBalances.coins;
  $: keys = $characterBalances.keys;
  $: isDisabled = ['just died', 'dead'].includes($characterStatus);
</script>

<style lang="scss">
  @import '../../styles/variables';

  .box {
    justify-content: space-between;
    height: $header-height;
    background: $color-background;
    padding-left: 12px;
    padding-right: 12px;
    display: flex;
    flex-direction: row;
    align-items: center;

    @media screen and (min-width: $desktop-min-width) {
      padding-left: 0px;
      padding-right: 0px;
      width: $desktop-menu-width;
    }
  }
  .flex {
    display: flex;
    margin-right: 0px;

    &:nth-last-child {
      margin-right: 0;
    }
  }
  .icon.with-food {
    display: inline-block;
    width: 22px;
    vertical-align: middle;
  }
  .icon img {
    display: inline-block;
    width: 60%;
    height: auto;
    vertical-align: middle;
  }
  .bag {
    margin-right: 5px;
  }
  .energy {
    margin-top: 3px;
    font-size: 12px;
    color: $color-darker-text;
  }
  .resources {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    margin-right: 10px;
    color: $color-darker-text;
  }
  @media (max-width: 370px) {
    .resources {
      display: none;
    }
  }
  .res {
    height: 11px;
    margin-right: 5px;
  }
  .food {
    position: relative;
  }
</style>

<div class="map-header box {$$props.class || ''}">
  <Explorer />

  <div class="flex">
    <div class="bag">
      <BoxButton
        type="secondary"
        {isDisabled}
        class="{['bag', 'slots'].includes($menuOverlay.screen) ? 'highlight' : ''}"
        onClick="{() => !isDisabled && menuOverlay.toggle('bag')}"
      >
        <span class="icon">
          <img src="{IconBag}" alt="bag" />
        </span>
      </BoxButton>
    </div>
    <div class="resources">
      <span class="label">
        <img class="res" src="{IconKey}" alt="key" />
        {keys}
      </span>
      <span class="label">
        <img class="res" src="{IconCoin}" alt="coins" />
        {coins}
      </span>
    </div>
    <div class="food">
      {#if $needFood}
        <AlertTick />
      {/if}
      <BoxButton
        type="secondary"
        {isDisabled}
        class="{['food'].includes($menuOverlay.screen) ? 'highlight' : ''}"
        onClick="{() => !isDisabled && menuOverlay.toggle('food')}"
      >
        <span class="icon with-food">
          <img src="{IconFood}" alt="food" />
        </span>
        <div class="energy">{energy}%</div>
        <VerticalBar class="as-overlay" percent="{energyLevel}" />
      </BoxButton>
    </div>
  </div>
</div>
