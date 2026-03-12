<script>
  import { tick, afterUpdate, onMount } from "svelte";
  import { apiStore } from "../store.js";
  import { get } from "svelte/store";

  let language = 'it';

  // --- cartella dei messaggi ---
  let messaggi = [
    {
      testo:
        language === 'en'
          ? "Hi! I'm Anita — what would you like to talk about?"
          : "Ciao! sono anita, di cosa vuoi parlare?",
      mittente: "AI",
    },
  ];
  let nuovoMessaggio = "";
  let isLoading = false;
  let isRecording = false;
  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];
  
  // Riferimento al contenitore
  let chatContainer;

  async function inviaMessaggio() {
    if (nuovoMessaggio.trim() === "" || isLoading) return;

    messaggi = [...messaggi, { testo: nuovoMessaggio, mittente: "Io" }];
    const inputText = nuovoMessaggio;
    nuovoMessaggio = "";
    isLoading = true;

    await tick();
    scrollToBottom();

    try {
      const response = await apiStore.fetchData(messaggi, language);
      const rispostaTesto = response?.response || response?.text || JSON.stringify(response);
      messaggi = [...messaggi, { testo: rispostaTesto, mittente: "AI" }];
      
    } catch (err) {
      console.error(err);
      const errorMsg = language === 'en' ? "Connection error." : "Errore di connessione.";
      messaggi = [...messaggi, { testo: errorMsg, mittente: "AI" }];
    } finally {
      isLoading = false;
      await tick();
      scrollToBottom();
    }
  }

  async function startRecording() {
    if (isRecording || isLoading) return;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
        
        // Creiamo un URL locale temporaneo per riascoltare subito l'audio senza aspettare il server
        const localAudioUrl = URL.createObjectURL(blob);
        
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });

        isLoading = true;
        try {
          const res = await apiStore.uploadAudio(file, language);

          let testoDaMostrare = "";

          // Caso 1: C'è una trascrizione
          if (res && res.transcription) {
            testoDaMostrare = res.transcription;
            // Aggiungiamo il messaggio con TESTO + AUDIO LOCALE
            messaggi = [...messaggi, { testo: testoDaMostrare, audio: localAudioUrl, mittente: 'Io' }];
            await tick();
            
            if (res.response) {
               messaggi = [...messaggi, { testo: res.response, mittente: 'AI' }];
            }
          } 
          // Caso 2: Solo conferma file (nessuna trascrizione testuale)
          else if (res && (res.filename || res.status === 'ok')) {
            // Se non c'è testo, mostriamo un placeholder, ma manteniamo l'audio
            const placeholder = language === 'en' ? 'Voice Message' : 'Messaggio vocale';
            messaggi = [...messaggi, { testo: placeholder, audio: localAudioUrl, mittente: 'Io' }];
            await tick();
            
            if (res.response) {
               messaggi = [...messaggi, { testo: res.response, mittente: 'AI' }];
            }
          } else {
            // Fallback
            const fallbackText = language === 'en' ? 'Audio sent.' : 'Audio inviato.';
            messaggi = [...messaggi, { testo: fallbackText, audio: localAudioUrl, mittente: 'Io' }];
             if (res && res.response) {
               messaggi = [...messaggi, { testo: res.response, mittente: 'AI' }];
            }
          }

        } catch (err) {
          console.error(err);
          messaggi = [...messaggi, { testo: language === 'en' ? 'Audio error.' : 'Errore audio.', mittente: 'AI' }];
        } finally {
          isLoading = false;
          if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
          }
        }
      };

      mediaRecorder.start();
      isRecording = true;
    } catch (err) {
      console.error('Could not start recording', err);
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    } catch (e) {
      console.error(e);
    }
  }

  // Funzione aggiornata per gestire sia URL locali (blob) che file dal server
  function playAudio(source) {
    try {
      let url = source;
      // Se la source non è un URL completo (blob:http... o https...), assumiamo sia un filename del backend
      if (!source.startsWith('blob:') && !source.startsWith('http')) {
         const backend = import.meta.env.VITE_BACKEND || '';
         url = backend ? `${backend.replace(/\/$/, '')}/recordings/${source}` : `/recordings/${source}`;
      }
      const audio = new Audio(url);
      audio.play().catch(err => console.error('Audio play failed', err));
    } catch (e) {
      console.error('playAudio error', e);
    }
  }

  function handleButtonClick() {
    if (nuovoMessaggio.trim()) {
      inviaMessaggio();
    }
  }

  function handleButtonPress(e) {
    if (!nuovoMessaggio.trim() && !isLoading) {
      if(e.cancelable) e.preventDefault(); 
      startRecording();
    }
  }

  function handleButtonRelease() {
    if (isRecording) {
      stopRecording();
    }
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  afterUpdate(() => {
    scrollToBottom();
  });

  let showMenu = false;
  let showLangOptions = false;

  function toggleMenu(event) {
    showMenu = !showMenu;
  }

  function selectLanguage() {
    showLangOptions = !showLangOptions;
  }

  function setLanguage(l) {
    language = l;
    showLangOptions = false;
    showMenu = false;
    const confirmation = l === 'en' ? 'Language set to English.' : 'Lingua impostata su Italiano.';
    messaggi = [...messaggi, { testo: confirmation, mittente: 'AI' }];
  }

  function selectTemplate() {
    showMenu = false;
    console.log("Template clicked");
  }

  onMount(() => {
    function down(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!nuovoMessaggio.trim() && !isRecording && !isLoading) {
          startRecording();
        }
      }
    }

    function up(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else if (nuovoMessaggio.trim()) {
          inviaMessaggio();
        }
      }
    }

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });
</script>

<!-- STRUTTURA -->
<main on:click={() => { showMenu = false; showLangOptions = false }}>
  <div class="chat-container" bind:this={chatContainer}>
    {#each messaggi as msg}
      <div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
        
        <!-- Contenuto Testo -->
        {#if msg.testo}
          <div class="msg-text">{msg.testo}</div>
        {/if}

        <!-- Pulsante Riascolta (Solo se c'è audio allegato) -->
        {#if msg.audio}
          <button 
            type="button" 
            class="play-audio-btn" 
            on:click={() => playAudio(msg.audio)} 
            aria-label="Play audio"
          >
            <span class="icon">▶️</span>
            <span class="label">{msg.mittente === 'Io' ? (language === 'en' ? 'Play Voice' : 'Riascolta') : '▶️'}</span>
          </button>
        {/if}
        
      </div>
    {/each}
  </div>

  {#if isLoading}
    <div class="typing">{language === 'en' ? "Assistant is typing..." : "L'assistente sta scrivendo..."}</div>
  {/if}

  <form on:submit|preventDefault>
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

    <input
      type="text"
      placeholder={language === 'en' ? 'Write a message...' : 'Scrivi un messaggio...'}
      bind:value={nuovoMessaggio}
      disabled={isLoading}
    />

    <!-- PULSANTE UNIFICATO -->
    <button
      type="button"
      class="hybrid-button {nuovoMessaggio.trim() ? 'has-text' : 'is-mic'}"
      disabled={isLoading}
      on:click={handleButtonClick}
      on:mousedown={handleButtonPress}
      on:touchstart={handleButtonPress}
      on:mouseup={handleButtonRelease}
      on:touchend={handleButtonRelease}
      on:mouseleave={handleButtonRelease}
      aria-label={nuovoMessaggio.trim() ? "Send message" : "Hold to record"}
    >
      {#if nuovoMessaggio.trim()}
        <!-- Icona Play / Invio -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      {:else}
        <!-- Icona Microfono -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      {/if}
    </button>

  </form>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100vh;
    background-color: #d1d7db;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
    display: flex;
    justify-content: center;
  }

  main {
    width: 100%;
    max-width: 500px;
    height: 100%;
    background-color: #efeae2;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }

  .chat-container {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: #efeae2;
    background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png");
    background-blend-mode: overlay;
  }

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

  /* Stile per il testo all'interno della bolla */
  .msg-text {
    /* Stile standard per il testo */
  }

  /* Stile per il nuovo pulsante di riproduzione dentro la bolla */
  .play-audio-btn {
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 20px;
    padding: 5px 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #075e54;
    align-self: flex-start;
    transition: background 0.2s;
    width: fit-content;
  }

  .play-audio-btn:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .play-audio-btn .icon {
    font-size: 12px;
  }

  .bolla.ai .play-audio-btn {
    color: #008069;
  }

  form {
    padding: 10px;
    background-color: #f0f2f5;
    display: flex;
    gap: 10px;
    border-top: 1px solid #ddd;
    align-items: center;
  }

  input {
    flex: 1;
    padding: 12px 15px;
    border-radius: 20px;
    border: none;
    outline: none;
    background-color: #ffffff;
  }

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

  .hybrid-button {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s, background-color 0.2s;
    color: white;
  }

  .hybrid-button:active {
    transform: scale(0.95);
  }

  .hybrid-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .hybrid-button.is-mic {
    background-color: #54656f;
  }
  .hybrid-button.is-mic:active {
    background-color: #b91c1c;
    transform: scale(1.1);
  }

  .hybrid-button.has-text {
    background-color: #008069;
  }

  .typing {
    font-size: 12px;
    color: #666;
    margin-left: 20px;
    margin-bottom: 5px;
    font-style: italic;
    height: 15px;
  }
</style>