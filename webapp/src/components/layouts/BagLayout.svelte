<script>
  import { menuOverlay } from 'stores/screen';

  import ContentLayout from 'components/layouts/ContentLayout';
  import Tabs from 'components/bag/Tabs';
  import Tab from 'components/bag/Tab';

  import IconBag from 'assets/icons/bag_s_2x.png';
  import IconEquip from 'assets/icons/equip_s_2x.png';
  import IconVault from 'assets/icons/vault_s_2x.png';

  $: showTabs = ['bag', 'slots', 'vault'].includes($menuOverlay.screen);
</script>

<ContentLayout class="with-footer-tabs {$$props.class || ''}">
  <div slot="header">
    <slot name="header" />
  </div>

  <div slot="content" class="as-centered-row">
    <slot name="content" />
  </div>

  <div slot="footer">
    {#if showTabs}
      <Tabs>
        <Tab store={menuOverlay} tab="bag">
          <img slot="icon" src="{IconBag}" alt="Bag" />
          Bag
        </Tab>
        <Tab store={menuOverlay} tab="slots" icon="{IconEquip}">
          <img slot="icon" src="{IconEquip}" alt="Equip" />
          Equip
        </Tab>
        <Tab store={menuOverlay} tab="vault" icon="{IconVault}">
          <img slot="icon" src="{IconVault}" alt="Vault" />
          Vault
        </Tab>
      </Tabs>
    {/if}
  </div>
</ContentLayout>
