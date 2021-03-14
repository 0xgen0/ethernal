<script>
  import { mapOverlay } from 'stores/screen';

  import ContentLayout from 'components/layouts/ContentLayout';
  import Tabs from 'components/bag/Tabs';
  import Tab from 'components/bag/Tab';
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
      <Tab
        store="{mapOverlay}"
        tab="online"
        selected="{!['leaderboard', 'weeklyRanking'].includes($mapOverlay.screen)}"
      >
        Online
      </Tab>
      <Tab store="{mapOverlay}" tab="leaderboard">Hall of Fame</Tab>
      <Tab store="{mapOverlay}" tab="weeklyRanking">Weekly Ranking</Tab>
    </Tabs>
  </div>
</ContentLayout>
