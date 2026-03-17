<script>
  export let msg;
  export let language;
  export let playAudio;
</script>

<div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
  <!-- Contenuto Testo (Mostrato SOLO se esiste e non è vuoto) -->
  {#if msg.testo && msg.testo.trim() !== ""}
    <div class="msg-text">{msg.testo}</div>
  {/if}

  <!-- Pulsante Riascolta (Mostrato SOLO se esiste l'audio) -->
  {#if msg.audio}
    <button 
      type="button" 
      class="play-audio-btn" 
      on:click={() => playAudio(msg.audio)} 
      aria-label="Play audio"
    >
      <span class="icon">▶️</span>
      <span class="label">{msg.mittente === 'Io' ? (language === 'en' ? 'Voice' : 'Vocale') : '▶️'}</span>
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
    /* Assicura che la bolla non collassi se c'è solo il bottone */
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

  .msg-text {
    /* Stile standard per il testo */
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
