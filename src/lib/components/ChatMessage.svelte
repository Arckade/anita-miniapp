<script>
  import { getAudioUrl } from '$lib/utils.js';
  import { onDestroy } from 'svelte';
  import { showAiText } from '$lib/stores.js';

  export let msg;
  export let language;

  $: isAi = msg.mittente !== 'Io';

  function toggleAiText() {
    showAiText.update(v => !v);
  }

  // Computa l'URL audio reattivamente
  $: audioUrl = getAudioUrl(msg.audio, msg.audio_format || 'webm');
  $: showText = msg.testo?.trim();
  $: showAudio = !!msg.audio;

  let isPlaying = false;
  let audioObj = null;

  function toggleAudio() {
    if (!audioUrl) return;

    if (audioObj && isPlaying) {
      audioObj.pause();
      isPlaying = false;
      return;
    }

    if (!audioObj) {
      audioObj = new Audio(audioUrl);
      audioObj.onended = () => { isPlaying = false; };
      audioObj.onpause = () => { isPlaying = false; };
      audioObj.onplay = () => { isPlaying = true; };
    }

    audioObj.play().catch(err => console.error('Audio play failed:', err));
  }

  onDestroy(() => {
    if (audioObj) {
      audioObj.pause();
      audioObj = null;
    }
  });
</script>

<div class="flex flex-col gap-2 p-3.75 py-2.5 rounded-lg max-w-3/4 text-sm leading-relaxed relative break-words shadow-sm whitespace-pre-wrap text-white {msg.mittente === 'Io' ? 'self-end bg-purple-900 rounded-tr-none rounded-tl-lg' : 'self-start bg-gray-800 rounded-tl-none'}">
  {#if showAudio}
    <button
      type="button"
      class="inline-flex w-9 h-9 rounded-full p-0 cursor-pointer items-center justify-center text-white transition-all duration-200 flex-shrink-0 bg-gray-500/35 hover:bg-white/55 active:scale-95 {isPlaying ? 'bg-white/45' : ''} {msg.mittente === 'Io' ? 'order-2' : ''}"
      on:click={toggleAudio}
      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
    >
      {#if isPlaying}
        <!-- Pausa -->
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      {:else}
        <!-- Play -->
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      {/if}
    </button>
  {/if}

  {#if isAi && showText}
    <button
      type="button"
      class="inline-flex self-start bg-white/12 border-none rounded-xl px-2.5 py-1 cursor-pointer items-center gap-1.5 text-white/75 text-xs font-medium transition-colors duration-200 hover:bg-white/22 hover:text-white"
      on:click={toggleAiText}
      aria-label={$showAiText ? 'Nascondi testo' : 'Mostra testo'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14" height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="transform: rotate({$showAiText ? 180 : 0}deg); transition: transform 0.25s;"
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
      <span>{$showAiText ? (language === 'en' ? 'Hide text' : 'Nascondi testo') : (language === 'en' ? 'Show text' : 'Mostra testo')}</span>
    </button>
    {#if $showAiText}
      <div class="animate-fadeIn">{msg.testo}</div>
    {/if}
  {:else if showText}
    <div>{msg.testo}</div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.animate-fadeIn) {
    animation: fadeIn 0.2s ease forwards;
  }
</style>