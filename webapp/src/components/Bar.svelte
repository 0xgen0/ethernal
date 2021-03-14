<script>
  export let percent = 50;
</script>

<style lang="scss">
  @import '../styles/variables';

  .bar {
    margin-left: 3px;
    display: flex;
    width: 96px;
    height: 24px;
    border: 1px solid $color-grey;
    border-radius: 1px;

    &--fill {
      position: relative;
      margin: 1px;
      background: $color-light;
      height: 22px;
      width: 100%;
      align-self: flex-start;
    }
    &--text {
      position: absolute;
      top: 6px;
      line-height: 8px;
      left: 4px;
      font-size: 14px;
      mix-blend-mode: difference;
      color: white;
    }
  }
</style>

<div class="bar">
  <div class="bar--fill" style="width: {percent}%">
    <span class="bar--text">{percent}%</span>
  </div>
</div>
