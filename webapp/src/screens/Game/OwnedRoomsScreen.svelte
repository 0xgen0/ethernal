<script>
  import { menuOverlay } from 'stores/screen';
  import { map } from 'stores/dungeon';
  import { currentFloor, currentRoom, characterInfo, keeperRooms } from 'lib/cache';
  import roomGenerator from 'lib/roomGenerator';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';
  import KeeperLayout from 'components/layouts/KeeperLayout';
  import Header from 'components/bag/Header';
  import Line from 'components/Line';
  import MiniMap from 'components/map/MiniMap';
  import OwnedRoom from 'components/keeper/OwnedRoom';
  import SelectBox from 'components/SelectBox';

  export let mapView = true;

  let floors = [];
  let roomsByFloor = {};

  $: floor = Number($currentFloor) || 0;
  $: {
    floors = [];
    for (let i = 0; i <= $characterInfo.floors; i += 1) {
      floors.push({ id: i, label: `Floor ${i} ${i === floor ? '(here)' : ''}`.trim() });
    }
  }

  $: {
    roomsByFloor = {};
    $keeperRooms.forEach(room => {
      const floor = getCoordinatesFloor(room.coordinates);
      if (!roomsByFloor[floor]) {
        roomsByFloor[floor] = [];
      }
      roomsByFloor[floor].push(roomGenerator(room));
    });
  }
  $: highlightRooms = $keeperRooms.map(({ coordinates }) => ({ coordinates }));

  const byIncome = (a, b) => b.keeper.income.fragments - a.keeper.income.fragments;

  const onFloorChange = evt => {
    floor = evt.target.value;
  };

  const toggleView = () => {
    mapView = !mapView;
  };

  const onRoomClick = coordinates => {
    menuOverlay.open('roomInfo', { coordinates, back: true });
    if (floor === getCoordinatesFloor(coordinates)) {
      $map.refocus(coordinates);
    }
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

  .tabs {
    margin-bottom: 12px !important;

    :global(.btn) {
      font-size: 12px;
      height: 32px;
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
    grid-column-gap: 10px;
    grid-row-gap: 10px;
    padding: 10px 0;
  }

  .minimap {
    position: relative;
    border: 1px solid $color-grey;
    margin-bottom: 12px;
    background: $color-background;

    &--map {
      height: 210px;
    }

    &--info {
      padding: 0 6px 12px;
      text-align: center;
    }
  }

  h4.current-room {
    color: $color-light;
  }
</style>

<KeeperLayout>
  <div slot="header">
    <Header title="My Rooms" subtitle="{$keeperRooms.length}" showMapButton />
  </div>

  <div slot="content">
    <div class="flex tabs">
      <BoxButton
        type="wide"
        class="{mapView ? 'selected' : ''}"
        disabled="{mapView}"
        onClick="{mapView ? null : toggleView}"
      >
        Map
      </BoxButton>
      <BoxButton
        type="wide"
        class="{!mapView ? 'selected' : ''}"
        disabled="{!mapView}"
        onClick="{!mapView ? null : toggleView}"
      >
        List
      </BoxButton>
    </div>

    {#if mapView}
      <div class="minimap">
        <div class="minimap--map">
          <MiniMap
            id="room-info-map"
            coordinates="{Number(floor) === Number($currentFloor) && $currentRoom.coordinates}"
            {floor}
            enabled
            hideItems
            hideToggles
            highlightMonsters
            {highlightRooms}
            onHighlightRoom="{onRoomClick}"
          />
        </div>
        {#if $characterInfo.floors > 0}
          <div class="minimap--info">
            <SelectBox type="wide" items="{floors}" value="{floor}" onChange="{val => onFloorChange(val)}" />
          </div>
        {/if}
      </div>
    {/if}

    {#if $keeperRooms.length === 0}
      <div>
        <p class="text-center">
          <em>No rooms yet.</em>
        </p>
      </div>
    {/if}

    {#each Object.keys(roomsByFloor).sort() as floor}
      <div>
        {#if mapView}
          <!-- NEED TO ROLL UP TO SHOW BY ROOM TYPE, IS NOT SAME AS LIST VIEW -->
          <!--
            <div class="grid">
              {#each roomsByFloor[floor] as room, i (room.coordinates)}
                <OwnedRoom as="grid" {room} {floor} {onRoomClick} />
              {/each}
            </div>
          -->
        {:else}
          <h4 class="text-center" class:current-floor="{$currentFloor === Number(floor)}">
            Floor {floor}
            {#if $currentFloor === Number(floor)}(here){/if}
          </h4>

          <div class="flex row">
            {#each roomsByFloor[floor].sort(byIncome) as room, i (room.coordinates)}
              {#if i > 0}
                <Line />
              {/if}
              <OwnedRoom {room} {floor} {onRoomClick} />
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</KeeperLayout>
