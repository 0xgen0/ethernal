<script>
  import wallet from 'stores/wallet';
  import BorderedContainer from 'components/BorderedContainer';
  import BoxButton from 'components/BoxButton';
  import WelcomeProfile from 'components/WelcomeProfile';

  import IconSkull from 'assets/skull-key-white.png';

  export let header;
  export let footer;
  export let text = false;
  export let subtext = false;
  export let askKey = false;
  export let signIn = false;
  export let helpPortis = false;
  export let btnText;
  export let btnPressed;
  export let btnDisabled;
</script>

<div class="default-screen">
  {#if header === 'logo'}
    <div class="default-screen--header--center">
      <div class="default-screen--header--center--logo">
        <img src="{IconSkull}" alt="Ethernal" />
      </div>
    </div>
  {/if}

  {#if header === 'profile'}
    <div class="default-screen--header">
      <WelcomeProfile />
    </div>
  {/if}

  {#if header === 'profile-usedKey'}
    <div class="default-screen--header">
      <WelcomeProfile />
    </div>
  {/if}

  <BorderedContainer>
    <div class="default-screen--body text-center">
      <div class="default-screen--body--middle">
        {#if text}
          <h5>{text}</h5>
        {:else}
          <slot />
        {/if}
        {#if subtext}
          <p class="subtext">{subtext}</p>
        {/if}
      </div>

      <div class="default-screen--body--bottom">
        {#if btnText}
          <BoxButton isDisabled="{btnDisabled}" type="wide full" onClick="{btnPressed}">{btnText}</BoxButton>
        {/if}

        {#if askKey}
          <p class="card">
            Get a claim key by tweeting
            <i>"open sesame"</i>
            to
            <a href="https://twitter.com/ethernalworld" target="_blank" rel="noopener nofollow">@EthernalWorld</a>
          </p>
        {/if}

        {#if signIn}
          <p class="sign-in">
            Already started?
            <BoxButton type="plain link" onClick="{() => wallet.useFirstChoice()}">Sign in to Portis</BoxButton>
          </p>
        {/if}

        {#if helpPortis}
          <p class="portis-help">
            <a href="https://www.portis.io" target="_blank" rel="noopener nofollow">What is Portis?</a>
          </p>
        {/if}
      </div>
    </div>
  </BorderedContainer>

  <div class="default-screen--footer">
    {#if footer === 'social'}
      <p>
        Follow
        <a href="https://twitter.com/ethernalworld" target="_blank" rel="noopener nofollow">@EthernalWorld</a>
        for updates
      </p>
    {/if}
  </div>
</div>
