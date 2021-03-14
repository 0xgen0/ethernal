<script>
    import { slide } from 'svelte/transition';
    export let log;
    function toMsg(target, value) {
        if(target === "health") return `hits for ${value} ${target}`;
        else return `reduces ${target} by ${value}`;
    }
    function parse({missed, inflicted}) {
        if (missed) {
            return "misses";
        } else {
            return Object.keys(inflicted).map(target => toMsg(target, inflicted[target])).join(' ');
        }
    }
</script>

<div>
    <ul>
        {#each log.reverse() as action,i (action.id)}
            <li transition:slide>
                player {parse(action.resolution.attacker)}, monster {parse(action.resolution.defender)}
            </li>
        {/each}
    </ul>
</div>

<style>
    li:first-child {
        font-weight: bold;
    }
</style>


