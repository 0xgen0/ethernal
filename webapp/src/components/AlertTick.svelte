<style lang="scss">
  @import '../styles/variables';

  .alert {
    position: absolute;
    top: -2px;
    right: -4px;
    z-index: 5;
    display: block;
    min-width: 8px;
    max-width: 13px;
    height: 11px;
    padding: 0 1px 0 2px;
    font-family: $font-family;
    background-color: $color-highlight;
    text-align: center;
    line-height: 10px;
    border: 1px solid rgba($color-light, 0.8);
    border-radius: 2px;
    box-shadow: 0 0 0 1px $color-background;
  }
</style>

<span class="alert"></span>
