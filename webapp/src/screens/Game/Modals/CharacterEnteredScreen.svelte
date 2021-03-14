<script>
  import { mapModal } from 'stores/screen';
  import { characterInfo, characterQuests, characterCoordinates } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';
  import { pluralize, typewriter } from 'utils/text';

  import IconAlchemist from 'assets/npc-alchemist.png';
  import BoxButton from 'components/BoxButton';
  import ModalLayout from 'components/layouts/ModalLayout';

  let isTyping;
  let ref;

  // Handle typing done event
  const onTypingComplete = () => {
    isTyping = false;
  };
  $: if (ref) {
    ref.addEventListener('done', onTypingComplete, false);
  }

  const onClose = async () => {
    mapModal.close();
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.character-entered-screen) {
    @media screen and (min-width: $desktop-min-width) {
      max-width: 450px !important;
      min-height: 250px;
    }
  }
  :global(.modal-layout--footer) {
    min-height: 48px;
  }

  .flex {
    display: flex;
    flex-direction: row;
    justify-content: stretch;

    &.header {
      position: relative;
      padding-right: 24px;
      padding-bottom: 16px;

      :global(button) {
        margin-right: 12px;
      }

      // &:after {
      //   content: '';
      //   position: absolute;
      //   bottom: 0;
      //   left: 12px;
      //   right: 12px;
      //   z-index: 2;
      //   height: 1px;
      //   overflow: hidden;
      //   background: rgba($color-grey, 0.5);
      // }

      img {
        height: 100%;
        width: auto;
      }

      p {
        padding: 0;
      }

      .text {
        min-height: 128px;

        @media screen and (min-width: $desktop-min-width) {
          min-height: 90px;
        }
      }
    }

    p {
      flex: 1;
      width: 100%;

      @media screen and (max-width: $mobile-max-width) {
        font-size: 13px;
      }
    }
  }

  .button {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px 0;
  }
</style>

<ModalLayout class="character-entered-screen" closeable="{false}">
  <div slot="header">
    <div class="flex header">
      <BoxButton type="secondary">
        <img src="{IconAlchemist}" alt="profile" />
      </BoxButton>
      <div class="text">
        <p>
          <strong>The Alchemist:</strong>
        </p>
        <!-- USE KEYED BLOCKS TO RE-TRANSITION "IN" ON TEXT CHANGES -->
        <p bind:this="{ref}" in:typewriter on:done="{() => onTypingComplete()}">
          Welcome to the Ethernal. {#if $characterCoordinates !== '0,0'}Quick, come find me in Room 0,0,0. {/if}I have something very important to share with
          you. Also, you can find the new Quests tab by clicking on your character profile.
        </p>
      </div>
    </div>
  </div>

  <div slot="footer">
    {#if !isTyping}
      <div class="button">
        <BoxButton type="wide full" isDisabled="{isTyping}" onClick="{() => onClose()}">Got it</BoxButton>
      </div>
    {/if}
  </div>
</ModalLayout>
