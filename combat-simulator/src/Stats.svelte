<script>
    export let stats;
</script>

<div>
    <div class="stats cols">
        <div>
            <label>health: <input type=number bind:value={stats.health} /></label>
            <label>attack: <input type=number bind:value={stats.attack} /></label>
            <label>charge: <input type=number bind:value={stats.charge} /></label>
        </div>
        <div>
            <label>defense: <input type=number bind:value={stats.defense} /></label>
            <label>protection: <input type=number bind:value={stats.protection} /></label>
            <label>damage: <input type=number bind:value={stats.damage} /></label>
        </div>
    </div>
</div>

<style>
    .stats {
        justify-content: left;
    }
    input {
        width: 70px;
    }
    label {
        padding-right: 1em;
    }
</style>


