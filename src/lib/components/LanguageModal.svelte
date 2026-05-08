<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { language, loadLanguageSettings, loadSupportedLanguages, saveLanguageSettings } from '$lib/stores.js';

  const dispatch = createEventDispatcher();
  let selectedNativeLanguage = 'it';
  let selectedTargetLanguage = 'en';
  let isLoading = true;
  let isSaving = false;
  let errorMessage = '';

  let availableLanguages = [];

  function closeModal() {
    dispatch('close');
  }

  // --- PORTAL: sposta il nodo nel body, fuori da ogni parent ---
  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    };
  }

  async function selectNative(lang) {
    const previousNative = selectedNativeLanguage;
    selectedNativeLanguage = lang;
    errorMessage = '';
    isSaving = true;

    try {
      await saveLanguageSettings(selectedNativeLanguage, selectedTargetLanguage);
    } catch (error) {
      selectedNativeLanguage = previousNative;
      console.error('Errore salvataggio lingua madre:', error);
      errorMessage = $language === 'en'
        ? `Unable to save native language. ${error.message}`
        : `Impossibile salvare la lingua madre. ${error.message}`;
    } finally {
      isSaving = false;
    }
  }

  async function selectTarget(lang) {
    const previousTarget = selectedTargetLanguage;
    selectedTargetLanguage = lang;
    errorMessage = '';
    isSaving = true;

    try {
      await saveLanguageSettings(selectedNativeLanguage, selectedTargetLanguage);
    } catch (error) {
      selectedTargetLanguage = previousTarget; 
      console.error('Errore salvataggio lingua da imparare:', error);
      errorMessage = $language === 'en'
        ? `Unable to save target language. ${error.message}`
        : `Impossibile salvare la lingua da imparare. ${error.message}`;
    } finally {
      isSaving = false;
    }
  }

  async function fetchLanguages() {
    isLoading = true;
    errorMessage = '';

    try {
      const data = await loadLanguageSettings();
      selectedNativeLanguage = data.native_language || selectedNativeLanguage;
      selectedTargetLanguage = data.target_language || selectedTargetLanguage;
    } catch (error) {
      console.error('Errore caricamento lingue:', error);
      errorMessage = $language === 'en'
        ? 'Unable to load current languages.'
        : 'Impossibile caricare le lingue correnti.';
    } finally {
      isLoading = false;
    }
  }

  async function saveLanguages() {
    isSaving = true;
    errorMessage = '';

    try {
      await saveLanguageSettings(selectedNativeLanguage, selectedTargetLanguage);
      closeModal();
    } catch (error) {
      console.error('Errore salvataggio lingue:', error);
      errorMessage = $language === 'en'
        ? `Unable to save languages. ${error.message}`
        : `Impossibile salvare le lingue. ${error.message}`;
    } finally {
      isSaving = false;
    }
  }

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }

  onMount(async () => {
    availableLanguages = await loadSupportedLanguages();
    console.log('Lingue disponibili:', availableLanguages);
    await fetchLanguages();
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

<div class="modal-overlay" use:portal role="button" tabindex="0" on:click={closeModal} on:keydown={(e) => e.key === 'Enter' && closeModal()}>
  <div class="language-modal" role="dialog" tabindex="0" on:click|stopPropagation on:keydown|stopPropagation={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-header">
      <h2>{$language === 'en' ? 'Select Languages' : 'Seleziona Lingue'}</h2>
      <button type="button" class="close-button" on:click={closeModal}>✕</button>
    </div>

    {#if isLoading}
      <div class="settings-loading">
        {$language === 'en' ? 'Loading current language settings...' : 'Caricamento impostazioni lingua...'}
      </div>
    {:else}
      <div class="language-columns">
        <div class="language-section">
          <h3>{$language === 'en' ? 'Mother Language' : 'Lingua Madre'}</h3>
          <div class="language-list">
            {#each availableLanguages as item}
              <button
                type="button"
                class="lang-button {item.code === selectedNativeLanguage ? 'active' : ''}"
                on:click={() => selectNative(item.code)}
                disabled={isSaving}
              >
                {item.translated}
              </button>
            {/each}
          </div>
        </div>

        <div class="language-section">
          <h3>{$language === 'en' ? 'Language to Learn' : 'Lingua da Imparare'}</h3>
          <div class="language-list">
            {#each availableLanguages as item}
              <button
                type="button"
                class="lang-button {item.code === selectedTargetLanguage ? 'active' : ''}"
                on:click={() => selectTarget(item.code)}
                disabled={isSaving}
              >
                {item.translated}
              </button>
            {/each}
          </div>
        </div>
      </div>

      {#if errorMessage}
        <div class="error-message">{errorMessage}</div>
      {/if}

      <div class="modal-actions">
        <button type="button" class="cancel-button" on:click={closeModal} disabled={isSaving}>
          {$language === 'en' ? 'Cancel' : 'Annulla'}
        </button>
        <button type="button" class="save-button" on:click={saveLanguages} disabled={isSaving}>
          {isSaving
            ? ($language === 'en' ? 'Saving...' : 'Salvataggio...')
            : ($language === 'en' ? 'Save' : 'Salva')}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  }

  .language-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: min(90vw, 600px);
    max-width: 600px;
    min-width: 320px;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    flex-shrink: 0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
  }

  .close-button {
    background: transparent;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .language-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    gap: 0;
    overflow-y: auto;
  }

  .language-section {
    padding: 20px;
  }

  .language-section h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 16px;
  }

  .language-list {
    display: grid;
    gap: 10px;
  }

  .lang-button {
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    border: 1px solid #ddd;
    border-radius: 10px;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    color: #222;
  }

  .lang-button:hover,
  .lang-button:focus {
    border-color: #667eea;
    outline: none;
  }

  .lang-button.active {
    border-color: #667eea;
    background: #eef2ff;
  }

  .error-message {
    color: #a00;
    padding: 0 20px 10px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px 20px;
    background: #fafafa;
    flex-shrink: 0;
  }

  .cancel-button,
  .save-button {
    padding: 12px 18px;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    font-weight: 600;
  }

  .cancel-button {
    background: #f4f4f5;
    color: #111;
  }

  .save-button {
    background: #4f46e5;
    color: white;
  }

  .cancel-button:disabled,
  .save-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
