<script>
    import { slide, scale } from 'svelte/transition';
    import config from "./config.js"

    export let type;
    export let cards;
    export let selected = undefined;
    let targets = config.targets[type];
    let edit = false;
    let newCard = {bonus: 5, value: 3};
    function add() {
        cards = cards.concat({id: cards.length, ...newCard});
    }
    function remove(card) {
        cards = cards.filter(c => c.id !== card.id);
    }
    function select(card) {
        if (!card.used && selected !== undefined) {
            selected = card;
        }
    }
    function toggleEdit() {
        edit = !edit
    }
    function target(card) {
        return card.target || type === "attack" ? "damage" : "protection";
    }
</script>

<div>
    <h2 on:click={toggleEdit}>{type}</h2>
    <ul>
      {#each cards as card}
          <li transition:scale class={card.used ? "used" : selected && card.id === selected.id ? "selected" : ""}
              on:click={select(card)}>
              {#if edit}
                  <button class="x" on:click="{remove(card)}">x</button>
              {/if}
              + {card.bonus}, {card.target || (type === "attack" ? "health" : "protection")} {card.value}
          </li>
      {/each}
    </ul>
    {#if edit}
        <fieldset transition:slide>
            <legend>new card</legend>
            <label>
                bonus
                <input type=number bind:value={newCard.bonus} min=0 max=10>
            </label>
            <label>
                {type === "attack" ? "against" : "for"}
                <select bind:value={newCard.target}>
                    {#each targets as target}
                        <option value={target}>
                            {target}
                        </option>
                    {/each}
                </select>
            </label>
            <label>
                value
                <input type=number bind:value={newCard.value} min=0 max=10>
            </label>
            <label class="right">
                <button on:click="{add}">add</button>
                <button on:click="{toggleEdit}">cancel</button>
            </label>
        </fieldset>
    {/if}
</div>

<style>
    .selected {
        font-weight: bold;
    }
    .used {
        text-decoration: line-through;
        cursor: default;
    }
    ul {
        list-style-type: none;
    }
    h2, li {
        cursor: pointer;
    }
    fieldset {
        font-size: .8em;
    }
    .right {
        text-align: right;
    }
    .x {
        padding: 0;
        margin: 0;
    }
</style>



