# Home Brief

Una dashboard per trasformare un display e-paper in un quadro con le informazioni della giornata: data, meteo, due agende Google Calendar e quattro notizie. Il layout è verticale, pensato per essere letto come una pagina stampata.

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
- Notizie dai feed RSS ANSA: tecnologia, mondo, cultura e scienza.
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
