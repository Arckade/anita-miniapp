<script>
  import { tick, onMount, onDestroy } from 'svelte';
  import {
    incomingMessages,
    isBackendTyping,
    connectionStatus,
    sendText,
    sendAudio,
    consumeIncomingMessage
  } from '$lib/stores.js';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import SettingsMenu from '$lib/components/SettingsMenu.svelte';

  let language = $state('it');
  let messaggi = $state([
    {
      testo: "Ciao! sono anita, di cosa vuoi parlare?",
      mittente: "AI",
    },
  ]);

  let isRecording = $state(false);
  let isSendingAudio = $state(false);
  let chatContainer;

  // Sottoscrivi agli store del WebSocket
  let backendTyping = $derived($isBackendTyping);
  let status = $derived($connectionStatus);
  let pendingMessages = $derived($incomingMessages);

  // Computa isLoading: vero solo durante invio audio
  let isLoading = $derived(isSendingAudio);

  // --- GESTIONE MESSAGGI IN ARRIVO ---
  $effect(() => {
    // Questa reazione si triggera quando pendingMessages cambia
    const msgs = pendingMessages;
    if (msgs.length === 0) return;

    // Prendi il primo messaggio e processalo
    const incoming = msgs[0];

    const newMsg = {
      mittente: 'AI',
      testo: incoming.text || '',
      audio: incoming.audio_bytes || null,
      audio_format: incoming.audio_format || 'webm',
    };

    messaggi = [...messaggi, newMsg];
    consumeIncomingMessage();

    // Scroll dopo il render
    tick().then(scrollToBottom);
  });

  // --- INVIO MESSAGGIO TESTO ---
  function handleSendMessage(text) {
    if (!text) return;

    const sent = sendText(text, language);
    if (sent) {
      messaggi = [...messaggi, { testo: text, mittente: 'Io' }];
      tick().then(scrollToBottom);
    } else {
      showError();
    }
  }

  // --- REGISTRAZIONE AUDIO ---
  let mediaRecorder = null;
  let mediaStream = null;
  let audioChunks = [];

  async function startRecording() {
    if (isRecording || isSendingAudio) return;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = handleRecordingComplete;
      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        cleanupRecording();
      };

      mediaRecorder.start();
      isRecording = true;

    } catch (err) {
      console.error('Impossibile avviare registrazione:', err);
      const errorMsg = language === 'en'
        ? 'Microphone access denied.'
        : 'Accesso al microfono negato.';
      messaggi = [...messaggi, { testo: errorMsg, mittente: 'AI' }];
    }
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;

    isRecording = false;

    try {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    } catch (e) {
      console.error('Errore stop recording:', e);
      cleanupRecording();
    }
  }

  async function handleRecordingComplete() {
    if (audioChunks.length === 0) {
      cleanupRecording();
      return;
    }

    const blob = new Blob(audioChunks, { type: audioChunks[0]?.type || 'audio/webm' });
    const localAudioUrl = URL.createObjectURL(blob);

    // Mostra immediatamente il messaggio vocale dell'utente
    messaggi = [...messaggi, { testo: '', audio: localAudioUrl, mittente: 'Io' }];
    await tick();
    scrollToBottom();

    // Invia al backend
    isSendingAudio = true;

    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);

      const base64 = await base64Promise;
      const sent = sendAudio(base64, language);

      if (!sent) {
        showError();
      }

    } catch (err) {
      console.error('Errore invio audio:', err);
      showError();
    } finally {
      cleanupRecording();
      isSendingAudio = false;
    }
  }

  function cleanupRecording() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    mediaRecorder = null;
    audioChunks = [];
    isRecording = false;
  }

  // --- UTILITIES ---
  function playAudio(url) {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(err => console.error('Audio play failed:', err));
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function showError() {
    const errorMsg = language === 'en'
      ? 'Connection error. Try again.'
      : 'Errore di connessione. Riprova.';
    messaggi = [...messaggi, { testo: errorMsg, mittente: 'AI' }];
  }

  function setLanguage(event) {
    language = event.detail;
    const confirmation = language === 'en'
      ? 'Language set to English.'
      : 'Lingua impostata su Italiano.';
    messaggi = [...messaggi, { testo: confirmation, mittente: 'AI' }];
    tick().then(scrollToBottom);
  }

  // Cleanup on destroy
  onMount(() => {
    return () => cleanupRecording();
  });
</script>

<main>
  <!-- Indicatore connessione -->
  {#if status !== 'connected'}
    <div class="connection-bar {status === 'connecting' ? 'connecting' : 'error'}">
      {status === 'connecting'
        ? (language === 'en' ? 'Connecting...' : 'Connessione in corso...')
        : (language === 'en' ? 'Disconnected - Reconnecting...' : 'Disconnesso - Riconnessione...')}
    </div>
  {/if}

  <div class="chat-container" bind:this={chatContainer}>
    {#each messaggi as msg (msg)} <!-- Key unica per ottimizzazione -->
      <ChatMessage {msg} {language} onPlayAudio={playAudio} />
    {/each}
  </div>

  {#if backendTyping}
    <div class="typing">
      {language === 'en' ? 'Anita is typing...' : 'Anita sta scrivendo...'}
    </div>
  {/if}

  <ChatInput
    {language}
    {isLoading}
    {isRecording}
    onSendMessage={handleSendMessage}
    onStartRecording={startRecording}
    onStopRecording={stopRecording}
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
    height: 100dvh; /* Dynamic viewport height per mobile */
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
    height: 100dvh;
    background-image: url("/_immaginesfondo.png");
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }

  .connection-bar {
    padding: 8px 16px;
    font-size: 12px;
    text-align: center;
    background-color: #fbbf24;
    color: #92400e;
  }

  .connection-bar.error {
    background-color: #fca5a5;
    color: #991b1b;
  }

  .chat-container {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: transparent;
    scroll-behavior: smooth;
  }

  .typing {
    font-size: 12px;
    color: #666;
    margin-left: 20px;
    margin-bottom: 5px;
    font-style: italic;
    height: 20px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .typing::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 4px;
    background-color: #666;
    border-radius: 50%;
    animation: typingDot 1s infinite;
  }

  @keyframes typingDot {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
</style>