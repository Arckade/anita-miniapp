<script>
  import { createEventDispatcher } from 'svelte';
  
  export let language;
  
  const dispatch = createEventDispatcher();
  let showMenu = false;
  let showLangOptions = false;

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function selectLanguage() {
    showLangOptions = !showLangOptions;
  }

  function setLanguage(l) {
    dispatch('setLanguage', l);
    showLangOptions = false;
    showMenu = false;
  }

  function selectTemplate() {
    showMenu = false;
    dispatch('selectTemplate');
  }

  // Close menu when clicking outside (handled if we rely on parent's click handler, 
  // or we can add a window click listener here, but let's keep it simple and emit close)
  // For now, let's keep the logic simple
</script>

<div class="settings-container" on:click|stopPropagation>
  <button
    type="button"
    class="settings-button"
    aria-label="Settings"
    on:click={toggleMenu}
  >
    ⚙️
  </button>

  {#if showMenu}
    <div class="settings-menu" on:click|stopPropagation>
      <button type="button" class="menu-item" on:click={selectLanguage}>
        {language === 'en' ? 'Language' : 'Lingua'}
      </button>

      {#if showLangOptions}
        <div class="lang-options">
          <button type="button" class="menu-item" on:click={() => setLanguage('it')}>
            Italiano
          </button>
          <button type="button" class="menu-item" on:click={() => setLanguage('en')}>
            English
          </button>
        </div>
      {/if}

      <button type="button" class="menu-item" on:click={selectTemplate}>
        template
      </button>
    </div>
  {/if}
</div>

<svelte:window on:click={() => { showMenu = false; showLangOptions = false; }} />

<style>
  .settings-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .settings-button {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 18px;
    margin-right: 6px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #54656f;
  }

  .settings-menu {
    position: absolute;
    bottom: 50px;
    left: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    padding: 6px;
    min-width: 120px;
    z-index: 30;
  }

  .menu-item {
    background: transparent;
    border: none;
    padding: 8px 12px;
    text-align: center;
    cursor: pointer;
    border-radius: 6px;
    color: #333;
  }

  .menu-item:hover {
    background: #f3f4f6;
  }

  .lang-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-left: 20px;
  }
</style>
