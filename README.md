# Home Brief

Una dashboard per trasformare un display e-paper in un quadro con le informazioni della giornata: data, meteo, due agende Google Calendar e notizie. Il layout è verticale, pensato per essere letto come una pagina stampata. La UI segue il progetto Figma: data a 90 px, meteo con condizioni e metriche a sinistra e previsioni a destra, agende affiancate della stessa altezza e news su due colonne con impaginazione adattiva. I contenuti del design sono segnaposto: la webapp usa le fonti reali configurate.

La webapp mostra un’anteprima e genera un PNG pronto per le prove sul display. Il repository permette di ricreare l’interfaccia sul proprio computer o sul proprio hosting, usando i propri account e la propria configurazione.

## Display

Il dispositivo di riferimento è il **Waveshare ESP32-S3-ePaper-13.3E6**:

| Caratteristica | Valore |
| --- | --- |
| Pannello | 13,3 pollici, E Ink Spectra 6 |
| Risoluzione nativa | 1600 × 1200 pixel |
| Orientamento del progetto | Verticale, 1200 × 1600 pixel |
| Colori del pannello | Sei |
| Controller | ESP32-S3 |
| Esportazione attuale | PNG bianco e nero, anche ruotato a 1600 × 1200 |

Il pannello supporta il colore; il rendering attuale usa bianco e nero. La rotazione serve per i firmware che richiedono un’immagine con dimensioni orizzontali.

Riferimenti: [prodotto Waveshare](https://www.waveshare.com/product/displays/e-paper/esp32-s3-epaper-13.3e6.htm), [documentazione e firmware del produttore](https://docs.waveshare.com/ESP32-S3-ePaper-13.3E6).

## Funzioni disponibili

- Data e orari nel fuso Europe/Rome.
- Meteo reale di Milano da Open-Meteo, con MET Norway come fonte alternativa.
- Due accessi Google indipendenti, con selezione di uno o più calendari per ogni agenda, in sola lettura.
- Fino a otto notizie dai feed RSS ANSA: tecnologia, mondo, cultura, scienza, economia e sport. Abstract originali della fonte e link agli articoli nella webapp.
- Aggiornamento manuale e automatico ogni 15 minuti mentre la pagina è visibile.
- Collegamenti persistenti cifrati sul server, con rinnovo automatico dell’accesso Google e selezioni conservate tra dispositivi.
- Anteprima, modalità solo quadro ed esportazione PNG. Gli stati delle fonti restano nei controlli della webapp e non vengono stampati in fondo al quadro.

## Tecnologie

| Tecnologia | Ruolo |
| --- | --- |
| Next.js 16, React 19 e TypeScript | Applicazione e API server |
| JavaScript, HTML e CSS | Interfaccia della dashboard |
| HTML Canvas 2D | Composizione tipografica e generazione del PNG |
| Google Auth Library e Calendar API v3 | Autorizzazione OAuth e lettura calendari/eventi |
| Open-Meteo e MET Norway | Previsioni meteo |
| RSS ANSA | Notizie |
| Node.js e node:test | Runtime e controlli automatici |
| GitHub e Vercel | Versionamento e pubblicazione automatica |
| Vercel Blob privato | Album foto e selezione giornaliera, separati dal repository |
| Sharp e dithering Floyd–Steinberg | Adattamento delle foto, rimozione metadati e PNG a sei colori |

I font usati sono PP Neue Montreal e PP Neue Montreal Mono. Sono font commerciali: per riutilizzarli o redistribuirli occorre una licenza adeguata. In alternativa sostituire i file e le dichiarazioni `@font-face` in `public/style.css` con font di cui si possiedono i diritti.

## Avvio locale

Richiede Node.js **22.13.0 o superiore** e npm.

```sh
git clone https://github.com/andreaperaltro/home-brief.git
cd home-brief
npm ci
cp .env.example .env.local
npm run dev
```

Aprire [localhost:3000/dashboard.html](http://localhost:3000/dashboard.html). Meteo e news non richiedono chiavi personali. Per le agende configurare Google come descritto sotto; senza configurazione restano scollegate.

## Collegare il proprio Google Calendar

Ogni copia del progetto deve usare **un proprio progetto Google Cloud e un proprio client OAuth**. Clonare il repository non concede accesso agli account o ai calendari di chi lo ha creato.

1. Creare o selezionare un progetto nella [console Google Cloud](https://console.cloud.google.com/).
2. Abilitare **Google Calendar API**.
3. Configurare Google Auth Platform: schermata di consenso, pubblico e utenti di test quando l’app è in modalità test.
4. Creare un client OAuth di tipo **Applicazione web**.
5. Dichiarare in **Data access** i permessi `calendar.calendarlist.readonly` e `calendar.events.readonly`.
6. Aggiungere agli **URI di reindirizzamento autorizzati** l’URL esatto `https://PROPRIO-DOMINIO/api/calendar/callback`.
7. Configurare nell’ambiente del server `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `CALENDAR_ENCRYPTION_KEY` (32 byte casuali espressi come 64 caratteri esadecimali). Usare uno storage Blob privato e le chiavi dell’album descritti sotto. Il client secret e la chiave di cifratura devono essere Secret di Vercel, mai valori pubblici o versionati.
8. Distribuire di nuovo, aprire **Collega Google Calendar**, sbloccare l’area privata con la chiave amministratore dell’album, poi premere **Collega Andrea** o **Collega Mavi**. Ogni persona autorizza il proprio account in Google e, al ritorno, sceglie i calendari. La selezione iniziale è vuota per evitare di includere calendari non desiderati.

Il server usa il flusso authorization code con accesso offline, consenso esplicito, state legato alla sessione e PKCE. La libreria ufficiale Google rinnova i token di accesso usando il refresh token senza accessi quotidiani. La modalità Testing di Google limita normalmente i nuovi refresh token Calendar a sette giorni; per l’uso duraturo configurare lo stato In production. Google può comunque revocare o far scadere un’autorizzazione: l’app segnalerà di ricollegarla. La verifica Google e lo stato di pubblicazione sono distinti; le eventuali esenzioni per uso personale non eliminano gli avvisi di app non verificata.

Le etichette Andrea e Mavi sono nomi dell’interfaccia, non account precollegati. Un fork parte senza autorizzazioni personali e deve usare un proprio progetto Google, proprie variabili e proprio storage.

## Privacy e separazione dalla configurazione personale

Nel codice non sono inclusi client ID Google reali, password, token OAuth, indirizzi email, identificatori dei calendari o eventi reali. Gli esempi di agenda sono dimostrativi.

- I secret OAuth e la chiave di cifratura sono esclusivamente variabili del server. Non vengono restituiti al browser.
- Refresh token, identificativi selezionati e data di collegamento sono cifrati con AES-256-GCM in `calendar-connections/`, nello storage Blob privato. Non cambiare `CALENDAR_ENCRYPTION_KEY` senza pianificare un nuovo collegamento di entrambi gli account.
- Il browser riceve solo i dati necessari all’interfaccia. Lettura degli eventi protetta dalla sessione privata dell’album o dalla chiave display; collegamento, selezioni e disconnessione richiedono amministratore. Le scritture verificano anche l’origine della richiesta.
- I cookie della sessione privata durano al massimo 30 giorni. La loro scadenza richiede di riaprire l’area privata, non un nuovo consenso Google: le autorizzazioni persistono sul server.
- Disconnetti elimina il refresh token e le selezioni del solo account scelto dal record attivo. Per revocare anche il consenso Google usare le impostazioni Collegamenti dell’Account Google. Scritture condizionali impediscono a operazioni in corso di ripristinare un account appena scollegato.
- Gli eventi vengono letti su richiesta e non archiviati in Blob; restano nella memoria della richiesta e della pagina. I PNG esportati contengono gli appuntamenti visibili.
- Le vecchie sessioni Google temporanee del browser vengono rimosse dalla nuova interfaccia. Non vengono convertite in refresh token: è necessario autorizzare nuovamente ogni account una volta.
- `.env*` (tranne il modello vuoto `.env.example`), `.vercel/`, dipendenze e build sono esclusi da Git. Non pubblicare esportazioni, log o immagini con dati privati.

## Pubblicazione su Vercel

Importare la propria copia del repository in Vercel come progetto Next.js. Configurare le variabili server descritte sopra, con secret separati per ogni ambiente, e registrare il redirect URI del nuovo sito nel proprio client OAuth Google. Pubblicare nuovamente dopo aver cambiato le variabili.

Con l’integrazione Git attiva, i commit sul branch di produzione avviano automaticamente il deployment. La configurazione del sito originale rimane nel suo ambiente Vercel e non viene ereditata dai fork.

## Struttura e personalizzazione

| Percorso | Contenuto |
| --- | --- |
| `public/dashboard.html` | Struttura della pagina |
| `public/style.css` | Stile della webapp e font |
| `public/app.js` | Layout del quadro, esempi e esportazione Canvas |
| `public/live.js` | Fonti live, accesso Google, selezioni e aggiornamenti |
| `lib/live-sources.mjs` | Meteo, feed RSS e cache delle fonti pubbliche |
| `app/api/config/route.ts` | Client ID configurato nell’ambiente |
| `app/api/weather/route.ts` | Endpoint meteo |
| `app/api/news/route.ts` | Endpoint notizie |
| `lib/calendar-server.mjs` | OAuth offline, cifratura, storage e lettura Calendar sul server |
| `app/api/calendar/` | Collegamento, callback, selezioni e lettura privata delle agende |
| `tests/` | Controlli su fonti, fusi orari, OAuth, cifratura e separazione account |

La località Milano, le coordinate meteo, i feed e i nomi delle agende sono attualmente definiti nel codice. Per cambiare città aggiornare entrambe le fonti meteo in `lib/live-sources.mjs` e le etichette in `public/dashboard.html` e `public/live.js`; per cambiare fuso aggiornare anche il calcolo delle giornate e gli orari in `public/live.js`.

## Verifica e stato del progetto

```sh
npm test
npm run build
npm start
```

Questo repository implementa la webapp e l’esportazione dell’immagine. **Non include ancora il firmware ESP32-S3, la trasmissione automatica al display o un servizio che aggiorni i calendari a browser chiuso.** La conversione nel formato richiesto dal firmware e la prova fisica sul pannello sono passaggi di integrazione successivi.

## Album fotografico e orari del quadro

Aprire `/photos.html` per aggiungere o eliminare le foto dall’album (con conferma prima della cancellazione definitiva) e `/frame.html` per la visualizzazione automatica nel browser:

| Ora in Europe/Rome | Contenuto |
| --- | --- |
| 06:00–10:59 | Morning Brief |
| 11:00–05:59 del giorno dopo | Una foto del giorno |

Il cambio segue anche l’ora legale. La selezione giornaliera scorre ciclicamente nell’album ed è salvata nello storage: aggiungere foto non cambia quella già scelta per oggi. Servono almeno due foto per avere immagini diverse in giorni consecutivi. Se l’album è vuoto viene mostrato un invito a caricare la prima foto.

Le foto sono **private, separate da GitHub**, in Vercel Blob. Il server adatta ogni immagine a 1200 × 1600 pixel, elimina i metadati e salva una copia JPEG e un PNG con dithering a sei colori. Per impostazione predefinita la foto viene mantenuta intera, con bordi bianchi se necessari; “Riempi il quadro” permette invece il ritaglio. La palette è un riferimento digitale e richiede ancora verifica sui pigmenti del pannello fisico.

### Configurazione dell’album su una propria installazione

1. Creare un Vercel Blob store con accesso **Private** e collegarlo al proprio progetto nell’ambiente Production. Il collegamento configura le credenziali server dello storage (`BLOB_STORE_ID` con OIDC oppure `BLOB_READ_WRITE_TOKEN`, secondo il metodo di provisioning); in ambienti locali usare le credenziali di sviluppo previste da Vercel Blob.
2. Impostare `PHOTO_ADMIN_KEY` e `PHOTO_DISPLAY_KEY` come due segreti casuali, distinti e lunghi almeno 32 caratteri nelle variabili server dell’ambiente desiderato. Non usare prefissi `NEXT_PUBLIC_`.
3. Pubblicare nuovamente. La chiave amministratore apre `/photos.html`; la chiave display consente soltanto la lettura.
4. Caricare almeno due foto. La pagina dell’album converte e ridimensiona i file nel browser prima del caricamento; l’API accetta file sotto 4 MB.

L’accesso all’album usa un cookie HttpOnly, Secure e SameSite=Strict, valido per 30 giorni. Il quadro può usare quel cookie oppure una chiave di sola lettura conservata nella sessione della scheda. La disconnessione chiude la sessione album di quel browser; per revocare tutte le sessioni o un accesso Shortcut sostituire la relativa chiave nell’ambiente Vercel e ridistribuire.

### Shortcut iPhone dal menu Condividi

Creare un comando rapido “Invia al quadro”, abilitare **Mostra nel menu Condividi** e accettare immagini come input. Aggiungere questi passaggi:

1. Ricevere l’immagine dal menu Condividi; in assenza di input, scegliere una foto.
2. Ridimensionare la foto e convertirla in **JPEG**, disattivando la conservazione dei metadati.
3. Usare **Ottieni contenuto dell’URL** verso `https://IL-PROPRIO-DOMINIO/api/photos`, metodo `POST`, corpo **File**: il JPEG convertito.
4. Aggiungere le intestazioni `Content-Type: image/jpeg` e `Authorization: Bearer CHIAVE_PRIVATA_ALBUM`.
5. Mostrare una conferma soltanto quando la risposta contiene `ok: true`; in caso contrario mostrare l’errore restituito.

Riferimento Apple: [ricevere immagini dal menu Condividi](https://support.apple.com/en-ie/guide/shortcuts/apd350ce757a/ios).

La chiave va inserita nella propria Shortcut, mai nel codice Git o nella query dell’URL. Per inviare più foto ripetere la richiesta per ciascuna immagine. Non condividere una Shortcut che contiene la propria chiave. Gli HEIC vanno convertiti in JPEG sul telefono per evitare dipendenze dal decoder del server. La creazione e l’installazione del comando rapido sul dispositivo restano un passaggio da completare sull’iPhone.

### API disponibili per la futura integrazione ESP32-S3

Tutte le richieste richiedono un cookie album valido oppure l’intestazione `Authorization: Bearer …`.

| Endpoint | Funzione |
| --- | --- |
| `GET /api/photos` | Elenco privato delle foto |
| `POST /api/photos` | Aggiunge una foto; richiede la chiave amministratore |
| `GET /api/photos/ID` | JPEG adattato al quadro |
| `DELETE /api/photos/ID` | Elimina JPEG e PNG; richiede accesso amministratore |
| `GET /api/photos/ID?format=display` | PNG a sei colori 1200 × 1600 |
| `GET /api/display` | Modalità corrente, foto del giorno e URL del contenuto |

L’API di caricamento accetta il file immagine come corpo della richiesta oppure un multipart con campo `photo`. Il parametro `fit=cover` abilita il ritaglio; il valore predefinito è `contain`.

**Stato dell’integrazione:** il servizio `/api/device/frame` genera sul server il buffer per il pannello. Il firmware in `firmware/home-brief` scarica l’immagine via HTTPS, verifica dimensioni e SHA-256, aggiorna il display soltanto se cambia e torna in deep sleep. Il server sceglie Morning Brief dalle 06:00 alle 11:00 e una foto del giorno dalle 11:00 alle 06:00, secondo Europe/Rome, inclusa l’ora legale. La generazione avviene quando il dispositivo richiede l’immagine; non serve un browser aperto. Il quadro controlla ogni 15 minuti, con nuovo tentativo dopo 5 minuti in caso di errore, conservando l’immagine precedente. L’autonomia a batteria va misurata sull’hardware reale.

Se viene eliminata la foto del giorno, al successivo aggiornamento (entro circa un minuto nella pagina quadro aperta) viene scelta una foto tra quelle rimaste. Se l’album è vuoto viene rimossa l’immagine precedente e mostrato l’invito a caricare una foto.


## News adattive

La pagina misura i testi con i font effettivi e usa lo spazio rimasto sotto le agende. Valuta fino a otto articoli unici, mantenendo le sei categorie iniziali e scegliendo gli extra tra gli aggiornamenti più recenti. Prova combinazioni di sei/otto news con abstract fino a tre righe oppure titoli compatti; nelle giornate molto dense può ridurre ulteriormente il numero di articoli per evitare sovrapposizioni. I caratteri delle news non vengono rimpiccioliti. Le notizie complete restano raggiungibili dai link nella webapp.

Gli abstract provengono dal campo `description` dei feed RSS: non sono generati dal titolo e non vengono inventati se la descrizione manca. Alcune fonti forniscono soltanto un breve sommario; il testo viene troncato con puntini di sospensione quando supera lo spazio assegnato.

La tipografia segue Figma: categorie 24 px Medium, titoli 18 px Regular, abstract 14 px Book e fonte 16 px Mono Regular. Il quadro non mostra QR; le colonne sono interamente dedicate ai testi. I link agli articoli restano disponibili nella webapp.

I reindirizzamenti `/n/ID` già creati sono mantenuti per i PNG esportati in precedenza. La dashboard non genera nuovi QR né nuove associazioni nello storage.


## Firmware ESP32-S3 e rendering server

Vedi [le istruzioni firmware](firmware/home-brief/README.md). Il primo test del pannello è in `firmware/display-test`. Il driver deriva dall’esempio ufficiale Waveshare, con licenza conservata accanto ai sorgenti.

Il server usa Playwright e Chromium (`@sparticuz/chromium`) per eseguire lo stesso Canvas della webapp, con gli stessi font e separatori Figma. Sharp produce i pixel; il Morning Brief è sogliato in bianco e nero, mentre le foto usano la versione a sei colori già preparata nell’album. Il buffer finale è verticale, 1200 × 1600, 4 bit per pixel, 960.000 byte. Le coppie di pixel sono inviate con il primo pixel nel nibble alto: nero 0, bianco 1, giallo 2, rosso 3, blu 5, verde 6.

`GET /api/device/frame` richiede la chiave display o amministratore. Restituisce un buffer binario privato, ETag, SHA-256 e intervallo fino al controllo successivo. `If-None-Match` permette risposte 304 senza riscaricare l’immagine. `?mode=brief` e `?mode=photo` permettono le prove manuali; il firmware segue normalmente l’orario automatico. Il brief viene trasmesso via HTTPS e conservato nello storage privato Blob come cache, per massimo 15 minuti prima della rigenerazione. Il servizio non introduce un nuovo accesso Google: usa i collegamenti già cifrati sul server.

In sviluppo macOS si può impostare `CHROMIUM_EXECUTABLE_PATH` al proprio Chrome; su Vercel il binario Linux è incluso automaticamente. Non mettere chiavi, immagini personali, dump della flash o `device-secrets.h` nel repository.
