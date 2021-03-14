<script>
  import router from 'page';
  import { tick } from 'svelte';
  import { fade } from 'svelte/transition';

  import { characterStatus, mapLog, needFood } from 'lib/cache';
  import { gameOverlay, mapModal, mapOverlay, menuOverlay, notificationOverlay, isDesktop, isMobile } from 'stores/screen';

  import MapArea from 'components/map/MapArea';
  import MapButtons from 'components/map/MapButtons';
  import MapHeader from 'components/map/MapHeader';
  import MapText from 'components/map/MapText';
  import BoxPlayers from 'components/BoxPlayers';
  import MonsterOverlay from 'components/combat/MonsterOverlay';
  import NotificationOverlay from 'components/notifications/Overlay';

  // Page screens
  import BagScreen from 'screens/Game/BagScreen';
  import CharacterProfileScreen from 'screens/Game/CharacterProfileScreen';
  import CharacterStatsScreen from 'screens/Game/CharacterStatsScreen';
  import CheatsScreen from 'screens/Game/CheatsScreen';
  import DefenseSlotScreen from 'screens/Game/DefenseSlotScreen';
  import DungeonKeeperScreen from 'screens/Game/DungeonKeeperScreen';
  import DungeonKeeperShopScreen from 'screens/Game/DungeonKeeperShopScreen';
  import FoodScreen from 'screens/Game/FoodScreen';
  import GameOverScreen from 'screens/Game/GameOverScreen';
  import RebirthScreen from 'screens/Game/RebirthScreen';
  import RoomInfoScreen from 'screens/Game/RoomInfoScreen';
  import LeaderboardScreen from 'screens/Game/LeaderboardScreen';
  import LootScreen from 'screens/Game/LootScreen';
  import MenuScreen from 'screens/Game/MenuScreen';
  import OnlinePlayersScreen from 'screens/Game/OnlinePlayersScreen';
  import OwnedRoomsScreen from 'screens/Game/OwnedRoomsScreen';
  import QuestsScreen from 'screens/Game/QuestsScreen';
  import SlotsScreen from 'screens/Game/SlotsScreen';
  import VaultScreen from 'screens/Game/VaultScreen';
  import WeaponSlotScreen from 'screens/Game/WeaponSlotScreen';
  import WeeklyRankingScreen from 'screens/Game/WeeklyRankingScreen';

  // Map modals
  import CarrierRoomScreen from 'screens/Game/Modals/CarrierRoomScreen';
  import AddBountyScreen from 'screens/Game/Modals/AddBountyScreen';
  import CharacterEnteredScreen from 'screens/Game/Modals/CharacterEnteredScreen';
  import DiscoverRoomScreen from 'screens/Game/Modals/DiscoverRoomScreen';
  import HealScreen from 'screens/Game/Modals/HealScreen';
  import PortalScreen from 'screens/Game/Modals/PortalScreen';
  import QuestScreen from 'screens/Game/Modals/QuestScreen';
  import ScavengeScreen from 'screens/Game/Modals/ScavengeScreen';
  import TalkToNPCScreen from 'screens/Game/Modals/TalkToNPCScreen';
  import TradeBuyerScreen from 'screens/Game/Modals/TradeBuyerScreen';
  import TreasureChestScreen from 'screens/Game/Modals/TreasureChestScreen';

  import IconSkull from 'assets/skull-key-white.png';

  let monsterOverlayEnabled = true;
  export const toggleMonsterOverlay = () => {
    monsterOverlayEnabled = !monsterOverlayEnabled;
    if (global.map) {
      if (monsterOverlayEnabled) {
        global.map.stopMap();
      } else {
        global.map.startMap();
      }
    }
  };
  export const toggleMonsterOverlayForEscape = toggleMonsterOverlay; // @TODO: add move

  // Toggle food screen if player needs food
  $: if ($needFood) {
    setTimeout(async () => {
      await tick();
      menuOverlay.open('food');
    }, 3500);
  }

  /**
   * VISUAL UI HANDLERS
   */
  $: gameOverlayScreens = {
    addBounty: { this: AddBountyScreen },
  }
  $: menuOverlayScreens = {
    bag: { this: BagScreen },
    character: { this: CharacterStatsScreen },
    cheats: { this: CheatsScreen },
    defenseSlot: { this: DefenseSlotScreen },
    dungeonKeeper: { this: DungeonKeeperScreen },
    dungeonKeeperShop: { this: DungeonKeeperShopScreen },
    food: { this: FoodScreen, important: true },
    gameOver: { this: GameOverScreen },
    menu: { this: MenuScreen },
    ownedRooms: { this: OwnedRoomsScreen },
    profile: { this: CharacterProfileScreen },
    quests: { this: QuestsScreen },
    rebirth: { this: RebirthScreen },
    roomInfo: { this: RoomInfoScreen },
    slots: { this: SlotsScreen },
    vault: { this: VaultScreen },
    weaponSlot: { this: WeaponSlotScreen },

    // Only display online/leaderboard screens fullscreen on mobile
    online: $isMobile && { this: OnlinePlayersScreen },
    leaderboard: $isMobile && { this: LeaderboardScreen },
    weeklyRanking: $isMobile && { this: WeeklyRankingScreen },
  };
  $: menuPlayersScreens = {
    // Only display online/leaderboard screens sidebar on desktop
    online: $isDesktop && { this: OnlinePlayersScreen },
    leaderboard: $isDesktop && { this: LeaderboardScreen },
    weeklyRanking: $isDesktop && { this: WeeklyRankingScreen },
  };
  $: mapOverlayScreens = {
    loot: { this: LootScreen },
  };
  $: mapModalScreens = {
    carrierRoom: { this: CarrierRoomScreen },
    characterEntered: { this: CharacterEnteredScreen },
    discoverRoom: { this: DiscoverRoomScreen },
    heal: { this: HealScreen },
    scavenge: { this: ScavengeScreen },
    portal: { this: PortalScreen },
    quest: { this: QuestScreen },
    talkToNpc: { this: TalkToNPCScreen },
    tradeBuyer: { this: TradeBuyerScreen },
    treasureChest: { this: TreasureChestScreen },
  };

  // Listen for map area change
  $: gameOverlayScreen = $gameOverlay && gameOverlay.find(gameOverlayScreens);
  $: menuOverlayScreen =
    ($menuOverlay && menuOverlay.find(menuOverlayScreens)) || ($mapOverlay && mapOverlay.find(menuOverlayScreens));
  $: menuPlayersScreen = ($mapOverlay && mapOverlay.find(menuPlayersScreens)) || {
    ...menuPlayersScreens.online,
    screen: 'online',
  };
  $: mapOverlayScreen = $mapOverlay && mapOverlay.find(mapOverlayScreens);
  $: mapModalScreen = $mapModal && mapModal.find(mapModalScreens);

  // Determine monster overlay
  $: monsterOverlay =
    monsterOverlayEnabled &&
    ['blocked by monster', 'claiming rewards', 'just died', 'attacking monster'].includes($characterStatus) &&
    $menuOverlay.screen !== 'gameOver';
  $: showMonsterOverlay = monsterOverlay && !mapOverlayScreen;

  /**
   * AVAILABLE PUBLIC PAGE ROUTES
   */
  router('/food', () => menuOverlay.open('food'));
  router('/stats/leaderboard', () => mapOverlay.open('leaderboard'));
  router('/stats/weekly-ranking', () => mapOverlay.open('weeklyRanking'));
  router('/room/:coordinates', ({ params }) => {
    const { coordinates } = params;
    menuOverlay.open('roomInfo', { coordinates });
  });
  router('/keeper', () => menuOverlay.open('dungeonKeeper'));
  router('/keeper/manage', () => menuOverlay.open('dungeonKeeperShop'));
  router('/keeper/rooms', () => menuOverlay.open('ownedRooms'));
  router('/quests', () => menuOverlay.open('quests'));
  router('/character/:id', ({ params: { id } }) => menuOverlay.open('profile', { id }));
  router('/', () => {
    menuOverlay.close();
    mapOverlay.close();
  });
  router.start();
</script>

<div class="layout">
  <div class="layout--mast">
    <img src="{IconSkull}" alt="Ethernal" />
  </div>

  <div class="layout--container" class:monster-overlay="{monsterOverlay}">
    <!-- Map header with explorer info. On desktop, this includes map buttons. -->
    <div class="layout--header">
      {#if $isMobile}
        <NotificationOverlay />
      {/if}

      <MapHeader />

      {#if $isDesktop}
        <MapButtons monsterOverlay="{showMonsterOverlay}" {toggleMonsterOverlay} />
      {/if}
    </div>

    <div class="layout--area">
      {#if gameOverlayScreen}
        <div class="layout--area--map--overlay as-game-overlay">
          <svelte:component this="{gameOverlayScreen.this}" {...gameOverlayScreen} />
        </div>
      {/if}

      <div class="layout--area--menu">
        <!-- Display menu page overlay, e.g. Bag. On mobile, this is fullscreen. -->
        {#if menuOverlayScreen}
          <div
            class="layout--area--menu--overlay {menuOverlayScreen.important ? 'as-important' : ''}"
            transition:fade="{{ duration: 200 }}"
          >
            <svelte:component this="{menuOverlayScreen.this}" {...menuOverlayScreen} />
          </div>
        {/if}

        <!-- Map text -->
        <div class="layout--area--menu--item">
          <MapText lines="{$mapLog}" />
        </div>

        <!-- Desktop online players menu -->
        {#if menuPlayersScreen}
          <div class="layout--area--menu--item">
            <svelte:component this="{menuPlayersScreen.this}" {...menuPlayersScreen} class="online-players--desktop" />
          </div>
        {/if}
      </div>

      <div class="layout--area--map">
        {#if $isDesktop}
          <NotificationOverlay />
        {/if}

        <!-- Display map overlay screen, e.g. loot. On mobile, this is fullscreen. -->
        {#if mapOverlayScreen}
          <div class="layout--area--map--overlay">
            <svelte:component this="{mapOverlayScreen.this}" {...mapOverlayScreen} />
          </div>
        {/if}

        <!-- Display map modals, e.g. healing. -->
        {#if mapModalScreen && !monsterOverlay}
          <div class="layout--area--map--modal">
            <svelte:component this="{mapModalScreen.this}" {...mapModalScreen} />
          </div>
        {/if}

        <!-- PIXI map canvas and map footer -->
        <MapArea hidden="{!!monsterOverlay}" />

        <!-- Monster overlay screen -->
        <MonsterOverlay hidden="{!monsterOverlay}" {toggleMonsterOverlayForEscape} />
      </div>
    </div>

    <!-- Mobile footer with map buttons and online players -->
    <div class="layout--footer">
      {#if $isMobile}
        <BoxPlayers />
        <MapButtons monsterOverlay="{showMonsterOverlay}" {toggleMonsterOverlay} />
      {/if}
    </div>
  </div>
</div>
