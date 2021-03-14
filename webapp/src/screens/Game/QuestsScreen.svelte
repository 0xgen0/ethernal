<script>
  import { menuOverlay, isMobile } from 'stores/screen';
  import { map } from 'stores/dungeon';
  import { characterQuests, currentFloor, questUpdate } from 'lib/cache';
  import quests, { npcAvatar } from 'data/quests';

  import AlertTick from 'components/AlertTick';
  import BoxButton from 'components/BoxButton';
  import CharacterLayout from 'components/layouts/CharacterLayout';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';
  import ProgressGauge from 'components/ProgressGauge';

  import IconHere from 'assets/icons/marker_2x.png';

  const clearQuestsUpdate = () => ($questUpdate = null);

  let questsByFloor = {};
  let update = null;
  $: {
    update = $questUpdate;
    clearQuestsUpdate();
    questsByFloor = {};
    Object.entries($characterQuests).forEach(([id, quest]) => {
      if (['discovered', 'rejected'].includes(quest.status)) {
        return;
      }
      if (!questsByFloor[quest.floor]) {
        questsByFloor[quest.floor] = [];
      }
      questsByFloor[quest.floor].push({ id, ...quest });
    });
  }
  $: hasQuests = Object.keys(questsByFloor).length > 0;

  const refocusMap = coordinates => {
    if ($isMobile) {
      menuOverlay.close();
    }
    $map.refocus(coordinates);
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: flex-start;
  }
  .row {
    flex-direction: column;
    width: 100%;
    flex-grow: 1;
  }

  .quest {
    width: 100%;
    padding: 4px 0;

    .avatar {
      position: relative;
      margin-right: 10px;
      align-items: center;
      justify-content: center;
      background: $color-black;
      min-height: 48px;
      display: flex;
      min-width: 48px;
    }
    .avatar img {
      width: 32px;
      height: 32px;
    }

    p {
      font-size: 12px;
      padding-bottom: 0;

      em {
        color: $color-darker-text;
      }

      & + p {
        padding-top:6px;
      }
    }
    // .info > div:first-child {
    //   font-size: 12px;
    //   padding-bottom: 2px;
    // }

    .progress {
      margin-top: 8px;
      height: 2px;
      max-width: 50%;
      width: 100%;
    }

    .status {
      margin-left: 10px;

      .status-text {
        font-size: 10px;
        color: $color-darker-text;
        padding-right: 0px;

        &--italic {
          color: $color-darker-text;
          font-style: italic;
        }
      }

      img {
        width: 60%;
        height: auto;
        vertical-align: middle;
      }
    }
  }
</style>

<CharacterLayout>
  <div slot="header">
    <Header title="Quests" />
  </div>

  <div slot="content">
    {#if !hasQuests}
      <div>
        <p class="text-center">
          <em>No quests yet.</em>
        </p>
      </div>
    {/if}

    {#each Object.keys(questsByFloor) as floor}
      <div>
        <h4 class="text-center">Floor {floor}</h4>

        <div class="flex row">
          {#each questsByFloor[floor] as quest, i (quest.id)}
            <div class="quest flex">
              <div class="avatar" on:click="{clearQuestsUpdate}">
                {#if update && update.id === quest.id}
                  <AlertTick />
                {/if}
                <img src="{npcAvatar(quests[quest.id].avatar)}" alt="quest" />
              </div>

              <div class="info flex row">
                <h5>{quests[quest.id].title}</h5>
                {#if quest.floor != null}
                   <p><em>(Floor {quest.floor})</em></p>
                {/if}
                {#if quests[quest.id].description}
                  <p>{quests[quest.id].description}</p>
                {/if}
                {#if quest.progress}
                  <div class="progress">
                    <ProgressGauge
                      current="{quest.progress.current}"
                      limit="{quest.progress.goal}"
                      increments="{quest.progress.goal}"
                    />
                  </div>
                {/if}
              </div>

              <div class="status">
                {#if quest.status === 'completed'}
                  <span class="status-text">Completed</span>
                {:else if quest.coordinates && JSON.stringify(quest.coordinates) !== '{}'}
                  <BoxButton
                    type="secondary-small"
                    isDisabled="{Number(floor) !== Number($currentFloor)}"
                    onClick="{() => refocusMap(quest.coordinates)}"
                  >
                    <img src="{IconHere}" alt="here" />
                  </BoxButton>
                {/if}
              </div>
            </div>
            <Line />
          {/each}
        </div>
      </div>
    {/each}
  </div>
</CharacterLayout>
