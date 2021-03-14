<script>
  import { menuOverlay } from 'stores/screen';

  import ContentLayout from 'components/layouts/ContentLayout';
  import Tabs from 'components/bag/Tabs';
  import Tab from 'components/bag/Tab';

  import IconCharacter from 'assets/icons/character_4x.png';
  import IconQuest from 'assets/icons/quest_4x.png';
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
      <Tab store={menuOverlay} tab="character">
        <img slot="icon" src="{IconCharacter}" alt="Character" />
        Character
      </Tab>
      <Tab store={menuOverlay} tab="quests">
        <img slot="icon" src="{IconQuest}" alt="Quest" />
        Quest
      </Tab>
    </Tabs>
  </div>
</ContentLayout>
