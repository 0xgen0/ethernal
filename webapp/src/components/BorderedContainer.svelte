<style lang="scss">
  @import '../styles/variables';

  .bordered-text-box {
    height: 100%;
    background: $color-dark;
  }

  .bordered-box {
    position: relative;
    padding: 0px;

    --border-box-spacing: -4px;
    --border-color: #{$color-grey};
    --border-length: 6px;

    &.bordered-img-box {
      --border-box-spacing: -2px;
      --border-color: #{rgba($color-btn-grey, 1)};
      --border-length: 8px;
    }

    & > div {
      height: 100%;
      line-height: 1em;
    }

    &:before,
    &:after,
    & > :last-child:before,
    & > :last-child:after {
      position: absolute;
      width: var(--border-length);
      height: var(--border-length);
      border-color: var(--border-color);
      border-style: solid;
      content: ' ';
    }
    &:before {
      top: var(--border-box-spacing);
      left: var(--border-box-spacing);
      border-width: 2px 0 0 2px;
    }
    &:after {
      top: var(--border-box-spacing);
      right: var(--border-box-spacing);
      border-width: 2px 2px 0 0;
    }
    & > :last-child:before {
      bottom: var(--border-box-spacing);
      right: var(--border-box-spacing);
      border-width: 0 2px 2px 0;
    }
    & > :last-child:after {
      bottom: var(--border-box-spacing);
      left: var(--border-box-spacing);
      border-width: 0 0 2px 2px;
    }
  }
</style>

<div class="bordered-box {$$props.class}">
  <div>
    <slot />
  </div>
</div>
