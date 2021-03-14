<script>
  import wallet from 'stores/wallet';
  import DefaultScreen from 'screens/DefaultScreen';
</script>

{#if $wallet.walletTakingTimeToReply}
  <DefaultScreen text="Your wallet is taking some time, please be patient..." />
{:else}
  <DefaultScreen text="Please wait..." />
{/if}
