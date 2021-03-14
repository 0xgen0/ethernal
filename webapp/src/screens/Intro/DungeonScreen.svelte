<script>
  import characterChoice from 'stores/characterChoice';
  import claim from 'stores/claim';
  import preDungeon from 'stores/preDungeon';
  import preDungeonCheck from 'stores/preDungeonCheck';
  import wallet from 'stores/wallet';
  import DefaultScreen from 'screens/DefaultScreen';
  import CharacterScreen from 'screens/Intro/CharacterScreen';
  import EnterScreen from 'screens/Intro/EnterScreen';
  import TypingTextScreen from 'screens/Intro/TypingTextScreen';
  import UseKeyScreen from 'screens/Intro/UseKeyScreen';
  import WalletSetupScreen from 'screens/Intro/WalletSetupScreen';

  // @TODO - DETERMINE CORRECT PRICE
  const FOOD_PRICE = 0.4;
</script>

{#if $preDungeon.roomId === 'final'}
  {#if $wallet.status === 'Ready'}
    {#if $claim.status === 'WaitingWallet'}
      <UseKeyScreen next="{() => claim.claim()}" />
    {:else if $claim.status === 'Claimed' || $claim.status === 'None'}
      <TypingTextScreen
        buttonText="Pay {FOOD_PRICE} $MATIC for food"
        disableSkip="true"
        waitText="The elemental counts your money while you check the food...."
        text="An elemental appears: “You need food to survive in the dungeon. Remember, in the Ethernal every action
        will cost you food.”"
        next="{async () => {
          await preDungeonCheck.join($characterChoice);
        }}"
      />
    {:else if $claim.status === 'Gone'}
      <DefaultScreen
        header="profile"
        text="Invalid key (already used)"
        btnText="Continue anyway"
        btnPressed="{() => claim.acknowledge()}"
      />
      <!-- <button on:click="{() => claim.acknowledge()}">Continue anyway</button> -->
    {:else}
      <DefaultScreen header="profile " text="You try the key on the gate..." />
    {/if}
  {:else}
    <WalletSetupScreen setupWallet="{() => wallet.useFirstChoice()}" />
  {/if}
{:else if $preDungeon.roomId === 'intro' && $wallet.status !== 'Ready'}
  <EnterScreen next="{() => preDungeon.setRoom('character')}" />
{:else if $preDungeon.roomId === 'character' || ($preDungeon.roomId === 'intro' && $wallet.status === 'Ready')}
  <CharacterScreen next="{() => preDungeon.setRoom('second')}" />
{:else if $preDungeon.roomId === 'second'}
  <TypingTextScreen
    text="You are carefully pacing down a darkened path. Gloom had set in hours before. You knew the stories about this
    place you are heading: there is untold wealth in that labyrinth, leftover from a forgotten civilization. There is
    also damnation... Sounds like a bunch of scary stories to keep people away."
    next="{() => preDungeon.setRoom('third')}"
  />
{:else if $preDungeon.roomId === 'third'}
  <TypingTextScreen
    text="There’s a reason they have stayed away, but the reason you’ve come is stronger still. Get as much loot as you
    can, and then get out. And if you encounter others like yourself, earn some cash by selling them your loot. Or, they
    will even fight with you. Your anticipation grows..."
    next="{() => preDungeon.setRoom('final')}"
  />
{/if}
