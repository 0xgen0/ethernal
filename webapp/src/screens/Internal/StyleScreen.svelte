<script>
  import BoxButton from 'components/BoxButton';

  const boxButtons = [
    { name: 'Wide', type: 'wide' },
    { name: 'Wide (Disabled)', type: 'wide', isDisabled: true },
    { name: 'Wide Full', type: 'wide full' },
    { name: 'Wide Full (Disabled)', type: 'wide full', isDisabled: true },
    { name: 'Full', type: 'full' },
    // { name: 'Tab', type: 'tab' },
    // { name: 'Slot', type: 'slot' },
    { name: 'Plain', type: 'plain' },
    { name: 'Primary Subtle', type: 'primary subtle', text: 'X' },
    { name: 'Secondary', type: 'secondary', text: 'X' },
    { name: 'Secondary Small', type: 'secondary-small', text: 'X' },
    { name: 'Secondary Action', type: 'secondary-action', text: 'X' },
    { name: 'Loot Action', type: 'loot-action' },
    { name: 'Nav', type: 'nav' },
    { name: 'Large', type: 'large' },
  ];
</script>

<style lang="scss">
  :global(html body) {
    overflow-x: auto;
    overflow-y: auto;
  }

  .style-screen {
    max-width: 650px;
    padding: 24px;
    margin: 24px auto;
    border: 1px solid #444;

    h1.title {
      text-align: center;
      padding: 0 0 12px 0;
      margin: 0;
    }

    .category {
    }

    .group {
      padding: 0 0 6px 0;
      text-align: center;

      cite {
        display: block;
        padding: 6px 0 0 0;
        opacity: 0.64;
        font-size: 10px;
      }
    }

    hr {
      background: #444;
      height: 1px;
      width: 82%;
      margin: 48px auto;
      border: none;
    }
  }
</style>

<div class="style-screen">
  <h1 class="title">Typography</h1>
  <div class="category">
    <h1>Heading 1</h1>
    <h2>Heading 2</h2>
    <h3>Heading 3</h3>
    <h4>Heading 4</h4>
    <h5>Heading 5</h5>
    <h6>Heading 6</h6>
    <p>Paragraph</p>
  </div>

  <hr />

  <h1 class="title">Buttons</h1>
  <div class="category">
    {#each boxButtons as box}
      <div class="group">
        <BoxButton {...{ ...box, name: undefined }}>{box.text || box.name || box.type}</BoxButton>
        <cite>{box.name || box.type}</cite>
      </div>
    {/each}
  </div>

  <hr />

  <h1 class="title">Components</h1>
</div>
