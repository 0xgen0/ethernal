<script>
  import Resources from 'components/bag/Resources';

  export let bounty;

  $: sum = Object.values(bounty || {}).flat().reduce((a, b) => a + b, 0);
</script>

<style lang="scss">
  @import '../../styles/variables';

  p {
    margin: 0;
    padding-bottom: 5px;
    color: $color-darker-text;
  }
  .bounty {
    border: 1px solid rgba(111, 110, 110, 0.42);
    align-items: center;
    padding-left: 10px;
    margin-top: 15px;
    margin-bottom: 15px;
  }
  .cols {
    display: flex;
    margin-top: 5px;
    justify-content: space-between;
  }
</style>

{#if sum > 0}
  <div class="bounty cols">
    <p>Bounty:</p>
    <Resources {...bounty} hideEmpty/>
  </div>
{/if}
