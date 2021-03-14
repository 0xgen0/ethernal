<script>
  import { mapOverlay } from 'stores/screen';
  import { onlineCharacters } from 'lib/cache';
  import { classPortrait } from 'utils/data';

  $: charactersOnline = Object.values($onlineCharacters);
</script>

<style lang="scss">
  @import '../styles/variables';

  button {
    display: flex;
    width: 132px;
    height: 40px;
    border: none;
    background: $color-dark;
    align-items: center;
    justify-content: space-around;
    margin: 0;
    border-radius: 0;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    pointer-events: all;
  }
  .icons {
    display: flex;
  }
  .icon {
    width: 16px;
    height: 16px;
    margin: 2px;
    background-color: $color-foreground;
  }
  img {
    height: 16px;
  }
  .text-light {
    color: $color-light;
    padding-bottom: 0px;
  }
  .online {
    text-align: left;
    float: right;

    h4 {
      padding: 0;
      line-height: 11px;
    }
  }
</style>

<button on:click="{() => mapOverlay.toggle('online')}">
  <div class="icons">
    {#each charactersOnline.slice(0, 3) as character}
      <div class="icon">
        <img src="{classPortrait(character && character.stats && character.stats.characterClass)}" alt="" />
      </div>
    {/each}
  </div>
  <div class="online">
    <h4 class="text-light">{charactersOnline.length}</h4>
    <h4>online</h4>
  </div>
</button>
