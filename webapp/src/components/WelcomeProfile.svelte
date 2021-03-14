<script>
  import claim from 'stores/claim';
  import characterChoice from 'stores/characterChoice';
  import { classPortrait } from 'utils/data';

  import BoxButton from 'components/BoxButton';
  import HPBar from 'components/HPBar';

  import IconSkull from 'assets/skull-key-white.png';

  export let mode = null;
</script>

<style lang="scss">
  @import '../styles/variables';

  .box {
    display: flex;
    font-size: 10px;
    width: calc(100% - 80px);
  }
  img {
    display: inline-block;
    width: 100%;
    height: auto;
  }
  .info-area {
    margin-left: 6px;
    min-width: 52px;
    max-width: 82px;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .level {
    // padding-left: 4px;
    padding-right: 4px;
  }
  .slot {
    padding-top: 11px;
    padding-bottom: 11px;
    white-space: nowrap;
  }
  .res {
    color: $color-darker-text;
  }
  .small {
    height: 11px;
    width: auto;
    margin-right: 5px;
  }
  .welcome-header-box {
    display: flex;
    justify-content: space-between;
  }
  .highlight {
    color: $color-light;
  }
</style>

<div class="welcome-header-box">
  <div class="box">
    <BoxButton type="secondary">
      <img src="{classPortrait($characterChoice.characterClass)}" alt="profile" />
    </BoxButton>

    {#if mode !== 'compact'}
      <div class="info-area">
        <div class="level label">LVL. 0</div>
        <HPBar label="XP" value="0" maxValue="15" />
      </div>
    {/if}

    <div class="info-area">
      {#if mode === 'compact'}
        <div class="level label">LVL 0</div>
      {:else}
        <div class="level label">GEN. 0</div>
      {/if}
      <HPBar value="50" maxValue="50" />
    </div>
  </div>
  <div class="text-right">
    <span class="res slot">
      <img class="small" src="{IconSkull}" alt="key" />
      1
    </span>
    <br />
    <span class="res slot">
      $MATIC
      <span class="highlight">{$claim.balance || '0'}</span>
    </span>
  </div>
</div>
