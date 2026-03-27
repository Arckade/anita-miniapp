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
    padding: 10px 12px;
    background: rgba(18, 18, 28, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: flex;
    gap: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    align-items: center;
    border-radius: 24px;
    margin: 0 6px 8px;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  }

  input {
    flex: 1;
    padding: 11px 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    outline: none;
    background: rgba(255, 255, 255, 0.06);
    color: #f0f0f8;
    font-size: 14.5px;
    transition: border-color 0.2s, background 0.2s;
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  input:focus {
    border-color: rgba(124, 58, 237, 0.55);
    background: rgba(255, 255, 255, 0.09);
  }

  .hybrid-button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, background-color 0.2s, box-shadow 0.2s;
    color: white;
    flex-shrink: 0;
  }

  .hybrid-button:active {
    transform: scale(0.93);
  }

  .hybrid-button:disabled {
    background-color: rgba(150,150,150,0.3);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .hybrid-button.is-mic {
    background: linear-gradient(135deg, #4a5568, #2d3748);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .hybrid-button.is-mic:active {
    background: linear-gradient(135deg, #c53030, #9b2c2c);
    transform: scale(1.08);
    box-shadow: 0 0 14px rgba(197, 48, 48, 0.5);
  }

  .hybrid-button.has-text {
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    box-shadow: 0 2px 10px rgba(124, 58, 237, 0.45);
  }

  .hybrid-button.has-text:hover {
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.6);
  }
</style>
