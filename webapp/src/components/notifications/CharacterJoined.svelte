<script>
  import { classPortrait } from 'utils/data';

  export let character;

  const { characterName } = character;
  const portrait = classPortrait(character.stats && character.stats.characterClass);
</script>

<p>
  <img src="{portrait}" class="icon" alt="profile" />
  {characterName} has joined.
</p>
