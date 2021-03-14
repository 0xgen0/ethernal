<script>
  import { classPortrait } from 'utils/data';

  import preDungeonCheck from 'stores/preDungeonCheck';
  import DefaultScreen from 'screens/DefaultScreen';
  import BoxButton from 'components/BoxButton';

  const { characterInfo, refill, ressurectedId } = $preDungeonCheck;

  let disabled = false;
  const ok = async () => {
    try {
      disabled = true;
      if (ressurectedId) {
        await preDungeonCheck.enter({ ressurectedId, characterInfo });
      } else {
        await preDungeonCheck.checkBackIn(refill);
      }
    } catch (e) {
      disabled = false;
    }
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .content {
    height: 100%;
  }
  img {
    border: 1px solid $color-grey;
    padding: 2px;
    margin: 0 0 5px 0;
    width: 80px;
    height: 80px;
  }
  .content h3 {
    font-size: 20px;
  }
</style>

<DefaultScreen>
  <div class="content as-space-between">

    <h2>Your Character</h2>
    <div>
      <img src="{classPortrait(characterInfo.stats.characterClass)}" alt="" />
      <h3>{characterInfo.characterName}</h3>
    </div>
    {#if ressurectedId}
      <p>is waiting for you at dungeon entrance.</p>
    {:else}
      <p>is waiting for you in the dungeon.</p>
    {/if}

    <div>
      <BoxButton type="wide full" {disabled} onClick="{ok}">
        {#if ressurectedId}Enter the dungeon{:else}Sign Back In{/if}
      </BoxButton>
    </div>
  </div>
</DefaultScreen>
