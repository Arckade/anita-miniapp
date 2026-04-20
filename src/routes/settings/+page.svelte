<script>
  import { goto } from '$app/navigation';
  import { language } from '$lib/stores.js';

  function closeModal() {
    goto('/');
  }

  function setLanguage(lang) {
    language.set(lang);
    goto('/');
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

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
  }

  // Cleanup su destroy
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="modal-overlay" use:portal on:click={closeModal}>
  <div class="language-modal" on:click|stopPropagation>
    <div class="modal-header">
      <h2>{$language === 'en' ? 'Select Languages' : 'Seleziona Lingue'}</h2>
      <button type="button" class="close-button" on:click={closeModal}>✕</button>
    </div>

    <div class="language-columns">
      <div class="language-section">
        <h3>{$language === 'en' ? 'Mother Language' : 'Lingua Madre'}</h3>
        <div class="language-list">
          <button type="button" class="lang-button" on:click={() => setLanguage('it')}>
            🇮🇹 Italiano
          </button>
          <button type="button" class="lang-button" on:click={() => setLanguage('en')}>
            🇬🇧 English
          </button>
        </div>
      </div>

      <div class="language-section">
        <h3>{$language === 'en' ? 'Language to Learn' : 'Lingua da Imparare'}</h3>
        <div class="language-list">
          <button type="button" class="lang-button" on:click={() => setLanguage('it')}>
            🇮🇹 Italiano
          </button>
          <button type="button" class="lang-button" on:click={() => setLanguage('en')}>
            🇬🇧 English
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
    padding-bottom: 120px;
  }

  .language-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: 50vw;
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
    padding: 30px 20px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #eee;
  }

  .language-section:last-child {
    border-right: none;
  }

  .language-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    flex-shrink: 0;
  }

  .language-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .lang-button {
    padding: 12px 16px;
    border: 2px solid #ddd;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    color: #333;
    transition: all 0.2s;
    text-align: left;
  }

  .lang-button:hover {
    border-color: #667eea;
    background: #f3f7ff;
    transform: translateX(4px);
  }

  .lang-button:active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
</style>
