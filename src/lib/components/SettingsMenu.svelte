<script>
  import { goto } from '$app/navigation';
  import { language } from '$lib/stores.js';

  let showMenu = false;

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function openLanguageSettings() {
    showMenu = false;
    goto('/settings');
  }

  function selectTemplate() {
    showMenu = false;
    // TODO: implementare selezione template
  }
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
      <button type="button" class="menu-item" on:click={openLanguageSettings}>
        {$language === 'en' ? 'Language' : 'Lingua'}
      </button>
      <button type="button" class="menu-item" on:click={selectTemplate}>
        template
      </button>
    </div>
  {/if}
</div>

<svelte:window on:click={() => { showMenu = false; }} />

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
</style>