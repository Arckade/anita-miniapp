<script>
  // Importiamo l'istanza singleton
  import { chatStore } from '$lib/stores.svelte';

  let { onclose } = $props();

  let selectedNativeLanguage = $state('it');
  let selectedTargetLanguage = $state('en');
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

  async function selectNative(lang) {
    const previousNative = selectedNativeLanguage;
    selectedNativeLanguage = lang;
    errorMessage = '';
    isSaving = true;

    try {
      await chatStore.saveLanguageSettings(selectedNativeLanguage, selectedTargetLanguage);
    } catch (error) {
      selectedNativeLanguage = previousNative;
      console.error('Errore salvataggio lingua madre:', error);
      // Accediamo a chatStore.language invece di $language
      errorMessage = chatStore.language === 'en'
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
      await chatStore.saveLanguageSettings(selectedNativeLanguage, selectedTargetLanguage);
    } catch (error) {
      selectedTargetLanguage = previousTarget;
      console.error('Errore salvataggio lingua da imparare:', error);
      errorMessage = chatStore.language === 'en'
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
      const data = await chatStore.loadLanguageSettings();
      selectedNativeLanguage = data.native_language || selectedNativeLanguage;
      selectedTargetLanguage = data.target_language || selectedTargetLanguage;
    } catch (error) {
      console.error('Errore caricamento lingue:', error);
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
  /* I CSS rimangono quelli che hai già */
</style>