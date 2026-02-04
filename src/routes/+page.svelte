<script>
  // 1. STATO DELL'APPLICAZIONE
  // Array che contiene la cronologia della chat
  let messages = [
    { id: 1, text: "Ciao! Sono la tua AI assistente. Come posso aiutarti oggi?", sender: 'ai' }
  ];
  
  // Variabile legata all'input di testo
  let newMessage = "";
  
  // Riferimento allo scroll della chat per scorrere in basso automaticamente
  let chatContainer;

  // 2. FUNZIONI
  function sendMessage() {
    if (!newMessage.trim()) return; // Non inviare messaggi vuoti

    // Aggiungi il messaggio dell'utente
    const userMsg = {
      id: Date.now(),
      text: newMessage,
      sender: 'user'
    };
    
    // Aggiorniamo l'array (Svelte è reattivo)
    messages = [...messages, userMsg];
    
    // Pulisci l'input
    newMessage = "";

    // Scorri in basso
    scrollToBottom();

    // 3. SIMULAZIONE RISPOSTA AI
    // Usiamo setTimeout per simulare il tempo di pensiero dell'AI
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMsg.text);
      const aiMsg = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'ai'
      };
      messages = [...messages, aiMsg];
      scrollToBottom();
    }, 1000);
  }

  // Funzione helper per scorrere la chat
  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Funzione che genera una risposta finta (puoi sostituire questo con una chiamata API reale in futuro)
  function generateAIResponse(input) {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('ciao')) return "Salve! Piacere di conoscerti.";
    if (lowerInput.includes('come stai')) return "Sono un programma, non ho sentimenti, ma i miei sistemi sono operativi al 100%!";
    if (lowerInput.includes('ore')) return `Sono le ${new Date().toLocaleTimeString()}.`;
    return "Interessante! Dimmi di più su questo argomento.";
  }
</script>

<!-- STILE CSS -->
<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background-color: #d1d7db; /* Colore sfondo esterno WhatsApp */
  }

  .app-container {
    display: flex;
    justify-content: center;
    height: 100vh;
    background-color: #d1d7db;
    padding-top: 20px;
  }

  .chat-frame {
    width: 100%;
    max-width: 900px; /* Larghezza simile a WhatsApp Desktop */
    height: 95vh;
    background-color: #efeae2;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    position: relative;
    overflow: hidden;
    /* Sfondo decorativo WhatsApp (opzionale) */
    background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png");
    background-repeat: repeat;
  }

  /* HEADER */
  header {
    background-color: #f0f2f5;
    padding: 15px 20px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #d1d7db;
    z-index: 10;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #00a884;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 15px;
  }

  .header-info h2 { margin: 0; font-size: 16px; color: #111b21; }
  .header-info p { margin: 0; font-size: 12px; color: #667781; }

  /* AREA MESSAGGI */
  .chat-area {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message {
    max-width: 65%;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14.2px;
    line-height: 19px;
    position: relative;
    box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
    word-wrap: break-word;
  }

  .message.user {
    align-self: flex-end;
    background-color: #d9fdd3; /* Verde chiaro messaggi inviati */
    border-top-right-radius: 0;
  }

  .message.ai {
    align-self: flex-start;
    background-color: #ffffff; /* Bianco messaggi ricevuti */
    border-top-left-radius: 0;
  }

  .time {
    display: block;
    font-size: 10px;
    color: #667781;
    text-align: right;
    margin-top: 4px;
  }

  /* AREA INPUT */
  .input-area {
    background-color: #f0f2f5;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10;
  }

  input {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    border: none;
    outline: none;
    font-size: 15px;
    background-color: #ffffff;
  }

  button {
    background-color: #00a884;
    border: none;
    width: 45px;
    height: 45px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  button:hover { background-color: #008f6f; }

  /* Icona invio semplice in CSS */
  .send-icon {
    width: 20px;
    height: 20px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(-45deg);
    margin-left: 4px; /* Spostamento a destra per sembrare una freccia */
    margin-bottom: 2px;
  }
</style>

<!-- STRUTTURA HTML -->
<div class="app-container">
  <div class="chat-frame">
    
    <!-- Header -->
    <header>
      <div class="avatar">AI</div>
      <div class="header-info">
        <h2>Assistente AI</h2>
        <p>Online</p>
      </div>
    </header>

    <!-- Chat Area (bind:this serve per controllare lo scroll via JS) -->
    <div class="chat-area" bind:this={chatContainer}>
      {#each messages as msg (msg.id)}
        <div class="message {msg.sender}">
          {msg.text}
          <span class="time">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      {/each}
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <form on:submit|preventDefault={sendMessage} style="display:flex; width:100%; align-items:center; gap:10px;">
        <input 
          type="text" 
          placeholder="Scrivi un messaggio" 
          bind:value={newMessage} 
        />
        <button type="submit">
          <div class="send-icon"></div>
        </button>
      </form>
    </div>

  </div>
</div>