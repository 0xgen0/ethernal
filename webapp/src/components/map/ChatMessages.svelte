<script>
  import { onMount } from 'svelte';

  import { chatMessages, currentRoom } from 'lib/cache';

  export let maxMessages = 25;

  let ref;
  $: $chatMessages && chatMessages.read();

  const scrollToBottom = node => {
    // @TODO - Allow quick scroll, but only if was already approx at bottom
    return {
      duration: 100,
      tick: () => {
        if (node && node.parentNode.parentNode) {
          node.parentNode.parentNode.scrollTop = node.parentNode.parentNode.scrollHeight;
        }
      },
    };
  };

  // Format available messages and return last N
  let messages = [];
  let prevMsg;
  $: messages = $chatMessages.messages
    .map(m => m.content)
    .flat()
    .slice(-1 * maxMessages);

  // Scroll to bottom on mount
  onMount(() => {
    if (ref && ref.parentNode) {
      ref.parentNode.scrollTop = ref.parentNode.scrollHeight;
    }
  });
</script>

<style lang="scss">
  p {
    // span.content {
    //   filter: grayscale(1);
    // }

    &.private-message {
      font-style: italic;
      opacity: 0.72;
    }

    span.username {
      a {
        padding: 0 2px;
        text-decoration: underline;
      }

      &:before {
        content: '[';
      }
      &:after {
        content: ']:';
      }
    }
  }
</style>

<div bind:this="{ref}">
  <p>
    <strong>Room {$currentRoom.formattedCoordinates}) chat:</strong>
  </p>

  {#if messages.length === 0}
    <p>
      <em>No one has said anything since you’ve entered the room...</em>
    </p>
  {/if}

  <!-- SHOW ONLY LAST MESSAGES -->
  {#each messages as message (message.id)}
    <p in:scrollToBottom class:private-message="{message.isPrivate}">
      <span class="username">
        <a href="/character/{message.character.characterId}">
          <span>{message.character.characterName}</span>
        </a>
      </span>

      <!-- ALLOW HTML BY FORCE CONSTRUCTING -->
      {#if message.html}
        {#each message.html as part}
          {#if typeof part === 'string'}
            <!-- Regular text content, permit HTML -->
            {@html part}
          {:else}
            <!-- Special component -->
            <svelte:component this="{part.this}" {...part}>{part.content}</svelte:component>
          {/if}
        {/each}
      {:else}
        <!-- Regular text content -->
        <span class="content">{message.content}</span>
      {/if}
    </p>
  {/each}
</div>
