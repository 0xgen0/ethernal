<script>
    import Deck from "./Deck.svelte";
    import Stats from "./Stats.svelte";
    import Log from "./Log.svelte";
    import monsters from "./monsters.js";
    import config from "./config.js";
    import Duel from "../../backend/src/game/duel.js";

    let {player, targets} = config;
    let monsterList = Object.keys(monsters);
    let monster = monsters[monsterList[1]];
    let selected = {
        attack: null,
        defense: null
    };
    let log = [];
    let data = null;

    let duel = new Duel(player, monster);
    window.duel = duel;

    function attack() {
        const turn = duel
            .select("attacker", selected)
            .select("defender")
            .attack();
        console.log({turn, duel});
        player.stats = turn.resolution.attacker;
        monster.stats = turn.resolution.defender;
        player.attacks = duel.decks.attacker.attacks;
        player.defenses = duel.decks.attacker.defenses;
        monster.attacks = duel.decks.defender.attacks;
        monster.defenses = duel.decks.defender.defenses;
        log = log.concat({id: log.length, turn, resolution: turn.inflictions});
        window.log = log;
        selected = {
            attack: null,
            defense: null
        };
    }

    function charge() {
      selected.attack.charge = 1;
      attack();
    }
</script>

<main>
    <div class="cols">
        <div class="col">
            <h1>player</h1>
            <Stats bind:stats={player.stats}/>
        </div>
        <div class="col">
            <h1>monster</h1>
            <Stats bind:stats={monster.stats}/>
            <label>
                type
                <select bind:value={monster}>
									{#each monsterList as name}
                      <option value={monsters[name]}>
												{name}
                      </option>
									{/each}
                </select>
            </label>
        </div>
    </div>
    <div class="cols">
        <div class="col">
            <Deck type="attack" bind:cards={player.attacks} bind:selected={selected.attack}/>
        </div>
        <div class="col">
            <Deck type="defense" bind:cards={monster.defenses}/>
        </div>
    </div>
    <div class="cols">
        <div class="col">
            <Deck type="defense" bind:cards={player.defenses} bind:selected={selected.defense}/>
        </div>
        <div class="col">
            <Deck type="attack" bind:cards={monster.attacks}/>
        </div>
    </div>
    <p>
        attack: {(player.stats.attack ? player.stats.attack : 0) + (selected.attack ? selected.attack.bonus : 0)},
        defense: {(player.stats.defense ? player.stats.defense : 0) + (selected.defense ? selected.defense.bonus : 0)}
        <button disabled={!(selected.attack && selected.defense)} on:click={attack}>attack monster</button>
        <button disabled={!(selected.attack && selected.defense)} on:click={charge}>charge</button>
    </p>
    <Log log={log}/>
    <label>
        export
        <button on:click={() => data = JSON.stringify(log, null, 2)}>log</button>
        <button on:click={() => data = JSON.stringify(player, null, 2)}>player</button>
        <button on:click={() => data = JSON.stringify(monster, null, 2)}>monster</button>
    </label>
	{#if data !== null}
      <div>
          <label>
              <textarea>{data}</textarea>
          </label>
          <button on:click={() => data = null}>ok</button>
      </div>
	{/if}
</main>

<style>
    textarea {
        font-family: monospace;
        width: 400px;
        height: 400px;
    }
</style>
