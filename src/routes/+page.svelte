<script>
  import { tick, afterUpdate } from "svelte";
  import { apiStore, getAudioUrl } from "$lib";
  import ChatMessage from "$lib/components/ChatMessage.svelte";
  import ChatInput from "$lib/components/ChatInput.svelte";
  import SettingsMenu from "$lib/components/SettingsMenu.svelte";

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
  
  let isLoading = false;
  let isRecording = false;
  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];
  
  // Riferimento al contenitore
  let chatContainer;

  async function inviaMessaggio(nuovoMessaggio) {
    if (!nuovoMessaggio || isLoading) return;

    messaggi = [...messaggi, { testo: nuovoMessaggio, mittente: "Io" }];
    isLoading = true;

    await tick();
    scrollToBottom();

    try {
      const response = await apiStore.fetchData(messaggi, language);

      if (response?.type === 'audio' && response?.content) {
        // Risposta audio dal server (es. comando "sample")
        messaggi = [...messaggi, { testo: '', audio: response.content, mittente: 'AI' }];
      } else {
        const rispostaTesto = response?.response || response?.text || JSON.stringify(response);
        messaggi = [...messaggi, { testo: rispostaTesto, mittente: "AI" }];
      }
      
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
        
        // Creiamo un URL locale temporaneo per riascoltare subito l'audio
        const localAudioUrl = URL.createObjectURL(blob);
        
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });

        isLoading = true;
        try {
          const res = await apiStore.uploadAudio(file, language);

          // MODIFICA QUI: Inseriamo il messaggio con TESTO VUOTO per mostrare solo il pulsante audio
          // Non importa se c'è una trascrizione dal backend, la nascondiamo
          messaggi = [...messaggi, { testo: "", audio: localAudioUrl, mittente: 'Io' }];
          await tick();
          
          // Gestiamo la risposta AI se presente
          if (res && res.response) {
             messaggi = [...messaggi, { testo: res.response, mittente: 'AI' }];
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

  function playAudio(source) {
    try {
      const url = getAudioUrl(source);
      const audio = new Audio(url);
      audio.play().catch(err => console.error('Audio play failed', err));
    } catch (e) {
      console.error('playAudio error', e);
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

  function setLanguage(event) {
    const l = event.detail;
    language = l;
    const confirmation = l === 'en' ? 'Language set to English.' : 'Lingua impostata su Italiano.';
    messaggi = [...messaggi, { testo: confirmation, mittente: "AI" }];
  }
</script>

<!-- STRUTTURA -->
<main>
  <div class="chat-container" bind:this={chatContainer}>
    {#each messaggi as msg}
      <ChatMessage {msg} {language} {playAudio} />
    {/each}
  </div>

  {#if isLoading}
    <div class="typing">{language === 'en' ? "Assistant is typing..." : "L'assistente sta scrivendo..."}</div>
  {/if}

  <ChatInput 
    {language} 
    {isLoading} 
    {isRecording}
    on:sendMessage={(e) => inviaMessaggio(e.detail)}
    on:startRecording={startRecording}
    on:stopRecording={stopRecording}
  >
    <div slot="settings">
      <SettingsMenu 
        {language} 
        on:setLanguage={setLanguage} 
        on:selectTemplate={() => console.log('Template clicked')}
      />
    </div>
  </ChatInput>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100vh;
    background-color: #0a0a0f;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
    display: flex;
    justify-content: center;
  }

  main {
    width: 100%;
    max-width: 500px;
    height: 100%;
    background-image: url('/immagine_sfondo.png');
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 0 40px rgba(124, 58, 237, 0.15);
  }

  .chat-container {
    flex: 1;
    padding: 16px 16px 8px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-color: transparent;
    /* Nasconde la scrollbar su tutti i browser */
    scrollbar-width: none;       /* Firefox */
    -ms-overflow-style: none;    /* IE / Edge legacy */
  }

  .chat-container::-webkit-scrollbar {
    display: none;               /* Chrome, Safari, Opera */
  }

  .typing {
    font-size: 12px;
    color: rgba(255,255,255,0.45);
    margin-left: 20px;
    margin-bottom: 4px;
    font-style: italic;
    height: 15px;
    letter-spacing: 0.03em;
  }
</style>