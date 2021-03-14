<script>
  import { classes } from 'data/text';
  import characterChoice from 'stores/characterChoice';

  import DefaultScreen from 'screens/DefaultScreen';
  import SelectCharacterClass from 'components/SelectCharacterClass';

  export let next;

  let name;
  let characterClass = '0';
  $: text = classes[characterClass];
</script>

<DefaultScreen
  header="logo"
  btnText="Go forth"
  btnPressed="{() => {
    if (name && name !== '') {
      characterChoice.setData({ name, characterClass });
      next();
    }
  }}"
  btnDisabled="{!(name && name !== '')}"
>
  <SelectCharacterClass bind:characterClass bind:name />
</DefaultScreen>
