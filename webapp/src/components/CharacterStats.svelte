<script>
  export let character;

  const unique = character.gear.filter(g => g.unique).length;
</script>

<style lang="scss">
  @import '../styles/variables';

  img {
    height: auto;
    width: 10px;
    margin-right: 5px;
  }
  .darker {
    color: $color-darker-text;
    display: flex;
    flex-wrap: wrap;
    font-size: 14px;
  }
  .res {
    padding-right: 10px;
  }
</style>

<div class="darker">
  <span class="res">
    <img class="res-icon" src="/images/item-icons/bag_s_2x.png" alt="gear" />
    {character.gear.length}
  </span>
  {#if unique > 0}
    <span class="res">
      <img class="res-icon" src="/images/item-icons/diamond_s_2x.png" alt="unique" />
      {unique}
    </span>
  {/if}
  {#if character.keys !== undefined}
    <span class="res">
      <img class="res-icon" src="/images/item-icons/key_s_2x.png" alt="key" />
      {character.keys}
    </span>
  {/if}
  {#if character.coins !== undefined}
    <span class="res">
      <img class="res-icon" src="/images/item-icons/coin_s_2x.png" alt="coin" />
      {character.coins}
    </span>
  {/if}
  {#if character.fragments !== undefined}
    <span class="res">
      <img class="res-icon" src="/images/game-icons/fragment_4x.png" alt="fragment" />
      {character.fragments}
    </span>
  {/if}
</div>
