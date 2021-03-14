<script>
  import { mapOverlay } from 'stores/screen';
  import { onlineCharacters, currentFloor } from 'lib/cache';

  import PlayersLayout from 'components/layouts/PlayersLayout';
  import Header from 'components/bag/Header';
  import OnlinePlayer from 'components/OnlinePlayer';
  import Line from 'components/Line';
  import { getCoordinatesFloor } from 'utils/utils';

  $: characters = Object.values($onlineCharacters);
  $: currentFloorCharacters = characters.filter(
    character => character.coordinates && getCoordinatesFloor(character.coordinates) === $currentFloor,
  );
  $: otherFloorCharacters = characters.filter(
    character => character.coordinates && getCoordinatesFloor(character.coordinates) !== $currentFloor,
  );
</script>

<PlayersLayout class="{$$props.class}">
  <div slot="header">
    <!-- <Header store="{mapOverlay}" title="Online Players" subtitle="{characters.length}" /> -->
    <Header store="{mapOverlay}" title="Online Players" />
  </div>

  <div slot="content">
    {#if currentFloorCharacters.length > 0}
      <h4 class="text-center">On Your Floor</h4>
      {#each currentFloorCharacters as character (character.character)}
        <OnlinePlayer player="{character}" />
        <Line />
      {/each}
    {/if}

    {#if otherFloorCharacters.length > 0}
      <h4 class="text-center">Other Floors</h4>
      {#each otherFloorCharacters as character (character.character)}
        <OnlinePlayer player="{character}" />
        <Line />
      {/each}
    {/if}
  </div>
</PlayersLayout>
