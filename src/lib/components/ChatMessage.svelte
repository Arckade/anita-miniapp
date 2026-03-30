<script>
  import { getAudioUrl } from '$lib/utils.js';

  export let msg;
  export let language;
  export let onPlayAudio;

  // Computa l'URL audio reattivamente
  $: audioUrl = getAudioUrl(msg.audio, msg.audio_format || 'webm');
  $: showText = msg.testo?.trim();
  $: showAudio = !!msg.audio;
</script>

<div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
  {#if showText}
    <div class="msg-text">{msg.testo}</div>
  {/if}

  {#if showAudio}
    <button
      type="button"
      class="play-audio-btn"
      on:click={() => onPlayAudio?.(audioUrl)}
      aria-label="Play audio"
    >
      <span class="icon">▶️</span>
      <span class="label">
        {msg.mittente === 'Io'
          ? (language === 'en' ? 'Voice' : 'Vocale')
          : (language === 'en' ? 'Listen' : 'Ascolta')}
      </span>
    </button>
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
    background-color: #d9fdd3;
    align-self: flex-end;
    border-top-right-radius: 0;
  }

  .bolla.ai {
    background-color: #ffffff;
    align-self: flex-start;
    border-top-left-radius: 0;
  }

  .play-audio-btn {
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 20px;
    padding: 6px 14px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #075e54;
    transition: background 0.2s;
    width: fit-content;
  }

  .play-audio-btn:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .play-audio-btn .icon {
    font-size: 14px;
  }

  .bolla.ai .play-audio-btn {
    color: #008069;
  }
</style>