<script>
  import { onMount } from 'svelte';

  import { dungeon } from 'stores/dungeon';
  import { mapModal } from 'stores/screen';
  import { characterBalances, characterInfo, currentRoom } from 'lib/cache';
  import { pluralize } from 'utils/text';
  import { formatCoordinates, getCoordinatesFloor } from 'utils/utils';

  import BoxButton from 'components/BoxButton';
  import SelectBox from 'components/SelectBox';
  import ModalLayout from 'components/layouts/ModalLayout';
  import MiniMap from 'components/map/MiniMap';

  let cost;
  let error;
  let floors = [];
  let loading = true;
  let selected;

  $: floor = getCoordinatesFloor($currentRoom.coordinates);
  $: {
    floors = [];
    for (let i = 0; i <= $characterInfo.floors; i += 1) {
      floors.push({ id: i, label: `Floor ${i} ${i === floor ? '(here)' : ''}`.trim() });
    }
  }

  onMount(() => {
    loading = false;
  });

  const onClick = async () => {
    error = null;
    try {
      await $dungeon.teleport(selected);
      mapModal.close();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error = 'Please try again.';
    }
  };

  const onFloorChange = evt => {
    floor = evt.target.value;
    selected = null;
  };

  const onTeleportChange = async val => {
    selected = val;
    cost = await $dungeon.cache.teleportCost(selected);
  };
</script>

<style lang="scss">
  @import '../../../styles/variables';

  :global(.modal-layout.portal-screen) {
    @media screen and (max-width: $mobile-max-width) {
      height: 200%;
    }

    @media screen and (min-width: $desktop-min-width) {
      max-width: unset;
      height: 100%;
      margin-left: 15px;
      margin-right: 15px;
    }
  }

  :global(.modal-layout.portal-screen .modal-layout--area) {
    padding-top: 0 !important;
  }

  :global(.modal-layout.portal-screen .modal-layout--content) {
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  :global(.modal-layout.portal-screen .modal-layout--footer) {
    position: relative;
    flex: unset !important;
    height: 124px;
    padding: 18px 36px 6px !important;
  }

  :global(.modal-layout.portal-screen .modal-layout--buttons) {
    position: absolute !important;
    // top: unset !important;
    // bottom: 0;
    z-index: 999;
    margin: 6px 2px 14px 0 !important;
  }

  :global(.modal-layout.portal-screen .modal-layout--footer > div) {
    height: 100%;
  }

  :global(.modal-layout.portal-screen .leaflet-top.leaflet-right) {
    top: 42px;
  }

  .flex {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-width: 175px;
    max-width: 300px;
    height: 100%;
    margin: 0 auto;
    text-align: center;

    & > * {
      padding-bottom: 8px;

      &:last-child {
        padding-bottom: 0;
      }
    }
  }

  .error {
    padding-top: 4px;
    color: $color-highlight;
    font-weight: 700;
    text-align: center;
  }
</style>

<ModalLayout class="portal-screen">
  <div slot="content">
    <MiniMap id="portal-map" allowRefocus="{false}" enabled="{!loading}" {floor} teleportsOverlay {onTeleportChange} />
  </div>

  <div slot="footer">
    <div class="flex">
      {#if floors.length >= 1}
        <div>
          {#if selected}
            <BoxButton
              type="wide full"
              isDisabled="{loading || $characterBalances.coins < cost}"
              {onClick}
              loadingText="Teleporting..."
            >
              {#if $characterBalances.coins >= cost}
                Go to {formatCoordinates(selected, 2)} for {cost} {pluralize('coin', cost)}
              {:else}Not enough coins{/if}
            </BoxButton>
            {#if error}
              <p class="error">{error}</p>
            {/if}
          {/if}
        </div>

        <div>
          {#if !selected}
            <p>Select a floor:</p>
          {/if}
          <SelectBox
            type="wide"
            items="{floors}"
            value="{floor}"
            isDisabled="{loading}"
            onChange="{val => onFloorChange(val)}"
          />
        </div>
      {/if}
    </div>
  </div>
</ModalLayout>
