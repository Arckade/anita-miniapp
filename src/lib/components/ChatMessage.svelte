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
    border-radius: 18px;
    max-width: 75%;
    font-size: 15px;
    line-height: 1.4;
    position: relative;
    word-wrap: break-word;
    white-space: pre-wrap;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-self: flex-start;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  }

  .bolla.io {
    background-color: #7c3aed;
    color: #ffffff;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }

  .bolla.ai {
    background-color: #1e1e1e;
    color: #e0e0e0;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }

  /* ---- Audio Player ---- */
  .audio-player {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 120px;
  }

  .play-btn {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, transform 0.1s;
  }

  .play-btn:active {
    transform: scale(0.92);
  }

  .bolla.io .play-btn {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  }

  .bolla.io .play-btn:hover {
    background: rgba(255, 255, 255, 0.38);
  }

  .bolla.ai .play-btn {
    background: rgba(255, 255, 255, 0.12);
    color: #e0e0e0;
  }

  .bolla.ai .play-btn:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  .timer {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
</style>
