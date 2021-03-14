<script>
  import claim from 'stores/claim';
  import { dungeon, reading } from 'stores/dungeon';
  import preDungeonCheck from 'stores/preDungeonCheck';
  import wallet from 'stores/wallet';

  import DefaultScreen from 'screens/DefaultScreen';
  import DungeonScreen from 'screens/Intro/DungeonScreen';
  import LayoutScreen from 'screens/Game/LayoutScreen';
  import WelcomeBackScreen from 'screens/Intro/WelcomeBackScreen';
</script>

{#if !$dungeon}
  {#if $preDungeonCheck.status === 'Loading'}
    <DefaultScreen text="Checking dungeon..." />
  {:else if $preDungeonCheck.status === 'SigningBackIn'}
    <DefaultScreen text="Signing back in..." />
  {:else if $preDungeonCheck.status === 'Joining'}
    {#if $wallet.requestingTx}
      <DefaultScreen text="Please accept payment" />
    {:else}
      <DefaultScreen>
        <p>The Elemental counts the $MATIC while you check the food...</p>
      </DefaultScreen>
    {/if}
  {:else if $preDungeonCheck.status === 'Done' && $preDungeonCheck.isCharacterInDungeon && !$preDungeonCheck.isDelegateReady}
    <WelcomeBackScreen />
  {:else if $preDungeonCheck.status === 'Done' && $preDungeonCheck.ressurectedId}
    <WelcomeBackScreen />
  {:else if $claim.status === 'None' && $preDungeonCheck.status === 'Done' && !$preDungeonCheck.isCharacterInDungeon && $preDungeonCheck.insufficientBalance}
    <DefaultScreen text="You need a key to join" askKey="true" signIn="true" />
  {:else}
    <DungeonScreen />
  {/if}
{:else if $dungeon !== 'loading' && !$reading && $preDungeonCheck.isCharacterInDungeon}
  <!-- Main Game Screen -->
  <LayoutScreen />
{:else}
  <DefaultScreen text="Loading dungeon..." />
{/if}
