<script>
  import LanguageModal from './LanguageModal.svelte';
  import { chatStore } from '$lib/stores.svelte';
  import { countryForLanguage } from '$lib/utils.js';

  function getLanguageCountry(code) {
    const lang = String(code || '').split(/[-_]/)[0].toLowerCase();
    const country = countryForLanguage(lang);
    if (country) return country.toLowerCase();
    return lang || '';
  }

  function getNativeCountry() {
    return getLanguageCountry(chatStore.nativeLanguage) || 'it';
  }

  function getTargetCountry() {
    return getLanguageCountry(chatStore.targetLanguage) || 'us';
  }

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
    <button
      type="button"
      class="icon-btn language-btn"
      onclick={openLanguageModal}
      aria-label={language === 'en' ? 'Language to learn' : 'Lingua da imparare'}
      title={language === 'en' ? 'Language to learn' : 'Lingua da imparare'}
    >
      <span class="flag" aria-hidden="true">🌎</span>
    </button>

    <button type="button" class="icon-btn teach-btn" onclick={toggleTeachingMethod} aria-pressed={teachingMethodActive} aria-label="Metodo di insegnamento">
      <span class="flag" aria-hidden="true">🎓</span>
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

      <div class="audio-group" role="group" aria-label={language === 'en' ? 'Audio controls' : 'Controlli audio'}>
        <button
          type="button"
          class="audio-btn native-btn {isRecording ? 'recording' : ''}"
          disabled={isLoading}
          onclick={submitMessage}
          onmousedown={handleMicPress}
          ontouchstart={handleMicPress}
          onmouseup={handleMicRelease}
          ontouchend={handleMicRelease}
          onmouseleave={handleMicRelease}
          aria-label={isRecording ? (language === 'en' ? 'Release to stop recording' : 'Rilascia per fermare la registrazione') : (nuovoMessaggio.trim() ? (language === 'en' ? 'Send message' : 'Invia messaggio') : (language === 'en' ? 'Hold to record native audio' : 'Tieni premuto per registrare in lingua madre'))}
        >
          {#if nuovoMessaggio.trim()}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          {:else if isRecording}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          {:else}
            <span class={"fi fi-" + getNativeCountry() + " native-flag"} aria-hidden="true"></span>
          {/if}
        
        </button>

        <div class="audio-center" aria-hidden="true">
          <svg class="center-mic" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          </svg>
        </div>

        <button
          type="button"
          class="audio-btn target-btn"
          disabled={isLoading}
          onmousedown={handleMicPress}
          ontouchstart={handleMicPress}
          onmouseup={handleMicRelease}
          ontouchend={handleMicRelease}
          onmouseleave={handleMicRelease}
          aria-label={language === 'en' ? 'Hold to record target language audio' : 'Tieni premuto per registrare nella lingua da imparare'}
          title={language === 'en' ? 'Record target language' : 'Registra lingua da imparare'}
        >
          <span class={"fi fi-" + getTargetCountry() + " target-flag"} aria-hidden="true"></span>
        
        </button>
      </div>
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
    border: 1.5px solid rgba(255, 255, 255, 0.5);
    cursor: pointer;
    color: white;
    transition: border-color 0.2s;
  }

  .icon-btn:hover {
    border-color: rgba(255, 255, 255, 0.8);
  }

  .language-btn .flag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.6em;
    height: 1.6em;
    font-size: 20px;
    line-height: 1;
    font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', 'Android Emoji', sans-serif;
    text-rendering: optimizeLegibility;
    filter: grayscale(1) contrast(1.8);
  }

  .audio-btn {
    width: 44px;
    height: 44px;
    border-radius: 9999px;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
    color: white;
    cursor: pointer;
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  .audio-btn:hover {
    transform: scale(1.03);
  }

  .native-btn {
    background-color: #0ea5e9;
  }

  .native-btn:hover {
    background-color: #0284c7;
  }

  .target-btn {
    background-color: #7c3aed;
    margin-left: 8px;
  }

  .target-btn:hover {
    background-color: #6d28d9;
  }

  .audio-btn.recording {
    background-color: #dc2626;
    animation: pulse-recording 1.2s infinite;
  }

  @keyframes pulse-recording {
    0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
    50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
  }

  .audio-btn .flag {
    font-size: 20px;
    line-height: 1;
    z-index: 1;
  }

  .audio-btn .mic-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 0.9;
    color: rgba(255, 255, 255, 0.95);
  }

  /* Group wrapper with single outline and center mic */
  .audio-group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 6px 6px;
    border-radius: 9999px;
    border: 2px solid rgba(255,255,255,0.12);
    background: transparent;
    position: relative;
  }

  .audio-center {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: transparent;
    color: white;
    flex-shrink: 0;
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
  }

  .audio-center .center-mic {
    opacity: 0.95;
  }

  .teach-btn[aria-pressed="false"] .flag {
    filter: grayscale(1) contrast(1.8);
  }

  .teach-btn[aria-pressed="true"] .flag {
    filter: none;
  }

  form {
    width: calc(100% - 1.5rem);
    max-width: calc(100% - 1.5rem);
    min-height: 56px;
    position: relative;
    z-index: 10;
    background: rgba(31, 41, 55, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-sizing: border-box;
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
