# Home Brief

Una dashboard per trasformare un display e-paper in un quadro con le informazioni della giornata: data, meteo, due agende Google Calendar e sei notizie. Il layout è verticale, pensato per essere letto come una pagina stampata. La UI segue il progetto Figma: data a 90 px, meteo con condizioni e metriche a sinistra e previsioni a destra, agende affiancate della stessa altezza e sei news su tre righe. I contenuti del design sono segnaposto: la webapp usa le fonti reali configurate.

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
- Notizie dai feed RSS ANSA: tecnologia, mondo, cultura, scienza, economia e sport.
- Aggiornamento manuale e automatico ogni 15 minuti mentre la pagina è visibile.
- Ripristino di accessi e selezioni dopo il refresh nella stessa scheda, finché il token Google è valido.
- Anteprima, modalità solo quadro ed esportazione PNG. Gli stati delle fonti restano nei controlli della webapp e non vengono stampati in fondo al quadro.

## Tecnologie

| Tecnologia | Ruolo |
| --- | --- |
| Next.js 16, React 19 e TypeScript | Applicazione e API server |
| JavaScript, HTML e CSS | Interfaccia della dashboard |
| HTML Canvas 2D | Composizione tipografica e generazione del PNG |
| Google Identity Services e Calendar API v3 | Autorizzazione OAuth e lettura calendari/eventi |
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
5. Aggiungere alle origini JavaScript autorizzate `http://localhost:3000` e l’origine HTTPS del proprio sito, senza il percorso `/dashboard.html`.
6. Inserire il proprio client ID in `.env.local`:

```dotenv
GOOGLE_CLIENT_ID=il-proprio-client-id.apps.googleusercontent.com
```

7. Riavviare la webapp. Aprire **Collega Google Calendar**, accedere con l’account desiderato e selezionare i calendari. Ripetere con il secondo account per l’altra agenda.

Le autorizzazioni richieste sono `calendar.calendarlist.readonly` e `calendar.events.readonly`. Non è richiesto un client secret dal flusso attuale. Le etichette Andrea e Mavi sono nomi dell’interfaccia, non indirizzi Google né account precollegati; si possono cambiare in `public/app.js`, `public/live.js` e `public/dashboard.html`.

## Privacy e separazione dalla configurazione personale

Nel codice non sono inclusi client ID Google reali, password, token OAuth, indirizzi email, identificatori dei calendari o eventi reali. Gli esempi di agenda sono dimostrativi.

- Il client ID viene configurato nel proprio ambiente di hosting o nel browser; è un identificatore pubblico OAuth, non una password e non autorizza da solo l’accesso ai calendari.
- I token e le selezioni sono conservati nel `sessionStorage` della scheda. Sopravvivono al refresh; la chiusura della scheda normalmente termina la sessione, salvo il ripristino del browser. I token scaduti non vengono riutilizzati.
- Il pulsante Disconnetti rimuove la sessione salvata per quella persona. Alla scadenza Google occorre accedere nuovamente.
- Le richieste ai calendari partono direttamente dal browser verso Google. Token ed eventi non passano dalle API della webapp e non vengono salvati su GitHub.
- Gli eventi letti restano nella memoria della pagina. Il PNG esportato contiene ciò che è visibile sul quadro, inclusi gli appuntamenti scelti.
- `.env.local`, `.vercel/`, dipendenze e build sono esclusi da Git. Non aggiungere esportazioni o log contenenti dati personali.

## Pubblicazione su Vercel

Importare la propria copia del repository in Vercel come progetto Next.js. Configurare `GOOGLE_CLIENT_ID` nelle variabili d’ambiente dei deployment desiderati e aggiungere l’origine del nuovo sito al proprio client OAuth Google. Pubblicare nuovamente dopo aver cambiato le variabili.

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
| `tests/` | Controlli su fonti, fusi orari e sessioni Google |

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

**Stato dell’integrazione:** `/frame.html` applica gli orari mentre il browser è aperto. Nella fascia Morning Brief il contenuto è ancora una pagina con rendering Canvas nel browser, non un PNG generato da un servizio autonomo. I token Google scadono e richiedono un nuovo accesso: il brief delle 06:00 a browser chiuso e il download automatico dal dispositivo richiedono ancora l’integrazione server dei calendari e del firmware. La parte foto è già servita come immagine privata scaricabile con la chiave display.

Se viene eliminata la foto del giorno, al successivo aggiornamento (entro circa un minuto nella pagina quadro aperta) viene scelta una foto tra quelle rimaste. Se l’album è vuoto viene rimossa l’immagine precedente e mostrato l’invito a caricare una foto.
