# Piedibus Shift Table Tool (Desktop & Android Mobile)

Applicazione reattiva e autonoma (zero-build) per la gestione e l'assegnazione automatica ed equa dei turni mattutini del Piedibus, sviluppata secondo la metodologia **Spec-Driven Development (SDD)**.

---

## 🌟 Funzionalità Principali

1. **Gestione Squadra & Disponibilità:**
   - Aggiunta, eliminazione e attivazione/disattivazione dei volontari.
   - Matrice di disponibilità per i turni mattutini dal **Lunedì al Venerdì**.
   - Dati di esempio pre-caricati e pulsante di azzeramento rapido.
   - **Persistenza locale (LocalStorage)**: nessun dato da reinserire ogni settimana.

2. **Configurazione Settimana Flessibile:**
   - Selezione della data del Lunedì.
   - Esclusione rapida dei giorni di chiusura (festività, scioperi, ponti).

3. **Algoritmo di Assegnazione Equa (The Solver):**
   - Assegna esattamente **2 volontari** per ogni giorno attivo.
   - Bilanciamento del carico di lavoro (differenza massima di turni tra volontari $\le 1$).
   - Priorità ai vincoli più stringenti (*constrained-first*): chi ha disponibilità limitata viene assegnato per primo.
   - Gestione delle carenze: se un giorno ha meno di 2 disponibili, viene segnalato chiaramente con `⚠️ [CERCA VOLONTARIO]`.

4. **Flusso di Revisione & Approvazione:**
   - La domanda di controllo: *"Questa proposta va bene?"*
   - **Blocco Giorno (📌 Pinning)**: blocca i giorni che ti soddisfano e rimescola gli altri.
   - **Proponi un'altra combinazione**: genera una nuova soluzione valida mantenendo i giorni bloccati.

5. **Condivisione WhatsApp Istantanea:**
   - Messaggio formattato in italiano con emoji, giorni attivi, chiusure e avvisi per posti vacanti.
   - Pulsante **Copia negli appunti** a tocco singolo.
   - Pulsante **Apri direttamente WhatsApp**.

---

## 🚀 Condivisione Immediata su Telefono Android (Google Drive)

Per usare il tool direttamente sul tuo smartphone Android senza alcuna installazione:

1. Prendi il file singolo autonomo **`piedibus.html`** (contiene tutto: codice, grafica, algoritmo, senza dipendenze esterne).
2. Caricalo sul tuo **Google Drive** dal PC.
3. Dal telefono Android, apri **Google Drive**, tocca i tre puntini su `piedibus.html` e seleziona **"Scarica"** (o "Apri con > Chrome").
4. Nei Download del telefono, tocca il file `piedibus.html`: si aprirà direttamente nel browser Chrome/Samsung Internet del tuo telefono!
5. Dal menu di Chrome (i tre puntini in alto a destra), puoi toccare **"Aggiungi a schermata Home"**: diventerà un'icona sulla tua home del telefono e funzionerà sempre, anche senza connessione internet!

---

## 🖥️ Utilizzo su PC Desktop

Non è richiesta alcuna compilazione o installazione di server:

1. Fai doppio clic su `index.html` per aprirlo direttamente nel tuo browser preferito (Chrome, Firefox, Edge, Safari).
2. Oppure avvia un server locale rapido:
   ```bash
   npx serve .
   ```
   oppure con Python:
   ```bash
   python -m http.server 8000
   ```

Su desktop, l'interfaccia si presenta con una **tabella a griglia compatta** e comandi affiancati per una gestione rapida tramite mouse e tastiera.

---

## 📱 Layout Mobile & Packaging Android APK

### 1. Visualizzazione Mobile Reattiva
L'applicazione si adatta automaticamente quando la larghezza dello schermo è ridotta:
- La griglia desktop viene sostituita da **tessere touch verticali**.
- I pulsanti di selezione dei giorni hanno una dimensione minima di **$48\text{px} \times 48\text{px}$** adatta alle dita.
- Piena compatibilità con le safe-areas degli smartphone moderni.

### 2. Installazione Immediata come PWA
Aprendo la pagina da Chrome/Edge su Android, compare l'opzione **"Aggiungi a schermata Home" / "Installa applicazione"**. L'app funzionerà a schermo intero come una normale app nativa, anche offline!

### 3. Creazione del file APK con Capacitor
Il progetto include la configurazione standard Capacitor (`capacitor.config.json`):

```bash
# 1. Installa i pacchetti Capacitor (se non già presenti)
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Aggiungi la cartella Android nativa
npx cap add android

# 3. Sincronizza i file web
npx cap sync android

# 4. Apri il progetto in Android Studio per generare il file .apk
npx cap open android
```
In Android Studio: menu **Build > Build Bundle(s) / APK(s) > Build APK(s)** per ottenere il file `.apk` installabile.

---

## 🧪 Test di Verifica della Specifica

Per eseguire la suite di test automatizzati che verifica tutti i criteri di accettazione della specifica:

```bash
node tests/test-solver.js
```
oppure:
```bash
npm test
```
# piedibus2
