# Home Brief — ESP32-S3-ePaper-13.3E6

Firmware per il pannello Waveshare Spectra 6 13,3 pollici, con ESP32-S3-WROOM-2 N32R16V. Orientamento verticale 1200 × 1600. Il driver e il collegamento sono stati verificati con il test a sei colori.

## Compilazione

Arduino ESP32 **3.2.0**, scheda ESP32S3 Dev Module, flash **QIO 80 MHz**, 32 MB, PSRAM OPI, USB Hardware CDC/JTAG, CDC on boot abilitato. La configurazione QIO segue l’esempio Waveshare ed è quella verificata su questa scheda.

```sh
arduino-cli compile --fqbn 'esp32:esp32:esp32s3:FlashMode=qio,FlashSize=32M,PSRAM=opi,USBMode=hwcdc,CDCOnBoot=cdc,PartitionScheme=default_8MB' firmware/home-brief
```

Il pannello usa SCK 9, MOSI 46, CS master 10, CS slave 3, DC 11, RESET 2, BUSY 12, alimentazione 1. I selettori della scheda sono BS0/BS1 di comunicazione, non interruttori USB. Sull’esemplare verificato entrambi sono nella posizione originale OFF. Non spostare o scollegare cavi durante un aggiornamento.

## Prima configurazione

1. Al primo avvio la scheda apre la rete protetta `HomeBrief-Setup`. La password casuale è mostrata sulla porta seriale UART/CH343 a 115200 baud, TX 43 / RX 44. Non viene mostrata la password della rete domestica.
2. Collegarsi alla rete dal telefono e aprire `http://192.168.4.1`. Inserire SSID e password di una rete Wi-Fi **2,4 GHz**, il proprio indirizzo HTTPS e la chiave `PHOTO_DISPLAY_KEY` del proprio server. Non usare la chiave amministratore.
3. Salvare: il quadro si riavvia, scarica il contenuto previsto dall’orario e si aggiorna. Nessun account Google va inserito sul dispositivo.

In alternativa il proprietario può predisporre localmente un file **ignorato da Git** `device-secrets.h` con `DEVICE_SITE` e `DEVICE_KEY`. In quel caso il modulo Wi-Fi chiede solo SSID e password. Le credenziali vengono conservate nella memoria NVS della scheda; il firmware di sviluppo non abilita flash encryption o secure boot, quindi chi possiede fisicamente la scheda può estrarle.

Per riaprire la configurazione, tenere premuto BOOT durante l’avvio del programma: premere RST e subito dopo BOOT, rilasciando BOOT dopo l’apertura della rete. Non tenere BOOT premuto prima del reset, perché avvierebbe il bootloader di caricamento. In caso di rete non raggiungibile il portale si apre automaticamente per 10 minuti; poi il dispositivo riprova.

## Funzionamento

HTTPS con verifica GTS Root R1, ora sincronizzata via NTP, chiave di sola lettura, download intero in PSRAM. Il pannello riceve comandi solo dopo aver verificato i 960.000 byte, l’hash SHA-256 e tutti i codici colore. Un errore di rete conserva la foto precedente. L’ETag resta in memoria RTC durante il deep sleep: se l’immagine non cambia non viene riscritta.

Controlli ai quarti d’ora; cambio fascia 06:00 / 11:00 Europe/Rome, con il tempo necessario al download e all’aggiornamento fisico del pannello. Dopo un errore il tentativo successivo è dopo 5 minuti. La batteria richiede adattatore e polarità corretti; l’autonomia non è stata ancora misurata. Per ora la prova si svolge via USB.

Il certificato radice va aggiornato se il proprio hosting cambia autorità di certificazione. Nessuna modalità TLS non verificata è prevista.

Driver: [Waveshare ufficiale](https://github.com/waveshareteam/ESP32-S3-ePaper-13.3E6), commit `f8e9456bd1ca520f638786142fc17a74154f4e05`. Vedi `LICENSE.waveshare`. Il timeout BUSY spegne il pannello e sospende l’esecuzione in caso di mancata risposta.
