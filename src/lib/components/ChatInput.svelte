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

<form on:submit|preventDefault={submitMessage}>
  <slot name="settings"></slot>

  <input
    type="text"
    bind:this={inputEl}
    placeholder={language === 'en' ? 'Write a message...' : 'Scrivi un messaggio...'}
    bind:value={nuovoMessaggio}
    disabled={isLoading}
  />

  <button
    type="button"
    class="hybrid-button {nuovoMessaggio.trim() ? 'has-text' : 'is-mic'} {isRecording ? 'recording' : ''}"
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

<style>
  form {
    padding: 10px 14px;
    margin: 8px 12px 12px;
    background-color: rgba(22, 7, 46, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    gap: 10px;
    border-radius: 30px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    align-items: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  input {
    flex: 1;
    padding: 10px 15px;
    border-radius: 20px;
    border: 2px solid transparent;
    outline: none;
    background-color: rgba(46, 46, 62, 0.55);
    color: #ffffff;
    font-size: 16px; /* Previenne zoom su iOS */
    transition: border-color 0.2s;
  }

  input:focus {
    border-color: #7c3aed;
    box-shadow: none;
  }

  input::placeholder {
    color: #888;
  }

  .hybrid-button {
    width: 45px;
    height: 45px;
    min-width: 45px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s, background-color 0.2s;
    color: white;
  }

  .hybrid-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .hybrid-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .hybrid-button.is-mic {
    background-color: #6b21a8;
  }

  .hybrid-button.is-mic:active:not(:disabled) {
    background-color: #b91c1c;
    transform: scale(1.1);
  }

  .hybrid-button.has-text {
    background-color: #7c3aed;
  }

  .hybrid-button.recording {
    background-color: #b91c1c;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
</style>