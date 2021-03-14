<script>
  import { mapOverlay } from 'stores/screen';
  import { characterInfo, characterId } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';

  import PlayersLayout from 'components/layouts/PlayersLayout';
  import Header from 'components/bag/Header';
  import LeaderboardCharacter from 'components/LeaderboardCharacter';
  import LeaderboardTier from 'components/LeaderboardTier';
  import Line from 'components/Line';

  $: me = $characterInfo;
</script>

<PlayersLayout class="{$$props.class}">
  <div slot="header">
    <Header store="{mapOverlay}" title="Hall of Fame" />
  </div>

  <div slot="content">
    {#await $dungeon.cache.fetchHallOfFame() then leaderboard}
      <div class="block">
        <h6 class="text-center italic darker">All time Top 3</h6>
        <div class="as-space-between as-row">
          <LeaderboardTier
            character="{leaderboard[1]}"
            place="{2}"
            highlight="{leaderboard[1] && leaderboard[1].character === $characterId}"
          />
          <LeaderboardTier
            character="{leaderboard[0]}"
            place="{1}"
            highlight="{leaderboard[0] && leaderboard[0].character === $characterId}"
          />
          <LeaderboardTier
            character="{leaderboard[2]}"
            place="{3}"
            highlight="{leaderboard[2] && leaderboard[2].character === $characterId}"
          />
        </div>
      </div>

      {#if me.hallOfFame > 6}
        <div class="block">
          <h6 class="text-center italic darker">Your ranking</h6>
          <LeaderboardCharacter character="{me}" rank="{me.hallOfFame}" highlight="{true}" />
        </div>
      {/if}

      {#if leaderboard.slice(3, 10).length > 0}
        <div class="block">
          <h6 class="text-center italic darker">All rankings</h6>
          {#each leaderboard.slice(3, 10) as character}
            <LeaderboardCharacter
              {character}
              rank="{character.hallOfFame}"
              highlight="{character.character === $characterId}"
            />
            <Line />
          {/each}
        </div>
      {/if}
    {/await}
  </div>
</PlayersLayout>
