<script>
  import { menuOverlay } from 'stores/screen';

  import ContentLayout from 'components/layouts/ContentLayout';
  import Tabs from 'components/bag/Tabs';
  import Tab from 'components/bag/Tab';

  // import IconBag from 'assets/icons/bag_s_2x.png';
  // import IconEquip from 'assets/icons/equip_s_2x.png';
</script>

<ContentLayout class="with-footer-tabs {$$props.class || ''}">
  <div slot="header">
    <slot name="header" />
  </div>

  <div slot="content" class="as-centered-row">
    <slot name="content" />
  </div>

  <div slot="footer">
    <Tabs>
      <Tab store={menuOverlay} tab="dungeonKeeper">
        <!-- <img slot="icon" src="{IconBag}" alt="Bag" /> -->
        Manager
      </Tab>
      <Tab store={menuOverlay} tab="ownedRooms">
        <!-- <img slot="icon" src="{IconBag}" alt="Bag" /> -->
        My Rooms
      </Tab>
      <Tab store={menuOverlay} tab="dungeonKeeperShop">
        <!-- <img slot="icon" src="{IconBag}" alt="Bag" /> -->
        Add to Room
      </Tab>
    </Tabs>
  </div>
</ContentLayout>
