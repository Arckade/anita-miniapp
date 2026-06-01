<script>
  // Importiamo l'istanza singleton
  import { chatStore } from '$lib/stores.svelte';

  let { onclose } = $props();

  let selectedNativeLanguage = $state(chatStore.nativeLanguage || 'it');
  let selectedTargetLanguage = $state(chatStore.targetLanguage || 'en');
  let isLoading = $state(true);
  let isSaving = $state(false);
  let errorMessage = $state('');
  let availableLanguages = $state([]);

  function closeModal() {
    onclose?.();
  }

  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    };
  }

  function selectNative(lang) {
    selectedNativeLanguage = lang;
    errorMessage = '';
  }

  function selectTarget(lang) {
    selectedTargetLanguage = lang;
    errorMessage = '';
  }

  async function fetchLanguages() {
    isLoading = true;
    errorMessage = '';

    try {
      const data = await chatStore.loadLanguageSettings();
      selectedNativeLanguage = data.native_language || selectedNativeLanguage;
      selectedTargetLanguage = data.target_language || selectedTargetLanguage;
    } catch (error) {
      console.error('Errore caricamento lingue:', error);
      selectedNativeLanguage = chatStore.nativeLanguage || selectedNativeLanguage;
      selectedTargetLanguage = chatStore.targetLanguage || selectedTargetLanguage;
      errorMessage = chatStore.language === 'en'
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
      await chatStore.saveLanguageSettings(selectedNativeLanguage, selectedTargetLanguage);
      closeModal();
    } catch (error) {
      console.error('Errore salvataggio lingue:', error);
      errorMessage = chatStore.language === 'en'
        ? `Unable to save languages. ${error.message}`
        : `Impossibile salvare le lingue. ${error.message}`;
    } finally {
      isSaving = false;
    }
  }

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    chatStore.loadSupportedLanguages().then(data => {
      availableLanguages = data;
    });
    
    fetchLanguages();

    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  });
</script>

<div class="modal-overlay" use:portal role="button" tabindex="0" onclick={closeModal} onkeydown={(e) => e.key === 'Enter' && closeModal()}>
  <div class="language-modal" role="dialog" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Escape') closeModal(); }}>
    <div class="modal-header">
      <!-- Usiamo chatStore.language -->
      <h2>{chatStore.language === 'en' ? 'Select Languages' : 'Seleziona Lingue'}</h2>
      <button type="button" class="close-button" onclick={closeModal}>✕</button>
    </div>

    {#if isLoading}
      <div class="settings-loading">
        {chatStore.language === 'en' ? 'Loading current language settings...' : 'Caricamento impostazioni lingua...'}
      </div>
    {:else}
      <div class="language-columns">
        <div class="language-section">
          <h3>{chatStore.language === 'en' ? 'Mother Language' : 'Lingua Madre'}</h3>
          <div class="language-list">
            {#each availableLanguages as item}
              <button
                type="button"
                class="lang-button {item.code === selectedNativeLanguage ? 'active' : ''}"
                onclick={() => selectNative(item.code)}
                disabled={isSaving}
              >
                {item.translated}
              </button>
            {/each}
          </div>
        </div>

        <div class="language-section">
          <h3>{chatStore.language === 'en' ? 'Language to Learn' : 'Lingua da Imparare'}</h3>
          <div class="language-list">
            {#each availableLanguages as item}
              <button
                type="button"
                class="lang-button {item.code === selectedTargetLanguage ? 'active' : ''}"
                onclick={() => selectTarget(item.code)}
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
        <button type="button" class="cancel-button" onclick={closeModal} disabled={isSaving}>
          {chatStore.language === 'en' ? 'Cancel' : 'Annulla'}
        </button>
        <button type="button" class="save-button" onclick={saveLanguages} disabled={isSaving}>
          {isSaving
            ? (chatStore.language === 'en' ? 'Saving...' : 'Salvataggio...')
            : (chatStore.language === 'en' ? 'Save' : 'Salva')}
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