<script>
  import { menuOverlay } from 'stores/screen';

  import BoxButton from 'components/BoxButton';
  import IconMenu from 'assets/icons/menu_2x.png';
</script>

<style lang="scss">
  @import '../../styles/variables.scss';

  .tabs {
    height: $footer-height;
    background: $color-background;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .menu {
    padding-right: 12px;
    padding-left: 12px;
  }
  img {
    display: inline-block;
    width: 50%;
    height: auto;
    vertical-align: middle;
  }
</style>

<div class="tabs">
  <slot />

  <div class="menu hide-desktop">
    <BoxButton class="menu" type="secondary" onClick="{() => menuOverlay.toggle('menu')}">
      <img src="{IconMenu}" alt="menu" />
    </BoxButton>
  </div>
</div>
