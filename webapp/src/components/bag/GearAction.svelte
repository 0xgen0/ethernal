<script>
  import { targetText, typeText, targetLabels } from 'lib/mapper';
  import AttackIcon from 'assets/actions/action_icon3.png';
  import DefenseIcon from 'assets/actions/action_def_icon.png';

  export let action;
  export let noIcon = false;
  export let durability;

  const { bonus, value, count, type } = action;

  const icon = type === 'attack' ? AttackIcon : DefenseIcon;

  const valueText = ({ min, max }) => (min === max ? min : `${min}~${max}`);
</script>

<style lang="scss">
  @import '../../styles/variables';

  .flex {
    display: flex;
    text-align: start;
    align-items: flex-start;
  }
  .cols {
    flex-direction: row;
  }
  .action {
    font-size: 11px;
    padding-top: 2px;
    color: $color-darker-text;
    padding-right: 10px;
  }
  .icon {
    width: 32px;
    height: 32px;
    margin-right: 5px;
    background: $color-black;
    position: relative;
  }
  img {
    width: 15px;
    position: absolute;
    left: 2px;
    top: 2px;
  }
  .desc {
    text-transform: capitalize;
  }
  .attr {
    color: $color-even-darker-text;
  }
  .count {
    position: absolute;
    right: 3px;
    bottom: 0;
  }
  .red {
    color: $color-highlight;
  }
</style>

<div class="action flex cols">
  {#if !noIcon}
    <div class="icon">
      <img src="{icon}" alt="" />
      <span class="count">{count}</span>
    </div>
  {/if}
  
  <div>
    <div class="desc">{targetText(action)} {type}</div>

    {#if durability != null}
      <div class="desc">
        <span class="attr">DUR:</span>
        <span class:red="{durability <= 3}">{durability}</span>
      </div>
    {/if}

    <div class="flex cols">
      <div>
        <span class="attr">{targetLabels[type]}:</span>
        {valueText(bonus)}
      </div>
      <div style="padding-left: 10px">
        <span class="attr">{typeText(action)}:</span>
        {valueText(value)}
      </div>
    </div>
  </div>
</div>
