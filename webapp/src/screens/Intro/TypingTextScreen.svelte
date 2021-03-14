<script>
  import DefaultScreen from 'screens/DefaultScreen';
  import TypeWriterSingleText from 'components/TypeWriterSingleText';

  export let text;
  export let next;
  export let buttonText = 'Continue on...';
  export let waitText = 'Please wait...';
  export let disableSkip;

  let writing = true;
  let waiting = false;

  $: btnText = !disableSkip && writing ? 'Skip' : buttonText;
  $: btnDisabled = disableSkip && writing;

  const btnPressed = async () => {
    waiting = true;
    await next();
    waiting = false;
  };
</script>

<DefaultScreen header="profile" {btnText} {btnDisabled} {btnPressed}>
  {#if waiting}
    {waitText}
  {:else}
    <TypeWriterSingleText
      {text}
      charTime="34"
      on:done="{() => {
        writing = false;
      }}"
    />
  {/if}
</DefaultScreen>
