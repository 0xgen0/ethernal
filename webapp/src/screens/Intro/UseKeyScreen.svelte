<script>
  import DefaultScreen from 'screens/DefaultScreen';
  import TypeWriterSingleText from 'components/TypeWriterSingleText';

  export let next;
  export let waitText = 'Please wait...';

  const { useLocalKey } = window.params;
  const waiting = false;
  let writing = true;

  const subtext = `Your $MATIC balance and items will be stored in your ${
    useLocalKey ? '' : 'Portis'
  } wallet once you enter the dungeon.`;
</script>

<style>
  .subtext {
    padding-bottom: 30px;
  }
</style>

<DefaultScreen header="profile" btnText="Use the skull key" btnPressed="{() => next()}">
  <p class="subtext">{subtext}</p>
  {#if waiting}
    {waitText}
  {:else}
    <TypeWriterSingleText
      text="{'In front of you is a gate.'}"
      charTime="50"
      on:done="{() => {
        writing = false;
      }}"
    />
  {/if}
</DefaultScreen>
