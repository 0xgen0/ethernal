<script>
  import { mapOverlay } from 'stores/screen';
  import { characterInfo, characterId } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';

  import PlayersLayout from 'components/layouts/PlayersLayout';
  import Header from 'components/bag/Header';
  import LeaderboardCharacter from 'components/LeaderboardCharacter';
  import Line from 'components/Line';

  $: me = $characterInfo;
</script>

<PlayersLayout class="{$$props.class}">
  <div slot="header">
    <Header store="{mapOverlay}" title="Weekly Ranking" />
  </div>

  <div slot="content">
    {#await $dungeon.cache.fetchWeeklyLeaderboard() then leaderboard}
      {#if me.weeklyRank > 6}
        <h6 class="text-center italic darker">Your ranking</h6>
        <LeaderboardCharacter character="{me}" rank="{me.weeklyRank}" highlight="{true}" />
      <br/>
        <h6 class="text-center italic darker">All weekly rankings</h6>
      {/if}

      <div>
        {#each leaderboard as character}
          <LeaderboardCharacter
            {character}
            rank="{character.weeklyRank}"
            gained="{character.weeklyXp}"
            highlight="{character.character === $characterId}"
          />
          <Line />
        {/each}
      </div>
    {/await}
  </div>
</PlayersLayout>
