<script>
  import router from 'page';

  import { fetchCache, characterId, onlineCharacters, currentRoom } from 'lib/cache';
  import { dungeon } from 'stores/dungeon';
  import { menuOverlay, mapModal } from 'stores/screen';

  import BagLayout from 'components/layouts/BagLayout';
  import BoxButton from 'components/BoxButton';
  import Explorer from 'components/map/Explorer';
  import Consumables from 'components/bag/Consumables';
  import Gear from 'components/bag/Gear';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';

  export let id;

  let character;
  let characterBalances;
  let loading = true;

  $: (async () => {
    if (id && (!character || character.id !== id) && loading) {
      if ($onlineCharacters[id]) {
        character = $onlineCharacters[id];
      } else {
        character = await fetchCache(`characters/${id}`);
      }
      loading = false;
    }
  })();
  $: {
    const { coins, keys, fragments, elements } = character || {};
    characterBalances = { coins, keys, fragments, elements };
  }
  $: isOnline = $onlineCharacters[id];
  $: isMe = id === $characterId;

  const onClose = () => {
    menuOverlay.close();
    router('/');
  };

  const openTradeBuyerModal = () => {
    onClose();
    mapModal.open('tradeBuyer', { id });
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  h2 {
    padding: 24px 0 12px 0;
    text-align: center;
  }
  .trade-btn {
    text-align: center;
    padding: 0 0 12px 0;

    small {
      font-style: italic;
      color: $color-grey;
      font-size: 10px;
    }
  }
</style>

{#if character}
  <BagLayout>
    <div slot="header">
      <Header title="{character.characterName}" closeable {onClose} />
    </div>

    <div slot="content">
      <div>
        <Explorer class="as-bag-layout" mode="profile" {character} />

        {#if character.character !== $characterId}
          <div class="trade-btn">
            <BoxButton
              type="secondary-action"
              onClick="{openTradeBuyerModal}"
              isDisabled="{character.coordinates !== $currentRoom.coordinates}"
            >
              Buy Items
            </BoxButton>
            {#if character.coordinates !== $currentRoom.coordinates}
              <br/>
              <small>Must be in same room with you.</small>
            {/if}
          </div>
        {/if}
      </div>

      <Line />

      <div class="block">
        <h2>{character.characterName}’s Bag</h2>

        <Consumables balances="{characterBalances}" />

        <div class="block">
          <h6 class="text-center italic darker">Gear</h6>

          <div class="block">
            {#each character.gear as gear (gear.id)}
              <Gear {gear} />
              <Line />
            {/each}
          </div>
        </div>
      </div>
    </div>
  </BagLayout>
{:else if !loading}
  <BagLayout>
    <div slot="header">
      <Header title="Unknown Character" closeable {onClose} />
    </div>

    <div slot="content">
      <p class="text-center">Could not find character #{id}.</p>
    </div>
  </BagLayout>
{:else}
  <BagLayout>
    <p>Loading...</p>
  </BagLayout>
{/if}
