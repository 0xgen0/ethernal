<script>
  export let percent = 50;
</script>

<style lang="scss">
  @import '../styles/variables';

  .bar {
    margin-left: 3px;
    display: flex;
    width: 10px;
    height: 38px;
    border: 1px solid $color-grey;
    border-radius: 1px;

    &.as-overlay {
      width: unset;
      height: unset;
      margin: 0;
      -moz-user-select: none;
      -webkit-user-select: none;
      user-select: none;
      pointer-events: none;
      border: none;
    }

    &--fill, &--fill-inverse {
      .as-overlay & {
        position: absolute;
        left: 0;
        right: 0;
        margin: 0;
      }
    }

    &--fill {
      margin: 1px;
      background: $color-light;
      width: 100%;
      align-self: flex-end;

      .as-overlay & {
        bottom: 0;
        background: rgba($color-btn-grey, 0.5)
      }
    }

    &--fill-inverse {
      display: none;

      .as-overlay & {
        display: block;
        top: 0;
        background: rgba($color-grey, 0.32);
        backdrop-filter: brightness(60%)
      }
    }
  }
</style>

<div class="bar {$$props.class}">
  <div class="bar--fill" style="height: {percent}%"></div>
  <div class="bar--fill-inverse" style="height: {100 - percent}%"></div>
</div>
