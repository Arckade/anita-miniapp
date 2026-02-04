<script>
  // 1. Lo stato
  let messaggi = [
    { testo: "Ciao! Pronto a chattare?", mittente: "AI" }
  ];
  let nuovoMessaggio = "";

  // 2. Funzione Invio
  function inviaMessaggio() {
    if (nuovoMessaggio.trim() === "") return;

    // Aggiunge messaggio utente
    messaggi = [...messaggi, { testo: nuovoMessaggio, mittente: "Io" }];
    
    // Pulisce input
    nuovoMessaggio = "";

    // Simula AI
    rispondiComeAI();
  }
  
  // 3. Funzione AI
  function rispondiComeAI() {
    setTimeout(() => {
        const ultimoMsg = messaggi[messaggi.length - 1].testo;
        messaggi = [...messaggi, { testo: "Ho capito: " + ultimoMsg, mittente: "AI" }];
    }, 1000);
  }
</script>

<!-- STILE: Assicura che il layout sia come una vera app -->
<style>
  /* Toglie i margini di default del browser */
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100vh; /* Altezza tutto schermo */
    background-color: #d1d7db; /* Sfondo grigio chiaro esterno */
    font-family: sans-serif;
    display: flex;
    justify-content: center; /* Centra la chat orizzontalmente */
  }

  main {
    width: 100%;
    max-width: 500px; /* Larghezza simile a un telefono */
    height: 100%; /* Occupa tutto l'altezza disponibile */
    background-color: #efeae2;
    display: flex;
    flex-direction: column; /* Mette i figli in colonna (chat sopra, input sotto) */
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
  }

  /* L'area dei messaggi */
  .chat-container {
    flex: 1; /* Questo è il comando magico: prende tutto lo spazio che avanza */
    padding: 20px;
    overflow-y: auto; /* Abilita lo scroll solo qui */
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"); /* Sfondo sottile opzionale */
  }

  /* Le bolle */
  .bolla {
    padding: 10px 15px;
    border-radius: 8px;
    max-width: 75%;
    font-size: 15px;
    line-height: 1.4;
    position: relative;
    word-wrap: break-word;
  }

  .bolla.io {
    background-color: #d9fdd3; /* Verde */
    align-self: flex-end; /* A destra */
    border-top-right-radius: 0;
  }

  .bolla.ai {
    background-color: #ffffff; /* Bianco */
    align-self: flex-start; /* A sinistra */
    border-top-left-radius: 0;
  }

  /* L'area input in basso */
  form {
    padding: 10px;
    background-color: #f0f2f5;
    display: flex;
    gap: 10px;
    border-top: 1px solid #ddd;
  }
  
  input {
    flex: 1; /* L'occupa tutto lo spazio orizzontale rimanente */
    padding: 12px;
    border-radius: 20px;
    border: 1px solid #ccc;
    outline: none;
  }

  button {
    background-color: #008069;
    color: white;
    border: none;
    padding: 0 20px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
  }
  
  button:hover {
    background-color: #00a884;
  }
</style>

<!-- STRUTTURA HTML -->
<main>
  <!-- Area Messaggi (con lo scroll) -->
  <div class="chat-container">
    {#each messaggi as msg}
      <div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
        {msg.testo}
      </div>
    {/each}
  </div>

  <!-- Area Input (Fissa in basso) -->
  <!-- Nota che è dentro main, ma FUORI da chat-container -->
  <form on:submit|preventDefault={inviaMessaggio}>
    <input 
      type="text" 
      placeholder="Scrivi un messaggio..." 
      bind:value={nuovoMessaggio} 
    />
    <button type="submit">Invia</button>
  </form>
</main>