<script>
  import { dungeon } from 'stores/dungeon';
  import { currentRoom, currentCombat, characterCoordinates } from 'lib/cache';
  import { menuOverlay } from 'stores/screen';

  import ContentLayout from 'components/layouts/ContentLayout';
  import BoxButton from 'components/BoxButton';

  import IconClose from 'assets/close.png';

  $: privileged = $dungeon.cache && $dungeon.cache.privileged;
  $: if (!privileged) {
    menuOverlay.close();
  }

  let walker = {
    walking: $dungeon.cache.walker.walking,
    async start() {
      walker.walking = true;
      $dungeon.cache.walker.start('random');
    },
    async startExplorer() {
      walker.walking = true;
      $dungeon.cache.walker.start('east');
    },
    async startBfs() {
      walker.walking = true;
      $dungeon.cache.walker.start('bfs');
    },
    async stop() {
      walker.walking = false;
      $dungeon.cache.walker.stop();
    },
  };

  let kill = {
    character: '',
    async action() {
      console.log('killing', this);
      console.log(await $dungeon.cache.action('kill-character', this.character));
    },
  };

  let teleport = {
    character: $dungeon.cache.characterId,
    coordinates: '0,0',
    async action() {
      console.log('teleporting', this);
      console.log(await $dungeon.cache.action('teleport', this));
    },
  };

  let monster = {
    coordinates: $characterCoordinates,
    monsterId: null,
    async kill() {
      console.log('killing monster at', this);
      console.log(await $dungeon.cache.action('kill-monster', this.coordinates));
    },
    async spawn() {
      console.log('spawning monster at', this);
      console.log(await $dungeon.cache.action('spawn-monster', this));
    },
  };

  let npc = {
    coordinates: $characterCoordinates,
    async spawn() {
      console.log('spawning NPC at', this);
      console.log(await $dungeon.cache.action('spawn-npc', this));
    },
    async kill() {
      console.log('killing NPC at', this);
      console.log(await $dungeon.cache.action('kill-npc', this.coordinates));
    },
  };

  let chest = {
    coordinates: $characterCoordinates,
    async spawn() {
      console.log('spawning chest at', this);
      console.log(await $dungeon.cache.action('spawn-chest', this));
    }
  };

  let reload = {
    coordinates: $characterCoordinates,
    async action() {
      console.log('reloading room at', this);
      console.log(await $dungeon.cache.action('reload-room', this));
    },
  };

  let update = {
    character: $dungeon.cache.characterId,
    hpChange: 0,
    xpChange: 0,
    gear: null,
    keys: 0,
    coins: 0,
    fragments: 0,
    durabilityChange: 0,
    async action() {
      console.log('updating character', this);
      console.log(await $dungeon.cache.action('update-character', this));
    },
  };

  let quest = {
    character: $dungeon.cache.characterId,
    id: '',
    status: 'discovered',
    data: '',
    async action() {
      console.log('updating quest', this);
      console.log(await $dungeon.cache.action('update-quest', this));
    },
  };

  let combat = {
    coordinates: $characterCoordinates,
    data: JSON.stringify($currentCombat, null, 2),
    async action() {
      const combat = JSON.parse(this.data);
      if (combat.monster && combat.duels) {
        const result = await $dungeon.cache.action('update-combat', { coordinates: this.coordinates, combat });
        if (!result.success) {
          alert('cheat failed: ' + JSON.stringify(result));
          // eslint-disable-next-line no-console
          console.log(result);
        } else {
          window.location = '';
        }
      } else {
        alert('invalid format');
      }
    },
  };

  let roomIncome = {
    benefactor: $dungeon.player,
    coordinates: $characterCoordinates,
    coins: 0,
    fragments: 0,
    async action() {
      console.log('generating room income', this);
      console.log(await $dungeon.cache.action('generate-income', this));
    },
  };
</script>

<style lang="scss">
  .cheats-screen--content--block {
    padding-bottom: 24px;
    width: 300px;
    user-select: text;

    label {
      text-align: right;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
    }

    span {
      padding-right: 10px;
    }

    textarea {
      width: 100%;
      height: 550px;
    }
  }
</style>

<ContentLayout class="cheats-screen with-dark-bg">
  <div slot="header" class="text-center">
    <h1>Cheats</h1>
  </div>

  <div slot="content" class="cheats-screen--content as-centered text-center">
    <div class="cheats-screen--content--block">
      <label>
        <span>auto walk</span>
        <input bind:value="{walker.walking}" disabled />
      </label>
      {#if !walker.walking}
        <label>
          <BoxButton type="full" onClick="{walker.start.bind(walker)}">Random</BoxButton>
          <BoxButton type="full" onClick="{walker.startExplorer.bind(walker)}">Explorer</BoxButton>
          <BoxButton type="full" onClick="{walker.startBfs.bind(walker)}">BFS</BoxButton>
        </label>
      {:else}
        <BoxButton type="full" onClick="{walker.stop.bind(walker)}">Stop</BoxButton>
      {/if}
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>teleport</span>
        <input bind:value="{teleport.character}" />
      </label>
      <label>
        <span>to</span>
        <input bind:value="{teleport.coordinates}" />
      </label>
      <BoxButton type="full" loadingText="Teleporting..." onClick="{teleport.action.bind(teleport)}">
        Teleport
      </BoxButton>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>monster at</span>
        <input bind:value="{monster.coordinates}" />
      </label>
      <label>
        <span>id</span>
        <input bind:value="{monster.monsterId}" />
      </label>
      <label>
        <BoxButton type="full" loadingText="Spawning..." onClick="{monster.spawn.bind(monster)}">Spawn</BoxButton>
        <BoxButton type="full" loadingText="Killing..." onClick="{monster.kill.bind(monster)}">Kill</BoxButton>
      </label>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>npc at</span>
        <input bind:value="{npc.coordinates}" />
      </label>
      <label>
        <BoxButton type="full" loadingText="Spawning..." onClick="{npc.spawn.bind(npc)}">Spawn</BoxButton>
        <BoxButton type="full" loadingText="Killing..." onClick="{npc.kill.bind(npc)}">Kill</BoxButton>
      </label>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>chest at</span>
        <input bind:value="{chest.coordinates}" />
      </label>
      <label>
        <BoxButton type="full" loadingText="Spawning..." onClick="{chest.spawn.bind(chest)}">Spawn</BoxButton>
      </label>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>room at</span>
        <input bind:value="{reload.coordinates}" />
      </label>
      <BoxButton type="full" loadingText="Reloading..." onClick="{reload.action.bind(reload)}">Reload room</BoxButton>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>character</span>
        <input bind:value="{update.character}" />
      </label>
      <label>
        <span>give hp</span>
        <input type="number" bind:value="{update.hpChange}" />
      </label>
      <label>
        <span>give xp</span>
        <input type="number" bind:value="{update.xpChange}" />
      </label>
      <label>
        <span>give gear</span>
        <input bind:value="{update.gear}" />
      </label>
      <label>
        <span>give keys</span>
        <input type="number" bind:value="{update.keys}" />
      </label>
      <label>
        <span>give coins</span>
        <input type="number" bind:value="{update.coins}" />
      </label>
      <label>
        <span>give fragments</span>
        <input type="number" bind:value="{update.fragments}" />
      </label>
      <label>
        <span>give durability</span>
        <input type="number" bind:value="{update.durabilityChange}" />
      </label>
      <BoxButton type="full" loadingText="Updating..." onClick="{update.action.bind(update)}">
        Update character
      </BoxButton>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>character</span>
        <input bind:value="{quest.character}" />
      </label>
      <label>
        <span>quest</span>
        <input bind:value="{quest.id}" />
      </label>
      <label>
        <span>status</span>
        <input bind:value="{quest.status}" />
      </label>
      <label>
        <span>data</span>
        <input bind:value="{quest.data}" />
      </label>
      <BoxButton type="full" loadingText="Updating..." onClick="{quest.action.bind(quest)}">Update quest</BoxButton>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>character</span>
        <input bind:value="{kill.character}" />
      </label>
      <BoxButton type="full" loadingText="Killing..." onClick="{kill.action.bind(kill)}">Kill character</BoxButton>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>room</span>
        <input bind:value="{roomIncome.coordinates}" />
      </label>
      <label>
        <span>benefactor</span>
        <input bind:value="{roomIncome.benefactor}" />
      </label>
      <label>
        <span>coins</span>
        <input type="number" bind:value="{roomIncome.coins}" />
      </label>
      <label>
        <span>fragments</span>
        <input type="number" bind:value="{roomIncome.fragments}" />
      </label>
      <BoxButton type="full" loadingText="Generating..." onClick="{roomIncome.action.bind(roomIncome)}">
        Generate room income
      </BoxButton>
    </div>

    <div class="cheats-screen--content--block">
      <label>
        <span>combat at</span>
        <input bind:value="{combat.coordinates}" />
      </label>
      <label>
        <textarea bind:value="{combat.data}"></textarea>
      </label>
      <BoxButton type="full" loadingText="Updating..." onClick="{combat.action.bind(combat)}">Update combat</BoxButton>
    </div>
  </div>

  <div slot="footer" class="with-close-button">
    <BoxButton type="secondary" class="close" onClick="{() => menuOverlay.close()}">
      <img src="{IconClose}" alt="Close" />
    </BoxButton>
  </div>
</ContentLayout>
