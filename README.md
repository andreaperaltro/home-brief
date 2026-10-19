# Home Brief

Dashboard personale per display e-paper verticale 1200 × 1600.

## Avvio

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Inserire il proprio `GOOGLE_CLIENT_ID` in `.env.local`, oppure nelle variabili d’ambiente del progetto Vercel. Il valore non viene incluso nel repository. Aprire `/dashboard.html`.

## Fonti reali

- Meteo di Milano: Open-Meteo, con ripiego MET Norway.
- Quattro notizie dai feed ufficiali ANSA: tecnologia, mondo, cultura, scienza.
- Google Calendar: accesso interattivo in sola lettura con Google Identity Services. Andrea e Mavi accedono separatamente al proprio account e selezionano uno o più calendari. Le due sessioni sono indipendenti.
- Aggiornamento ogni 15 minuti mentre la pagina è visibile, oltre al pulsante manuale.
- PNG bianco/nero 1200 × 1600, con esportazione ruotata 1600 × 1200.

## Google e privacy

Abilitare Google Calendar API nel proprio progetto Google Cloud e creare un client OAuth di tipo applicazione web. Aggiungere l’origine HTTPS del proprio deployment Vercel alle origini JavaScript autorizzate. Gli account autorizzati devono essere utenti di test finché l’app resta in test.

Il repository non contiene credenziali Google, identificatori dei calendari o eventi personali. I token OAuth e le selezioni sono conservati in sessionStorage nella scheda del browser per sopravvivere al refresh. I token vengono inviati direttamente alle API Google, senza passare dal server. La disconnessione rimuove la sessione salvata; la chiusura della scheda termina questa conservazione. Alla scadenza del token Google occorre accedere nuovamente. Anche gli eventi rimangono nella memoria della pagina. Il client ID è un identificatore pubblico, fornito al browser dall’endpoint di configurazione, ma è configurato esclusivamente nell’ambiente di hosting. Nessun client secret è richiesto dal flusso attuale.

Su Vercel impostare `GOOGLE_CLIENT_ID` negli ambienti desiderati. Non aggiungere file `.env.local`, `.vercel/`, log o esportazioni del calendario al repository.

## Verifica

```sh
npm test
npm run build
```

L’aggiornamento autonomo a pagina chiusa e l’invio automatico al dispositivo richiedono una successiva integrazione. I font forniti per questo progetto rimangono soggetti alla rispettiva licenza.
