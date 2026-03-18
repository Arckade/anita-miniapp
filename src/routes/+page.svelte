<script>
  import { tick, afterUpdate } from "svelte";
  import { apiStore, getAudioUrl } from "$lib";
  import ChatMessage from "$lib/components/ChatMessage.svelte";
  import ChatInput from "$lib/components/ChatInput.svelte";
  import SettingsMenu from "$lib/components/SettingsMenu.svelte";

  let language = 'it';

  // --- message list ---
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
  
  // Reference to the container
  let chatContainer;

  async function inviaMessaggio(nuovoMessaggio) {
    if (!nuovoMessaggio || isLoading) return;

    messaggi = [...messaggi, { testo: nuovoMessaggio, mittente: "Io" }];
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
      // Capture stream and recorder as local variables so the onstop closure
      // always references the correct instances, even if a new recording starts
      // before this one's onstop fires (prevents race condition on double-click).
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const localChunks = [];

      mediaStream = stream;
      mediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) localChunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop THIS recording's tracks via the closed-over local reference
        stream.getTracks().forEach(t => t.stop());
        if (mediaStream === stream) mediaStream = null;
        if (mediaRecorder === recorder) mediaRecorder = null;

        const blob = new Blob(localChunks, { type: localChunks[0]?.type || 'audio/webm' });
        const localAudioUrl = URL.createObjectURL(blob);
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });

        isLoading = true;
        try {
          const res = await apiStore.uploadAudio(file, language);

          messaggi = [...messaggi, { testo: "", audio: localAudioUrl, mittente: 'Io' }];
          await tick();
          
          if (res && res.response) {
             messaggi = [...messaggi, { testo: res.response, mittente: 'AI' }];
          }

        } catch (err) {
          console.error(err);
          messaggi = [...messaggi, { testo: language === 'en' ? 'Audio error.' : 'Errore audio.', mittente: 'AI' }];
        } finally {
          isLoading = false;
          await tick();
          scrollToBottom();
        }
      };

      recorder.start();
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


  .typing {
    font-size: 12px;
    color: #666;
    margin-left: 20px;
    margin-bottom: 5px;
    font-style: italic;
    height: 15px;
  }
</style>