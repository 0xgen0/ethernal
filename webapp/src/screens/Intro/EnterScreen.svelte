<script>
  import claim from 'stores/claim';
  import DefaultScreen from 'screens/DefaultScreen';

  export let next;
</script>

<style>

</style>

<DefaultScreen
  header="logo"
  text="{Number($claim.rawBalance) === 0 ? 'Your key is empty' : 'You have a skull key'}"
  subtext="{Number($claim.rawBalance) === 0 ? 'Please get a different key' : `And a balance of ${$claim.balance} $MATIC.`}"
  btnText="Create a character"
  btnPressed="{() => next()}"
  btnDisabled="{Number($claim.rawBalance) === 0}"
>
</DefaultScreen>
