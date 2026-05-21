<script>
  import LanguageModal from './LanguageModal.svelte';

  let {
    language,
    isLoading,
    isRecording,
    onSendMessage,
    onStartRecording,
    onStopRecording
  } = $props();

  let nuovoMessaggio = $state("");

  // UI state
  let showLanguageModal = $state(false);
  let teachingMethodActive = $state(false);
  let isTyping = $state(false);

  function openLanguageModal() {
    showLanguageModal = true;
  }

  function closeLanguageModal() {
    showLanguageModal = false;
  }

  function toggleTeachingMethod() {
    teachingMethodActive = !teachingMethodActive;
  }

  function submitMessage() {
    if (!nuovoMessaggio.trim() || isLoading) return;
    onSendMessage?.(nuovoMessaggio.trim());
    nuovoMessaggio = "";
    isTyping = false;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    submitMessage();
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

  function handleFocus() {
    isTyping = true;
  }

  function handleBlur() {
    // small timeout to allow clicks on buttons if needed
    setTimeout(() => { isTyping = false; }, 100);
  }
</script>

<form class="px-3.5 py-2.5 mx-3 my-2 mb-3 bg-gray-700/55 backdrop-blur-md flex gap-2.5 rounded-full border border-white/15 items-center shadow-2xl" class:typing={isTyping} onsubmit={handleFormSubmit}>
  <!-- Left buttons: Lingua, Metodo di insegnamento -->
  <div class="left-buttons" aria-hidden={isTyping}>
    <button type="button" class="icon-btn language-btn" onclick={openLanguageModal} aria-label="Lingua">
      <span class="flag">🇮🇹</span>
    </button>

    <button type="button" class="icon-btn teach-btn" onclick={toggleTeachingMethod} aria-pressed={teachingMethodActive} aria-label="Metodo di insegnamento">
      <!-- cappello da scolaro (simple svg) -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill={teachingMethodActive ? 'white' : 'gray'} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L1 7l11 5 9-4.09V17h2V7L12 2z" />
      </svg>
    </button>
  </div>

  <!-- Input centrale -->
  <input
    type="text"
    placeholder={language === 'en' ? 'Write a message...' : 'Scrivi un messaggio...'}
    bind:value={nuovoMessaggio}
    disabled={isLoading}
    onkeydown={handleKeyDown}
    onkeyup={handleKeyUp}
    onfocus={handleFocus}
    onblur={handleBlur}
    class="flex-1 min-w-0 px-4 py-2.5 rounded-2xl border-2 border-transparent outline-none bg-gray-800/55 text-white text-base transition-all duration-200 placeholder-gray-500 focus:border-gray-400 focus:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
  />

  <!-- Right buttons: registrazione (originale) e lingua madre (nuovo, viola) -->
  <div class="right-buttons" aria-hidden={isTyping}>
    <button
      type="button"
      class="w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center text-white transition-all duration-200 flex-shrink-0 {nuovoMessaggio.trim() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-sky-600 hover:bg-sky-700'} {isRecording ? 'bg-red-700 animate-pulse' : ''} active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isLoading}
      onclick={submitMessage}
      onmousedown={handleMicPress}
      ontouchstart={handleMicPress}
      onmouseup={handleMicRelease}
      ontouchend={handleMicRelease}
      onmouseleave={handleMicRelease}
      aria-label={isRecording ? 'Release to send' : (nuovoMessaggio.trim() ? 'Send message' : 'Hold to record')}
    >
      {#if isRecording}
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

    <!-- Pulsante aggiuntivo: Lingua madre (viola) -->
    <button type="button" class="w-11 h-11 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center text-white ml-2" aria-label="Lingua madre">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
      </svg>
    </button>
  </div>

  {#if showLanguageModal}
    <LanguageModal onclose={closeLanguageModal} />
  {/if}
</form>

<style>
  .left-buttons,
  .right-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: white;
  }

  .language-btn .flag {
    font-size: 18px;
  }

  form {
    width: 100%;
    min-height: 56px;
    position: relative;
    z-index: 10;
    background: rgba(31, 41, 55, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  /* Quando si scrive, nascondiamo i pulsanti laterali e l'input occupa tutta la barra */
  form.typing .left-buttons,
  form.typing .right-buttons {
    display: none;
  }

  form.typing input {
    flex: 1 1 100%;
    width: 100%;
  }
</style>
