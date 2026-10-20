# Display test — Waveshare ESP32-S3-ePaper-13.3E6

Prima prova hardware, indipendente dalla webapp: una sola immagine verticale 1200 × 1600 con scritte, bordo e sei colori. Non usa Wi-Fi, account Google, credenziali o scheda SD. Dopo il refresh manda il pannello in sleep e disabilita la sua alimentazione; l’immagine resta visibile. Ogni riaccensione o reset esegue nuovamente la prova.

## Sorgenti e modifiche

Driver e font provengono dall’esempio ufficiale Waveshare `03_E-Paper_Example`, commit `f8e9456bd1ca520f638786142fc17a74154f4e05`:
https://github.com/waveshareteam/ESP32-S3-ePaper-13.3E6/tree/f8e9456bd1ca520f638786142fc17a74154f4e05/example/Arduino-3.2.0/examples/03_E-Paper_Example

Sono mantenuti gli avvisi di copyright nei sorgenti e il file `LICENSE.waveshare`. Rispetto all’esempio, il test usa un proprio disegno, non cancella l’immagine alla fine e interrompe l’attesa BUSY dopo 120 secondi spegnendo il pannello, per evitare un’attesa infinita in caso di collegamento errato.

## Compilazione

Richiede Arduino CLI e il core Espressif `esp32:esp32@3.2.0`. Per il modulo ESP32-S3-WROOM-2-N32R16V verificato tramite esptool: flash da 32 MB e PSRAM OPI da 16 MB. La configurazione Arduino ufficiale Waveshare indica Flash Mode QIO 80 MHz; viene mantenuta anche se esptool descrive il tipo fisico di flash come octal.

```sh
arduino-cli compile \
  --fqbn 'esp32:esp32:esp32s3:FlashMode=qio,FlashSize=32M,PSRAM=opi,USBMode=hwcdc,CDCOnBoot=cdc,PartitionScheme=default_8MB' \
  --output-dir /percorso/build-display-test \
  firmware/display-test
```

Prima di scrivere, eseguire un backup privato completo della flash con esptool. Non includerlo nel repository: potrebbe contenere informazioni personali del firmware precedentemente installato. Le partizioni di questa prova occupano i primi 8 MB della flash, pur configurando la dimensione fisica a 32 MB.

Collegare tramite cavo USB dati; la batteria non è necessaria. Per entrare nel bootloader tenere premuto BOOT durante il collegamento USB, quindi rilasciarlo. Individuare la porta effettiva sul proprio computer; non copiare alla cieca nomi di porte altrui. I due DIP della modalità display non sono interruttori di alimentazione USB.

## Verifica

Monitor seriale a 115200 baud. Messaggi attesi: `HOME_BRIEF_TEST`, `FRAME_READY`, `REFRESH_START`, `REFRESH_DONE`. I messaggi del test vengono inviati sia alla USB CDC sia alla UART0 (RX44/TX43); sulla UART viene stampato anche un heartbeat ogni 5 secondi dopo il test o in caso di errore di allocazione. Il buffer da 960000 byte viene allocato in PSRAM; in caso di errore di memoria il display non viene inizializzato.

Durante il refresh il pannello può mostrare lampeggi e campi di colore: attendere la fine prima di scollegare. Verificare visivamente tutte le aree del pannello, i sei colori e la posizione delle scritte TOP/ALTO e BOTTOM/BASSO. Questo test non contiene ancora il Morning Brief e non implementa la rotazione giornaliera delle foto.
