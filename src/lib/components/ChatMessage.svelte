<script>
  import { onDestroy } from 'svelte';
  import { getAudioUrl } from '$lib';

  export let msg;
  export let language;
  export let playAudio; // kept for compatibility, not used directly

  let isPlaying = false;
  let duration = 0;      // seconds, total
  let currentTime = 0;   // seconds, progress
  let audioEl = null;

  function formatTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function initAudio() {
    if (audioEl) return audioEl;
    const url = getAudioUrl(msg.audio);
    audioEl = new Audio(url);
    audioEl.addEventListener('loadedmetadata', () => {
      duration = audioEl.duration;
    });
    audioEl.addEventListener('timeupdate', () => {
      currentTime = audioEl.currentTime;
    });
    audioEl.addEventListener('ended', () => {
      isPlaying = false;
      currentTime = 0;
    });
    audioEl.addEventListener('pause', () => { isPlaying = false; });
    audioEl.addEventListener('play',  () => { isPlaying = true;  });
    return audioEl;
  }

  function togglePlay() {
    const a = initAudio();
    if (isPlaying) {
      a.pause();
    } else {
      a.play().catch(err => console.error('Audio play failed', err));
    }
  }

  onDestroy(() => {
    if (audioEl) {
      audioEl.pause();
      audioEl = null;
    }
  });
</script>

<div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
  <!-- Contenuto Testo (Mostrato SOLO se esiste e non è vuoto) -->
  {#if msg.testo && msg.testo.trim() !== ""}
    <div class="msg-text">{msg.testo}</div>
  {/if}

  <!-- Player Audio -->
  {#if msg.audio}
    <div class="audio-player">
      <button
        type="button"
        class="play-btn"
        on:click={togglePlay}
        aria-label={isPlaying ? 'Pausa' : 'Play'}
      >
        {#if isPlaying}
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <rect x="5" y="4" width="4" height="16" rx="1"/>
            <rect x="15" y="4" width="4" height="16" rx="1"/>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M8 5v14l11-7z"/>
          </svg>
        {/if}
      </button>
      <span class="timer">
        {#if isPlaying || currentTime > 0}
          {formatTime(currentTime)} / {formatTime(duration)}
        {:else}
          {formatTime(duration)}
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  .bolla {
    padding: 10px 14px;
    border-radius: 20px;
    max-width: 78%;
    font-size: 14.5px;
    line-height: 1.5;
    position: relative;
    word-wrap: break-word;
    white-space: pre-wrap;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-self: flex-start;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .bolla.io {
    background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
    color: #ffffff;
    align-self: flex-end;
    border-bottom-right-radius: 5px;
    border: 1px solid rgba(124, 58, 237, 0.6);
  }

  .bolla.ai {
    background: rgba(28, 28, 38, 0.82);
    color: #e8e8f0;
    align-self: flex-start;
    border-bottom-left-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* ---- Audio Player ---- */
  .audio-player {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 130px;
  }

  .play-btn {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, transform 0.15s;
  }

  .play-btn:active {
    transform: scale(0.90);
  }

  .bolla.io .play-btn {
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
  }

  .bolla.io .play-btn:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  .bolla.ai .play-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #c8c8e0;
  }

  .bolla.ai .play-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .timer {
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }
</style>
