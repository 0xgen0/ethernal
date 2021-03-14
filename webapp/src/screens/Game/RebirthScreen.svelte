<script>
  import { tick } from 'svelte';

  import { classes, rebirth } from 'data/text';
  import {
    characterStatus,
    characterName,
    characterLevel,
    characterClass,
    characterPortrait,
    characterInfo,
  } from 'lib/cache';
  import { menuOverlay } from 'stores/screen';
  import { dungeon } from 'stores/dungeon';

  import ContentLayout from 'components/layouts/ContentLayout';
  import BoxButton from 'components/BoxButton';
  import SelectCharacterClass from 'components/SelectCharacterClass';

  $: status = $characterStatus;
  $: if (status !== 'just died' && status !== 'dead') {
    // eslint-disable-next-line no-console
    console.log('not your time yet ...');
    menuOverlay.close();
  }

  let name = $characterName;
  let editName = false;
  let textInput;
  let startOver = false;
  let selectedClass = '0';

  async function edit() {
    editName = !editName;
    if (editName) {
      await tick();
      // eslint-disable-next-line no-console
      console.log(textInput);
      textInput.focus();
    }
  }

  async function resurrect() {
    const receipt = startOver ? await $dungeon.createNewCharacter(name, selectedClass) : await $dungeon.resurrect(name);
    // eslint-disable-next-line no-console
    console.log('resurrected', receipt);
    window.location.reload();
  }
</script>

<style lang="scss">
  @import '../../styles/variables';

  .rebirth-screen {
    max-height: 500px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    &--text {
      padding: 12px 0;
      min-width: 170px;

      img {
        border: 1px solid $color-grey;
        padding: 2px;
        width: 72px;
        height: 72px;
        margin-bottom: 5px;
      }
      h3 {
        font-size: 18px;
        margin-bottom: 5px;
      }
      input {
        margin-top: 4px;
        border: 2px solid $color-grey;
        background: transparent;
        color: $color-light;
        outline: none;
      }

      p {
        height: auto;
      }
    }
    &--new {
      width: 300px;
    }
  }
</style>

<ContentLayout class="with-dark-bg">
  <div class="rebirth-screen text-center">
    {#if startOver}
      <div class="rebirth-screen--new">
        <SelectCharacterClass bind:characterClass="{selectedClass}" bind:name />
      </div>
    {:else}
      <div class="rebirth-screen--text rebirth-screen--text--name">
        <img src="{$characterPortrait}" alt="" />
        <div>
          {#if editName}
            <form on:submit|preventDefault="{edit}">
              <input bind:this="{textInput}" maxlength="19" type="text" placeholder="..." bind:value="{name}" />
            </form>
          {:else}
            <h3>{name}</h3>
          {/if}
        </div>
        <p class="pad-top-10">
          <BoxButton type="secondary-small-wide" onClick="{edit}">
            {#if editName}Ok{:else}Change name{/if}
          </BoxButton>
        </p>
      </div>
      <div class="rebirth-screen--text">
        <p class="as-row as-space-between">
          <span>Class:</span>
          <span>{classes[$characterClass][0]}</span>
        </p>
        <p class="as-row as-space-between">
          <span>Generation:</span>
          <span>{$characterInfo.lineage.length + 1}</span>
        </p>
        <p class="as-row as-space-between">
          <span>Inherited LVL:</span>
          <span>{$characterLevel}</span>
        </p>
      </div>
    {/if}

    <div>
      <p>
        <BoxButton onClick="{resurrect}" type="wide full" loadingText="Spawning new character..." needsFood>
          Confirm
        </BoxButton>
      </p>
      <p>
        <BoxButton
          type="plain"
          onClick="{() => {
            startOver = !startOver;
          }}"
        >
          {startOver ? rebirth.rebirth : rebirth.startOver}
        </BoxButton>
      </p>
    </div>
  </div>
</ContentLayout>
