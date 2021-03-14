<script>
  import { menuOverlay } from 'stores/screen';
  import { characterId, characterInfo, onlineCharacters, questUpdate } from 'lib/cache';
  import { classes } from 'data/text';
  import { classPortrait } from 'utils/data';

  import AlertTick from 'components/AlertTick';
  import BoxButton from 'components/BoxButton';
  import HPBar from 'components/HPBar';

  export let mode = null;
  export let characterName = null;
  export let character;

  $: boxClassName = mode === 'stats' || mode === 'profile' ? 'box--stats' : '';
  $: classNames = [boxClassName, $$props.class, mode && `mode-${mode}`].filter(Boolean).join(' ');

  $: info = character || $characterInfo;
  $: isMe = info.character == $characterId;

  $: canLevelUp = info.nextLevel && info.stats && info.stats.xp >= info.nextLevel.xpRequired && info.stats.level < 9;
  $: isDead = ['just died', 'dead'].includes(info.status.status);
  $: isDisabled = isMe && isDead;
  $: isOnline = !!$onlineCharacters[info.character] && !isDead;
  $: isBagLayout = $$props.class === 'as-bag-layout';
</script>

<style lang="scss">
  @import '../../styles/variables';

  .box {
    display: flex;
    flex-grow: 1;
    font-size: 10px;
    margin-right: 10px;

    &.as-bag-layout {
      margin: 0 auto 15px auto;
      width: 100%;
      max-width: 270px;
    }
  }
  img {
    display: inline-block;
    width: 100%;
    height: auto;
  }
  .box--stats .info-wrap {
    margin-left: 12px;
  }
  .stats-wrap {
    display: flex;
  }
  .status-wrap {
    padding-top: 8px;
    margin-left: 6px;

    p {
      font-size: 13px;
      color: $color-grey;
    }
  }
  .info-wrap {
    flex-grow: 1;
  }
  .info-area {
    margin-top: 2px;
    margin-left: 6px;
    width: 100%;
    max-width: 86px;
    display: flex;
    flex-direction: column;
  }
  .box--stats .info-area + .info-area {
    margin-left: 12px;
  }
  .box--stats .info-area > *:first-child {
    margin-bottom: 3px;
  }
  .level {
    // border: 1px solid rgba($color-light, 0.2);
    // padding-left: 4px;
    padding-right: 4px;
  }
  .box--stats .level {
    border: unset;
    padding-left: 0;
    padding-right: 0;
  }
  .avatar {
    position: relative;
  }
  .red {
    color: $color-light;
    font-weight: bold;
  }
  .resources {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding-right: 4px;
    padding-top: 5px;
    padding-bottom: 2px;
    font-size: 9px;
  }
  .res {
    width: unset;
    height: 11px;
    margin-right: 5px;
  }
  .character-name {
    display: flex;
    flex-wrap: wrap;
    justify-content: stretch;
    margin-left: 6px;
    padding-bottom: 5px;

    h2 {
      flex: 1;
      width: 100%;
      margin: 0;
      padding: 0;
      word-break: break-word;
    }
    span {
      .mode-profile & {
        order: 2;
      }

      flex: 0;
      width: auto;
      padding-left: 5px;
      font-size: 12px;
    }
    p {
      .mode-profile & {
        flex: 1;
      }
      width: 100%;
      padding: 3px 0 0 0;
      font-size: 12px;
      text-transform: uppercase;
    }
  }
  .online {
    font-size: 10px;
    text-transform: uppercase;
    color: $color-green;
  }
</style>

<div class="box {classNames}">
  <div>
    <div class="avatar">
      {#if (canLevelUp || $questUpdate) && !isBagLayout && !isDisabled}
        <AlertTick />
      {/if}
      <BoxButton
        type="secondary"
        class="{!isBagLayout && ['character'].includes($menuOverlay.screen) ? 'highlight' : ''}"
        onClick="{() => !isBagLayout && !isDisabled && menuOverlay.toggle($questUpdate ? 'quests' : 'character')}"
      >
        <img src="{classPortrait(info.stats.characterClass)}" alt="profile" />
      </BoxButton>
      {#if mode === 'profile' && isOnline}
        <br />
        <span class="online">Online</span>
      {/if}
    </div>

    {#if mode === 'stats'}
      <div class="resources">
        <span class="label">
          <img class="res" src="/images/game-icons/coin_2x.png" alt="coin" />
          {info.coins || 0}
        </span>
      </div>
    {/if}
  </div>

  <div class="info-wrap">
    {#if mode === 'stats' || mode === 'profile'}
      <div class="character-name">
        {#if mode === 'stats'}
          <h2>{info.characterName}</h2>
        {/if}
        <span>#{info.character}</span>
        <p>{classes[info.stats.characterClass][0]}</p>
      </div>
    {/if}

    <div class="stats-wrap">
      {#if mode !== 'compact'}
        <div class="info-area">
          <div
            class="level label"
            on:click="{() => !isBagLayout && !isDisabled && canLevelUp && menuOverlay.toggle('character')}"
          >
            LVL. {info.stats.level}
            {#if canLevelUp}
              <span class="red">+</span>
            {/if}
          </div>
          <HPBar
            label="XP"
            value="{info.stats.xp - info.stats.levelXp}"
            maxValue="{(info.nextLevel && info.nextLevel.xpRequired && info.nextLevel.xpRequired - info.stats.levelXp) || info.stats.levelXp}"
            infinite="{info.stats.level > 8}"
          />
        </div>
      {/if}

      <div class="info-area">
        {#if mode === 'compact'}
          <div class="level">
            <p>LVL {info.level}</p>
          </div>
        {:else}
          <div class="level label">GEN. {(info.lineage && info.lineage.length) || 0}</div>
        {/if}
        <HPBar value="{info.stats.health}" maxValue="{info.stats.fullHealth}" />
      </div>
    </div>

    {#if mode === 'profile' && !isDead}
      <div class="status-wrap">
        <p>Status: {info.status.status}</p>
      </div>
    {/if}
  </div>
</div>
