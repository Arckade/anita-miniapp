<script>
  import { language } from '$lib/stores.js';
  import LanguageModal from '$lib/components/LanguageModal.svelte';

  let showMenu = false;
  let showLanguageModal = false;

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function openLanguageSettings() {
    showLanguageModal = true;
    showMenu = false;
  }

  function closeLanguageModal() {
    showLanguageModal = false;
  }

  function selectTemplate() {
    showMenu = false;
    // TODO: implementare selezione template
  }
</script>

<div class="relative flex items-center" role="presentation" on:click|stopPropagation on:keydown|stopPropagation>
  <button
    type="button"
    class="bg-transparent border-none cursor-pointer text-lg mr-1.5 w-9 h-9 flex items-center justify-center text-gray-700 hover:opacity-80 transition-opacity"
    aria-label="Settings"
    on:click={toggleMenu}
  >
    ⚙️
  </button>

  {#if showMenu}
    <div class="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col p-1.5 min-w-32 z-30" role="presentation" on:click|stopPropagation on:keydown|stopPropagation>
      <button type="button" class="bg-transparent border-none px-3 py-2 text-center cursor-pointer rounded text-gray-800 hover:bg-gray-100 transition-colors" on:click={openLanguageSettings}>
        {$language === 'en' ? 'Language' : 'Lingua'}
      </button>
      <button type="button" class="bg-transparent border-none px-3 py-2 text-center cursor-pointer rounded text-gray-800 hover:bg-gray-100 transition-colors" on:click={selectTemplate}>
        template
      </button>
    </div>
  {/if}

  {#if showLanguageModal}
    <LanguageModal on:close={closeLanguageModal} />
  {/if}
</div>

<svelte:window on:click={() => { showMenu = false; }} />