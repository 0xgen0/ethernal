<script>
  import DefaultScreen from 'screens/DefaultScreen';

  export let setupWallet;

  const { useLocalKey } = window.params;
</script>

<DefaultScreen
  header="profile"
  btnText="{useLocalKey ? 'Use A Burner Wallet' : 'Register or login to Portis'}"
  btnPressed="{() => setupWallet()}"
  helpPortis="{!useLocalKey}"
>

  <p>
    What’s this? You found
    <span class="highlight-yellow">a basic sword</span>
    and
    <span class="highlight-yellow">a shield</span>
    on the way. What good fortune!
  </p>
  {#if useLocalKey}
    <p class="subtext">Set up a wallet to store your items and $MATIC.</p>
    <!-- <p class="subtext"><small><i>* Tip: You can find them in your bag once you enter the dungeon *</i></small></p> -->
  {:else}
    <p class="subtext">Store the items and $MATIC safely in a wallet.</p>
    <!-- <p class="subtext">><small><i>* Tip: You can find them in your bag once you enter the dungeon *</i></small></p> -->
  {/if}

  <!-- <button on:click="{() => wallet.useFirstChoice()}">Setup Wallet</button> -->
</DefaultScreen>
