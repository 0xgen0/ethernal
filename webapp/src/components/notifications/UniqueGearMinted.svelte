<script>
  import { onlineCharacters } from 'lib/cache';
  import { classPortrait, gearImage } from 'utils/data';

  export let character;
  export let gear;

  // Freeze prop values upon instantiation
  const currentCharacter = character;
  const currentGear = gear;

  // Use online characters to determine character name and portrait
  const characterName = ($onlineCharacters[currentCharacter] || {}).characterName;
  const stats = ($onlineCharacters[currentCharacter] || {}).stats;
  const portrait = classPortrait(stats && stats.characterClass);

  // Clean up gear name and phrasing
  let { name: gearName } = currentGear;
  if (/^Rare Art -/.test(gearName)) {
    gearName = 'rare art';
  }
  const indefArticle = /^[aeiou]/i.test(gearName) ? 'an' : 'a';
</script>

<style lang="scss">
  @import '../../styles/variables';

  p {
    color: rgba($color-light, 0.8);

    em {
      color: $color-light;
      font-style: normal;
    }
  }
</style>

<p>
  <img src="{portrait}" class="icon" alt="profile" />
  <img class="icon" alt="{gearName}" src="{gearImage(currentGear)}" />
  <em>{characterName || 'A player'}</em>
  collected {indefArticle}
  <em>{gearName}</em>
</p>
