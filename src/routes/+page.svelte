<script>
  import { tick, onMount } from 'svelte';
  import { chatStore } from '$lib/stores.svelte.js';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import SettingsMenu from '$lib/components/SettingsMenu.svelte';

  let messaggi = $state([
    {
      testo: "Ciao! sono anita, di cosa vuoi parlare?",
      mittente: "AI",
    },
  ]);

  let isRecording = $state(false);
  let isSendingAudio = $state(false);
  let chatContainer;

  // Sottoscrivi agli store del WebSocket tramite l'istanza chatStore
  let backendTyping = $derived(chatStore.isBackendTyping);
  let status = $derived(chatStore.connectionStatus);
  let pendingMessages = $derived(chatStore.incomingMessages);

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

    // In Svelte 5 possiamo usare .push() direttamente!
    messaggi.push(newMsg);
    chatStore.consumeIncomingMessage();

    // Scroll dopo il render
    tick().then(scrollToBottom);
  });

  // --- INVIO MESSAGGIO TESTO ---
  function handleSendMessage(text) {
    if (!text) return;

    // Rimosso il parametro language, non serve più a sendText
    const sent = chatStore.sendText(text);
    if (sent) {
      messaggi.push({ testo: text, mittente: 'Io' });
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
      const errorMsg = chatStore.language === 'en'
        ? 'Microphone access denied.'
        : 'Accesso al microfono negato.';
      messaggi.push({ testo: errorMsg, mittente: 'AI' });
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
    messaggi.push({ testo: '', audio: localAudioUrl, mittente: 'Io' });
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
      // Rimosso il parametro language, non serve più a sendAudio
      const sent = chatStore.sendAudio(base64);

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
  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function showError() {
    const errorMsg = chatStore.language === 'en'
      ? 'Connection error. Try again.'
      : 'Errore di connessione. Riprova.';
    messaggi.push({ testo: errorMsg, mittente: 'AI' });
  }

  // Cleanup on destroy
  onMount(() => {
    return () => cleanupRecording();
  });
</script>

{#if chatStore.authStatus === 'unauthorized'}
  <div class="unauthorized-overlay">
    <div class="unauthorized-box">
      <h2>{chatStore.language === 'en' ? 'Access Denied' : 'Accesso Negato'}</h2>
      <p>{chatStore.language === 'en' ? 'Open this app from Telegram or use debug mode.' : 'Apri questa app da Telegram o usa la modalità debug.'}</p>
      <code>?debug=1&user_id=123</code>
    </div>
  </div>
{:else}
  <main>
    <!-- Indicatore connessione -->
    {#if status !== 'connected'}
      <div class="connection-bar {status === 'connecting' ? 'connecting' : 'error'}">
        {status === 'connecting'
          ? (chatStore.language === 'en' ? 'Connecting...' : 'Connessione in corso...')
          : (chatStore.language === 'en' ? 'Disconnected - Reconnecting...' : 'Disconnesso - Riconnessione...')}
      </div>
    {/if}

    <div class="chat-container" bind:this={chatContainer}>
      {#each messaggi as msg, i (i)} <!-- Usiamo l'indice come key -->
        <ChatMessage {msg} language={chatStore.language} />
      {/each}
    </div>

    {#if backendTyping}
      <div class="typing">
        {chatStore.language === 'en' ? 'Anita is typing...' : 'Anita sta scrivendo...'}
      </div>
    {/if}

    <ChatInput
      language={chatStore.language}
      {isLoading}
      {isRecording}
      onSendMessage={handleSendMessage}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
    >
      <!-- In Svelte 5 gli slot con nome diventano Snippets -->
      {#snippet settings()}
        <SettingsMenu />
      {/snippet}
    </ChatInput>
  </main>
{/if}

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
    /* Nascondi scrollbar */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .chat-container::-webkit-scrollbar {
    display: none;
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

  .unauthorized-overlay {
    position: fixed;
    inset: 0;
    background-color: #d1d7db;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
  }

  .unauthorized-box {
    background: white;
    padding: 32px;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 100%;
  }

  .unauthorized-box h2 {
    margin: 0 0 12px;
    color: #111;
    font-size: 20px;
  }

  .unauthorized-box p {
    margin: 0 0 16px;
    color: #555;
    font-size: 14px;
  }

  .unauthorized-box code {
    display: inline-block;
    background: #f3f4f6;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    color: #111;
  }
</style>
