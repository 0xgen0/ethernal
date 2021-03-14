<script>
  import { dungeon } from 'stores/dungeon';
  import { mapModal, menuOverlay } from 'stores/screen';
  import { characterInfo, characterQuests, currentRoom } from 'lib/cache';
  import { pluralize, typewriter } from 'utils/text';
  import quests, { npcAvatar } from 'data/quests';

  import BoxButton from 'components/BoxButton';
  import ModalLayout from 'components/layouts/ModalLayout';
  import Resources from 'components/bag/Resources';
  import Gear from 'components/bag/Gear';

  export let id;

  let avatar;
  let error;
  let loading = false;
  let overrideQuestStatus;
  let overrideCurrentProgress;
  let questStatus;
  let questStep = {};
  let step = 0;
  let isTyping;
  let opened = true;
  let ref;

  // Get quest
  $: quest = quests[id];
  $: currentQuest = $characterQuests[id];

  // Get quest status
  $: isNPC = $currentRoom.coordinates === currentQuest.coordinates;
  $: {
    let newStatus = overrideQuestStatus || (currentQuest && currentQuest.status) || 'discovered';

    // No status if not claiming/completed with NPC
    if (!isNPC && ['claiming', 'completed'].includes(newStatus)) {
      onCancel();
    }

    // Accepted status when talk to NPC or when advancing quest
    if (isNPC && newStatus === 'accepted') {
      newStatus = 'incomplete';
    } else if (newStatus === 'accepted') {
      // Mark as advance if not previously advance in current room
      if (currentQuest && !!currentQuest.data && Array.isArray(currentQuest.data) && !currentQuest.data.includes($currentRoom.coordinates)) {
        newStatus = 'advance';
      } else {
        onCancel();
      }
    }

    // Set status
    if (questStatus !== newStatus) {
      questStatus = newStatus;
    }
  }

  // Get quest current status conversation step
  $: {
    if (quest && quest.states[questStatus] && quest.states[questStatus][step]) {
      let newQuestStep = quest.states[questStatus][step];

      // Advance can have multiple goal steps
      // (LIKELY THIS WOULD NEED TO BE QUEST-SPECIFIC LATER)
      if (questStatus === 'advance') {
        const { current = 0 } = currentQuest.progress;
        if (quest.states[questStatus][overrideCurrentProgress || current]) {
          newQuestStep = quest.states[questStatus][overrideCurrentProgress || current][step];
        } else {
          onCancel();
        }
      }

      // Set step and typing
      if (questStep !== newQuestStep) {
        questStep = newQuestStep;
        isTyping = true;
      }
    }
  }

  // Assume nothing else to say, close quickly (mostly race when debugging)
  $: if (!quest || !currentQuest || !questStatus || !questStep) {
    onCancel();
  }

  // Set buttons disabled
  $: isDisabled = loading || isTyping;

  // Handle typing done event
  const onTypingComplete = () => {
    isTyping = false;
  };
  $: if (ref) {
    ref.addEventListener('done', onTypingComplete, false);
  }

  // Update step
  const onNextStep = () => {
    if (quest.states[questStatus] && quest.states[questStatus][step + 1]) {
      step = step + 1;
    } else {
      onCancel();
    }
  };

  // Cancel request
  const onCancel = () => {
    opened = false;
    mapModal.close();
  };

  // Accept quest
  const onAccept = async () => {
    loading = true;
    try {
      // Continue with current discovered status for dialog
      overrideQuestStatus = 'discovered';
      await $dungeon.acceptQuest(id);
      onNextStep();
      if (!currentQuest.quick) {
        menuOverlay.open('quests');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
    }
    loading = false;
  };

  // Advance quest
  const onAdvance = async () => {
    loading = true;
    try {
      // Continue with current advance status for dialog
      overrideQuestStatus = 'advance';
      overrideCurrentProgress = currentQuest.progress.current;
      const data = {};
      $dungeon.advanceQuest(id, data);
      onCancel();
      // await $dungeon.advanceQuest(id, data);
      // onNextStep();
    } catch (err) {
      // eslint-disable-next-line no-console
      error = 'Please try again.';
    }
    loading = false;
  };

  const onClaim = async () => {
    loading = true;
    try {
      // Continue with current claiming status for dialog
      overrideQuestStatus = 'claiming';
      const data = {};
      if (!(quest.states[questStatus] && quest.states[questStatus][step + 1])) {
        overrideQuestStatus = null;
        await $dungeon.finishQuest(id, data);
      }
      onNextStep();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
    }
    loading = false;
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.quest-screen) {
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

  .reward {
    padding: 6px 0;
  }

  .button {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px 0;
  }

  .error {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
    text-align: center;
  }
</style>

{#if opened && questStep}
  <ModalLayout class="quest-screen" closeable="{false}">
    <div slot="header">
      <div class="flex header">
        {#if !questStep.hideAvatar}
          <BoxButton type="secondary">
            <img src="{npcAvatar(quest.avatar)}" alt="profile" />
          </BoxButton>
        {/if}
        <div class="text">
          <p>
            <strong>{questStep.title || quest.name || quest.title}:</strong>
          </p>
          {#if questStep.text}
            <!-- USE KEYED BLOCKS TO RE-TRANSITION "IN" ON TEXT CHANGES -->
            {#each [{ id: Date.now(), text: questStep.text }] as text (text.id)}
              <p bind:this="{ref}" in:typewriter on:done="{() => onTypingComplete()}">
                {@html text.text}
              </p>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <div slot="content">
      {#if questStep.reward && currentQuest.reward}
        {#if currentQuest.reward.balance}
          <div class="reward">
            <Resources {...currentQuest.reward.balance} hideEmpty />
          </div>
        {/if}
        {#if currentQuest.reward.gear}
          <div class="reward">
            <Gear gear="{currentQuest.reward.gear}" />
          </div>
        {/if}
      {/if}
    </div>

    <div slot="footer">
      {#if !isTyping}
        <div class="button">
          {#if questStep.cancel}
            <BoxButton type="wide full" {isDisabled} onClick="{() => onCancel()}">{questStep.cancel}</BoxButton>
          {/if}
          {#if questStep.next}
            <BoxButton type="wide full" {isDisabled} onClick="{() => onNextStep()}">{questStep.next}</BoxButton>
          {/if}
          {#if questStep.accept}
            <BoxButton type="wide full" {isDisabled} onClick="{() => onAccept()}">{questStep.accept}</BoxButton>
          {/if}
          {#if questStep.advance}
            <BoxButton type="wide full" {isDisabled} onClick="{() => onAdvance()}">{questStep.advance}</BoxButton>
          {/if}
          {#if questStep.claim}
            <BoxButton type="wide full" {isDisabled} onClick="{() => onClaim()}">{questStep.claim}</BoxButton>
          {/if}
        </div>
        {#if error}
          <p class="error">{error}</p>
        {/if}
      {/if}
    </div>
  </ModalLayout>
{/if}
