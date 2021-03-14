<script>
  import { classPortrait } from 'utils/data';

  import CharacterStats from 'components/CharacterStats';

  export let character;
  export let place;
  export let highlight;

  const first = place === 1;
</script>

<style lang="scss">
  @import '../styles/variables';

  .step {
    height: 140px;
    position: relative;
    width: 105px;
    border: 1px solid rgba($color-grey, 0.2);
  }
  .first {
    height: 150px;
  }
  .avatar {
    margin-right: 5px;
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
  .first-avatar {
    width: 48px;
    height: 48px;
  }
  .first-avatar img {
    width: 40px;
    height: 40px;
  }
  .step {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    height: 165px;
    position: relative;
    width: 105px;
    border: 1px solid rgba($color-grey, 0.2);
    margin: 0 6px;
  }
  .place {
    position: absolute;
    top: 5px;
    right: 5px;
    line-height: 9px;
    // font-size: 10px;
  }
  div.first {
    height: 175px;
  }
  .medal {
    width: 22px;
    height: 22px;
  }
  .first-medal {
    width: 20px;
    height: 20px;
  }
  .first-place {
    font-size: 12px;
    line-height: 11px;
  }
  .darker {
    color: $color-darker-text;
  }
  .stats {
    padding-left: 10px;
    padding-bottom: 0px;
  }
  .highlight {
    background-color: $color-foreground;
  }
  .xp {
    padding-top: 0px;
    padding-bottom: 2px;
  }
  .name {
    padding-top: 5px;
  }
</style>

<div class="step" class:first class:highlight>
  {#if character}
    <div class="label place" class:first-place="{first}">
      <a href="/character/{character.characterId}">
        <img
          class="medal"
          class:first-medal="{first}"
          src="{`/images/game-icons/medal${Math.min(place, 3)}_4x.png`}"
          alt="medal"
        />
      </a>
      <br />
      <!-- #{place} -->
    </div>
    <div class="avatar" class:first-avatar="{first}">
      <a href="/character/{character.characterId}">
        <img src="{classPortrait(character.stats.characterClass)}" alt="profile" />
      </a>
    </div>
    <div class="name">
      <a href="/character/{character.characterId}">{character.characterName}</a>
    </div>
    <div class="label xp">
      <span class="darker">LVL:</span>
      {character.stats.level}
      <br />
      <span class="darker">XP:</span>
      {character.stats.xp}
    </div>
    <div class="stats">
      <CharacterStats {character} />
    </div>
  {/if}
</div>
