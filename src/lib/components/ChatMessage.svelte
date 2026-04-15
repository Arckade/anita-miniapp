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

<div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
  {#if showAudio}
    <button
      type="button"
      class="play-audio-btn {isPlaying ? 'playing' : ''}"
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
      class="text-toggle-btn"
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
      <div class="msg-text ai-text">{msg.testo}</div>
    {/if}
  {:else if showText}
    <div class="msg-text">{msg.testo}</div>
  {/if}
</div>

<style>
  .bolla {
    padding: 10px 15px;
    border-radius: 8px;
    max-width: 75%;
    font-size: 15px;
    line-height: 1.4;
    position: relative;
    word-wrap: break-word;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
    white-space: pre-wrap;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-self: flex-start;
  }

  .bolla.io {
    background-color: #4a235a;
    color: #ffffff;
    align-self: flex-end;
    border-top-right-radius: 0;
  }

  .bolla.ai {
    background-color: #2e2e2e;
    color: #ffffff;
    align-self: flex-start;
    border-top-left-radius: 0;
  }

  .play-audio-btn {
    background: rgba(99, 93, 93, 0.35);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    padding: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    transition: background 0.2s, transform 0.1s;
    flex-shrink: 0;
  }

  .play-audio-btn:hover {
    background: rgba(255, 255, 255, 0.55);
  }

  .play-audio-btn:active {
    transform: scale(0.92);
  }

  .play-audio-btn.playing {
    background: rgba(255, 255, 255, 0.45);
  }

  .bolla.io .play-audio-btn {
    order: 2;
  }

  .text-toggle-btn {
    background: rgba(255, 255, 255, 0.12);
    border: none;
    border-radius: 12px;
    padding: 4px 10px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.75);
    font-size: 12px;
    font-weight: 500;
    transition: background 0.2s;
    align-self: flex-start;
  }

  .text-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
  }

  .ai-text {
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>