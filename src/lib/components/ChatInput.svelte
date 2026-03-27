<script>
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let language;
  export let isLoading;
  export let isRecording;

  const dispatch = createEventDispatcher();
  let nuovoMessaggio = "";

  function handleButtonClick() {
    if (nuovoMessaggio.trim()) {
      dispatch('sendMessage', nuovoMessaggio);
      nuovoMessaggio = "";
    }
  }

  function handleButtonPress(e) {
    if (!nuovoMessaggio.trim() && !isLoading) {
      if(e.cancelable) e.preventDefault(); 
      dispatch('startRecording');
    }
  }

  function handleButtonRelease() {
    if (isRecording) {
      dispatch('stopRecording');
    }
  }

  onMount(() => {
    function down(e) {
      if (e.key === 'Enter') {
        if (!nuovoMessaggio.trim() && !isRecording && !isLoading) {
             e.preventDefault();
             dispatch('startRecording');
        }
      }
    }

    function up(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isRecording) {
          dispatch('stopRecording');
        } else if (nuovoMessaggio.trim()) {
          dispatch('sendMessage', nuovoMessaggio);
          nuovoMessaggio = "";
        }
      }
    }

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });
</script>

<form on:submit|preventDefault>
  <slot name="settings"></slot>

  <input
    type="text"
    placeholder={language === 'en' ? 'Write a message...' : 'Scrivi un messaggio...'}
    bind:value={nuovoMessaggio}
    disabled={isLoading}
  />

  <!-- PULSANTE UNIFICATO -->
  <button
    type="button"
    class="hybrid-button {nuovoMessaggio.trim() ? 'has-text' : 'is-mic'}"
    disabled={isLoading}
    on:click={handleButtonClick}
    on:mousedown={handleButtonPress}
    on:touchstart={handleButtonPress}
    on:mouseup={handleButtonRelease}
    on:touchend={handleButtonRelease}
    on:mouseleave={handleButtonRelease}
    aria-label={nuovoMessaggio.trim() ? "Send message" : "Hold to record"}
  >
    {#if nuovoMessaggio.trim()}
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
    padding: 10px;
    background-color: #2a2a2a;
    display: flex;
    gap: 10px;
    border-top: 1px solid #444;
    align-items: center;
    border-radius: 20px;
  }

  input {
    flex: 1;
    padding: 12px 15px;
    border-radius: 20px;
    border: none;
    outline: none;
    background-color: #3a3a3a;
    color: #ffffff;
  }

  .hybrid-button {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s, background-color 0.2s;
    color: white;
  }

  .hybrid-button:active {
    transform: scale(0.95);
  }

  .hybrid-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .hybrid-button.is-mic {
    background-color: #54656f;
  }
  .hybrid-button.is-mic:active {
    background-color: #b91c1c;
    transform: scale(1.1);
  }

  .hybrid-button.has-text {
    background-color: #008069;
  }
</style>
