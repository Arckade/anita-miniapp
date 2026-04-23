<script>
  import { onMount } from 'svelte';

  // Props invece di events (più moderno, compatibile Svelte 5)
  export let language;
  export let isLoading;
  export let isRecording;
  export let onSendMessage;
  export let onStartRecording;
  export let onStopRecording;

  let nuovoMessaggio = "";
  let inputEl;

  function submitMessage() {
    if (!nuovoMessaggio.trim() || isLoading) return;
    onSendMessage?.(nuovoMessaggio.trim());
    nuovoMessaggio = "";
  }

  function handleMicPress(e) {
    if (nuovoMessaggio.trim() || isLoading) return;
    if (e.cancelable) e.preventDefault();
    onStartRecording?.();
  }

  function handleMicRelease() {
    if (isRecording) {
      onStopRecording?.();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (nuovoMessaggio.trim()) {
        submitMessage();
      } else if (!isRecording && !isLoading) {
        onStartRecording?.();
      }
    }
  }

  function handleKeyUp(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isRecording) {
        onStopRecording?.();
      }
    }
  }

  onMount(() => {
    inputEl?.addEventListener('keydown', handleKeyDown);
    inputEl?.addEventListener('keyup', handleKeyUp);

    return () => {
      inputEl?.removeEventListener('keydown', handleKeyDown);
      inputEl?.removeEventListener('keyup', handleKeyUp);
    };
  });
</script>

<form class="px-3.5 py-2.5 mx-3 my-2 mb-3 bg-gray-700/55 backdrop-blur-md flex gap-2.5 rounded-full border border-white/15 items-center shadow-2xl" on:submit|preventDefault={submitMessage}>
  <slot name="settings"></slot>

  <input
    type="text"
    bind:this={inputEl}
    placeholder={language === 'en' ? 'Write a message...' : 'Scrivi un messaggio...'}
    bind:value={nuovoMessaggio}
    disabled={isLoading}
    class="flex-1 px-4 py-2.5 rounded-2xl border-2 border-transparent outline-none bg-gray-800/55 text-white text-base transition-all duration-200 placeholder-gray-500 focus:border-gray-400 focus:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
  />

  <button
    type="button"
    class="w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center text-white transition-all duration-200 flex-shrink-0 {nuovoMessaggio.trim() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-900 hover:bg-purple-800'} {isRecording ? 'bg-red-700 animate-pulse' : ''} active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
    disabled={isLoading}
    on:click={submitMessage}
    on:mousedown={handleMicPress}
    on:touchstart={handleMicPress}
    on:mouseup={handleMicRelease}
    on:touchend={handleMicRelease}
    on:mouseleave={handleMicRelease}
    aria-label={isRecording ? 'Release to send' : (nuovoMessaggio.trim() ? 'Send message' : 'Hold to record')}
  >
    {#if isRecording}
      <!-- Icona stop durante la registrazione -->
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
    {:else if nuovoMessaggio.trim()}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    {/if}
  </button>
</form>