<script>
  import { classPortrait } from 'utils/data';

  import CharacterStats from 'components/CharacterStats';

  export let character;
  export let rank;
  export let gained = null;
  export let highlight = false;

  const first = rank === 1;
</script>

<style lang="scss">
  @import '../styles/variables';

  img {
    width: 90%;
    height: auto;
  }
  .flex {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }
  .player {
    // spacer requires this to be + 2
    &:nth-of-type(1) .highlight-side {
      background-color: $color-gold;
    }
    &:nth-of-type(3) .highlight-side {
      background-color: $color-silver;
    }
    &:nth-of-type(5) .highlight-side {
      background-color: $color-bronze;
    }
  }
  .col {
    flex-direction: column;
    width: 100%;
  }
  .avatar {
    margin-right: 15px;
    align-items: center;
    justify-content: center;
    background: $color-black;
    min-height: 48px;
    display: flex;
    min-width: 48px;
  }
  .avatar img {
    width: 32px;
    height: 32px;
  }
  .highlight-side {
    width: 4px;
    min-height: 48px;
    background-color: red;
  }
  .darker {
    color: $color-darker-text;
  }
  .stats {
    margin-top: 10px;
  }
  .rank {
    margin-right: 5px;
    width: 29px;
  }
  .medal {
    width: 22px;
    height: 22px;
  }
  .first-medal {
    width: 20px;
    height: 20px;
  }
  .player {
    padding: 10px;
  }
  .experience {
    padding-left: 10px;
  }
  .name {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .spaced {
    justify-content: space-between;
  }
  .highlight {
    background-color: $color-foreground;
  }
</style>

<div class="player flex" class:highlight class:dead={character.stats.health === 0}>
  <div class="label rank">
    {#if rank < 4}
      <div class="label place" class:first-place="{first}">
        <a href="/character/{character.characterId}">
          <img
            class="medal"
            class:first-medal="{first}"
            src="{`/images/game-icons/medal${Math.min(rank, 3)}_4x.png`}"
            alt="medal"
          />
        </a>
      </div>
    {/if}
    #{rank}
  </div>
  {#if rank < 4}
    <div class="highlight-side"></div>
  {/if}
  <div class="avatar">
    <a href="/character/{character.characterId}">
      <img src="{classPortrait(character.stats.characterClass)}" alt="profile" />
    </a>
  </div>
  <div class="info flex col">
    <div class="flex spaced">
      <div class="name">
        <a href="/character/{character.characterId}">{character ? character.characterName : ''}</a>
      </div>
      <div class="label experience">
        {#if gained !== null}
          <span class="darker">XP GAINED:</span>
          {gained}
        {:else}
          <span class="darker">LVL:</span>
          {character.stats.level}&nbsp;
          <span class="darker">XP:</span>
          {character.stats.xp}
        {/if}
      </div>
    </div>
    <div class="stats">
      <CharacterStats {character} />
    </div>
  </div>
</div>
