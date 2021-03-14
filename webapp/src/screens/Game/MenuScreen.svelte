<script>
  import { dungeon } from 'stores/dungeon';
  import { menuOverlay } from 'stores/screen';

  import ContentLayout from 'components/layouts/ContentLayout';
  import BoxButton from 'components/BoxButton';

  import IconClose from 'assets/close.png';
  import IconKey from 'assets/skull-key-white.png';
  import IconDiscord from 'assets/icons/discord_4x.png';

  $: privileged = $dungeon.cache && $dungeon.cache.privileged;
</script>

<style lang="scss">
  @import '../../styles/variables.scss';

  .close {
    @media screen and (min-width: $desktop-min-width) {
      display: none;
    }
  }

  a {
    text-decoration: underline;
    transition: opacity 0.12s ease-out;

    &:hover,
    &:focus {
      opacity: 0.82;
    }
  }
</style>

<ContentLayout class="with-dark-bg">
  <div slot="content" class="text-center as-space-around">
    <div>
      <h1>Ethernal</h1>
      <h2 class="selectable">Alpha {window.commit}</h2>
      <p>We love feedback and questions. Tell us on Discord. And help us spread the word on Twitter.</p>
    </div>

    <div>
      <p>
        Join our
        <a target="_blank" href="https://discord.gg/ygtFHU2" rel="noopener nofollow">Discord</a>
      </p>
      <p>
        Follow us on
        <a target="_blank" href="https://twitter.com/EthernalWorld" rel="noopener nofollow">@EthernalWorld</a>
      </p>
      <p>
        <a target="_blank" href="https://ethernal.world" rel="noopener nofollow">ethernal.world</a>
      </p>
    </div>
  </div>

  <div slot="footer" class="with-close-button">
    <div>
      {#if privileged}
        <BoxButton type="secondary" class="cheats" onClick="{() => menuOverlay.toggle('cheats')}">
          <img src="{IconKey}" alt="cheats" />
        </BoxButton>
      {/if}
      <a class="btn secondary" href="https://discord.gg/EwqKJVd" target="_blank" rel="noopener nofollow">
        <img src={IconDiscord} alt="discord" />
      </a>
    </div>
    <div class="close">
      <BoxButton type="secondary" onClick="{() => menuOverlay.close()}">
        <img src="{IconClose}" alt="Close" />
      </BoxButton>
    </div>
  </div>
</ContentLayout>
