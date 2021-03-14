<script>
  import { classPortrait } from 'utils/data';
  import { classes } from 'data/text';

  export let name;
  export let characterClass = '0';

  $: text = classes[characterClass];
</script>

<style lang="scss">
  @import '../styles/variables';

  .container {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-left: 20px;
    margin-right: 20px;
    margin-bottom: 20px;
  }
  .selection-box {
    cursor: pointer;
    display: block;
    text-align: center;
    transition: opacity 0.1s ease-in-out;

    input {
      display: none;
    }
    img {
      border: 1px solid $color-grey;
      padding: 2px;
    }

    &.disabled {
      opacity: 0.24;

      &:hover {
        opacity: 0.64;
      }
    }
  }
  img {
    width: 46px;
    height: 46px;
  }
  h3 {
    margin-top: 0px;
    margin-bottom: 25px;
  }
  .input-container {
    padding: 12px 0 44px;
  }
  input {
    margin-top: 4px;
    border: 3px solid $color-grey;
    background: transparent;
    color: $color-light;
    outline: none;
  }
  input:focus {
    border-color: $color-light;
  }
  .description {
    flex-direction: column;
    border: 1px solid $color-grey;
    justify-content: start;
    text-align: left;
    padding: 10px;
    height: 110px;

    ul {
      margin-left: 25px;
    }
  }
</style>

<h3>Select a class</h3>
<div class="container">
  <label class:disabled="{characterClass !== '0'}" class="selection-box">
    <input type="radio" bind:group="{characterClass}" value="{'0'}" />
    <img src="{classPortrait('0')}" alt="{classes['0'][0]}" />
  </label>
  <label class:disabled="{characterClass !== '1'}" class="selection-box">
    <input type="radio" bind:group="{characterClass}" value="{'1'}" />
    <img src="{classPortrait('1')}" alt="{classes['1'][0]}" />
  </label>
  <label class:disabled="{characterClass !== '2'}" class="selection-box">
    <input type="radio" bind:group="{characterClass}" value="{'2'}" />
    <img src="{classPortrait('2')}" alt="{classes['2'][0]}" />
  </label>
  <label class:disabled="{characterClass !== '3'}" class="selection-box">
    <input type="radio" bind:group="{characterClass}" value="{'3'}" />
    <img src="{classPortrait('3')}" alt="{classes['3'][0]}" />
  </label>
</div>
<div class="container description">
  <div>
    <h4>{text[0]}</h4>
    <ul>
      {#each text[1] as desc}
        <li>{desc}</li>
      {/each}
    </ul>
  </div>
</div>

<div class="input-container">
  <label>Name your character</label>
  <input maxlength="19" type="text" placeholder="..." bind:value="{name}" />
</div>
