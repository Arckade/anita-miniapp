<script>
  import { goto } from '$app/navigation';
  import LanguageModal from '$lib/components/LanguageModal.svelte';

  function closeModal() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<LanguageModal on:close={closeModal} />
