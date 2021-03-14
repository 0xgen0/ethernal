<script>
  import { onMount } from 'svelte';
  import nprogress from 'nprogress';

  import {
    characterId,
    characterInfo,
    characterVault,
    currentFloor,
    currentRoom,
    foreclosedRooms,
    keeperAbilities,
    keeperIncome,
    keeperRooms,
  } from 'lib/cache';
  import { menuOverlay } from 'stores/screen';
  import { dungeon, map } from 'stores/dungeon';
  import { pluralize } from 'utils/text';
  import { formatCoordinates } from 'utils/utils';

  import BoxButton from 'components/BoxButton';
  import Header from 'components/bag/Header';
  import KeeperAbility from 'components/keeper/KeeperAbility';
  import KeeperLayout from 'components/layouts/KeeperLayout';
  import Line from 'components/Line';
  import MiniMap from 'components/map/MiniMap';
  import SelectBox from 'components/SelectBox';

  export let coordinates;

  let dungeonApproved;
  let error;
  let floors = [];
  let loading;
  let selectedAbility;
  let selectedCoordinates = coordinates;
  let value;

  /**
   * Fetch dungeon approved (unlock) status on mount
   */
  onMount(async () => {
    dungeonApproved = await $dungeon.isDungeonApproved();
    // vaultElementsApproved = await $dungeon.isCarrierApproved('Elements');
    await $dungeon.cache.fetchVault();
  });

  // Filter out id 4 (room rename) as this requires additional UX
  $: abilities = Object.entries($keeperAbilities)
    .map(([id, ability]) => ({
      id,
      ...ability,
      locked: ability.requirements && $keeperIncome && ability.requirements.income > $keeperIncome.fragments,
    }))
    .filter(({ id }) => !selectedAbility || selectedAbility.id === id)
    .sort((a, b) => a.requirements.income - b.requirements.income);
  $: lockedAbility = abilities.filter(({ locked }) => locked)[0];
  $: unlockedAbilities = abilities.filter(({ locked }) => !locked);
  $: selectedRoom = $dungeon.cache.rooms[selectedCoordinates];
  $: isAbilityDisabled = loading || selectedAbility;
  $: isRoomDisabled = loading || !selectedAbility;
  $: hasEnoughToBuy =
    selectedAbility &&
    $characterVault &&
    (!selectedAbility.price.coins || $characterVault.balance.coins >= selectedAbility.price.coins) &&
    (!selectedAbility.price.fragments || $characterVault.balance.fragments >= selectedAbility.price.fragments);
  $: pricePhrase =
    selectedAbility &&
    [
      selectedAbility.price.coins && `${selectedAbility.price.coins} ${pluralize('coin', selectedAbility.price.coins)}`,
      selectedAbility.price.fragments &&
        `${selectedAbility.price.fragments} ${pluralize('fragment', selectedAbility.price.fragments)}`,
    ]
      .filter(Boolean)
      .join(', ');
  $: monsterLevelTooHigh =
    selectedAbility &&
    selectedAbility.monster &&
    selectedAbility.monster.stats &&
    selectedAbility.monster.stats.level > floor;
  $: roomKindNotAllowed =
    selectedAbility &&
    selectedAbility.requirements &&
    selectedCoordinates &&
    $dungeon.cache.rooms[selectedCoordinates] &&
    selectedAbility.requirements.kind &&
    !selectedAbility.requirements.kind.includes($dungeon.cache.rooms[selectedCoordinates].kind);
  $: isConfirmDisabled =
    loading ||
    !selectedCoordinates ||
    !selectedAbility ||
    !hasEnoughToBuy ||
    $foreclosedRooms.includes(selectedCoordinates) ||
    roomKindNotAllowed ||
    monsterLevelTooHigh;

  $: highlightRooms = $keeperRooms.filter(room => {
    if (!selectedAbility) {
      return false;
    }
    const {
      requirements: { kind },
    } = selectedAbility;
    if (kind && kind.length > 0 && !kind.includes(room.kind)) {
      return false;
    }
    return !$foreclosedRooms.includes(room.coordinates);
  });

  $: floor = Number($currentFloor) || 0;
  $: {
    floors = [];
    for (let i = 0; i <= $characterInfo.floors; i += 1) {
      floors.push({ id: i, label: `Floor ${i} ${i === floor ? '(here)' : ''}`.trim() });
    }
  }

  /**
   * Change minimap floor select
   */
  const onFloorChange = evt => {
    floor = evt.target.value;
  };

  /**
   * Choose ability to add to room.
   */
  const onChooseAbility = ability => {
    selectedAbility = ability;
  };

  /**
   * Choose room to add ability.
   */
  const onSelectCoordinates = coords => {
    error = null;
    selectedCoordinates = coords;
  };

  /**
   * Add ability to selected room.
   */
  const onAddAbility = async () => {
    if (!selectedAbility || !selectedCoordinates) {
      return;
    }

    loading = true;
    error = null;
    try {
      let abilityAction;
      if (selectedAbility.id === "44") {
        abilityAction = $dungeon.nameRoom(selectedCoordinates, value);
      } else {
        abilityAction = $dungeon.cache.action('use-ability', {
          coordinates: selectedCoordinates,
          ability: selectedAbility.id,
        });
      }
      await nprogress.observe(abilityAction);
      menuOverlay.close();
      if (Number(floor) === Number($currentFloor)) {
        $map.refocus(selectedCoordinates);
      }
      selectedAbility = null;
      selectedCoordinates = coordinates;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
    }
    loading = false;
  };

  /**
   * Unlock dungeon for transfers
   */
  const unlockDungeon = async () => {
    if (!dungeonApproved) {
      await $dungeon.approveDungeon();
      dungeonApproved = await $dungeon.isDungeonApproved();
    }
  };

  /**
   * Cancel selections
   */
  const onCancel = () => {
    selectedAbility = null;
    selectedCoordinates = coordinates;
  };
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: flex-start;

    &.row {
      flex-direction: column;
      width: 100%;
      flex-grow: 1;
    }
  }

  .minimap {
    position: relative;
    border: 1px solid $color-grey;
    margin-bottom: 12px;
    background: $color-background;

    &.with-unselected {
      padding: 24px;
      text-align: center;
      background: unset;

      p {
        padding-bottom: 12px;

        span {
          color: $color-xLightGrey;
        }
      }
    }

    &--map {
      height: 210px;
    }

    &--info {
      padding: 0 6px 12px;
      text-align: center;
    }
  }

  .shop-activity,
  .shop-items {
    padding: 12px 0;

    .res {
      color: $color-darker-text;

      & + .res {
        padding-left: 12px;
      }

      img {
        height: 11px;
        margin-right: 5px;
      }
    }
  }

  .shop-activity {
    text-align: center;
  }

  .error,
  .warning {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
  }
  .warning {
    color: $color-yellow;
  }

  input {
    width: 100%;
    margin-top: 4px;
    margin-bottom: 15px;
    border: 2px solid $color-grey;
    background: transparent;
    color: $color-light;
    outline: none;
  }
</style>

<KeeperLayout>
  <div slot="header">
    <Header title="Add to Room" showMapButton />
  </div>

  <div slot="content">
    {#if $keeperRooms.length > 0}
      <!-- ALLOW USER TO SELECT ROOM FROM MINIMAP WHEN ABILITY IS CHOSEN -->
      {#if selectedAbility}
        <div class="minimap">
          <div class="minimap--map">
            <MiniMap
              allowRefocus="{false}"
              id="room-info-map"
              coordinates="{Number(floor) === Number($currentFloor) && $currentRoom.coordinates}"
              {floor}
              enabled
              hideItems
              hideToggles
              {highlightRooms}
              highlightMonsters
              onHighlightRoom="{onSelectCoordinates}"
            />
          </div>
          <div class="minimap--info">
            {#if selectedCoordinates}
              <p>Room {formatCoordinates(selectedCoordinates, 2)} on floor {floor}</p>
            {:else if highlightRooms.length > 0}
              <p>Select a room to add item</p>
              {#if $characterInfo.floors > 0}
                <SelectBox type="wide" items="{floors}" value="{floor}" onChange="{val => onFloorChange(val)}" />
              {/if}
            {:else}
              <p class="error">No rooms match item requirements</p>
            {/if}
          </div>
        </div>
        <div class="text-center">
          {#if selectedCoordinates}
            {#if selectedAbility.id === "44"}
              <label>
                <input maxlength="19" type="text" placeholder="Enter a new name" bind:value="{value}" />
              </label>
            {/if}
            <div class="flex">
              <BoxButton type="wide quick-action" onClick="{() => onCancel()}">Cancel</BoxButton>
              {#if dungeonApproved}
                {#if hasEnoughToBuy}
                  <BoxButton
                    type="wide full quick-action"
                    loadingText="Adding..."
                    isDisabled="{isConfirmDisabled}"
                    onClick="{() => onAddAbility()}"
                  >
                    Add for {pricePhrase}
                  </BoxButton>
                {:else}
                  <BoxButton type="wide full" isDisabled="{true}">Not enough in vault</BoxButton>
                {/if}
              {:else}
                <BoxButton type="wide full" loadingText="Please sign transaction" onClick="{() => unlockDungeon()}">
                  Unlock vault
                </BoxButton>
              {/if}
            </div>
            {#if error}
              <p class="error">{error}</p>
            {:else if roomKindNotAllowed}
              <p class="error">Cannot add to this room type.</p>
            {:else if monsterLevelTooHigh}
              <p class="error">Cannot add a monster with level higher than the floor.</p>
            {/if}
          {:else}
            <BoxButton type="secondary-small quick-action" onClick="{() => onCancel()}">Cancel</BoxButton>
          {/if}
        </div>
      {:else}
        <div class="minimap with-unselected">
          <p>
            <span>Fragments earned:</span>
            {$keeperIncome.fragments}
          </p>
          {#if lockedAbility}
            <div>
              <KeeperAbility ability="{lockedAbility}" />
            </div>
          {/if}
        </div>
      {/if}

      <div class="shop-activity">
        <h4>In Vault</h4>
        <div>
          <span class="res">
            <img src="/images/game-icons/coin_4x.png" alt="coin" />
            {$characterVault.balance.coins}
          </span>
          <span class="res">
            <img src="/images/game-icons/fragment_4x.png" alt="fragment" />
            {$characterVault.balance.fragments}
          </span>
        </div>
      </div>

      <div class="shop-items">
        {#if abilities.length === 0}
          <p class="text-center">No items to choose at this time</p>
        {/if}

        {#each unlockedAbilities as ability, i (ability.id)}
          {#if i > 0}
            <Line />
          {/if}

          <KeeperAbility {ability} isDisabled="{isAbilityDisabled}" {onChooseAbility} />
        {/each}
      </div>
    {:else}
      <p class="text-center">
        <em>No rooms yet.</em>
      </p>
    {/if}
  </div>
</KeeperLayout>
