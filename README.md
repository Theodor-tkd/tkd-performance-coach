# TKD Performance Log

Mobilvennlig treningslogg og rapport-app for ITF Taekwon-Do. Appen lagrer data lokalt i nettleseren med `localStorage` og gjør det raskt å logge Garmin-status, økter, dagsrapport og eksport til ChatGPT.

## Faner

1. `Today` - dagens dato, Garmin/status-sammendrag, dagens planlagte økter og dagens loggede økter.
2. `Calendar` - mobil ukesvisning og dagdetaljer.
3. `Logg` - quick workout log, redigering av gamle økter og avanserte sparring/intervall/Garmin-felt.
4. `Stats` - 7/14/30-dagers cards og korte flags.
5. `Export` - dagsrapport, valgt dato, 7/14/30-dagers rapport og backup/import.

## Daglig bruk

- Morgen: `Today` -> `Add Garmin-status` -> fyll søvn, søvnscore, HRV, hvilepuls, Body Battery, stress, energi, motivasjon, rygg og bein.
- Etter trening: `Logg` -> fyll økttype, tittel, varighet, RPE, puls, aktive kalorier, rygg/bein og notat.
- Kveld: `Export` -> fyll `Dagsrapport` -> `Kopier dagsrapport til ChatGPT`.

Hvis du logget feil, trykk en tidligere økt i Today, Calendar eller `Rediger tidligere økter`. Da åpnes økten i Logg-skjemaet og kan lagres på nytt.

## Dagsrapport

Dagsrapporten henter automatisk Garmin/status og økter for valgt dato. Du legger inn:

- Hva som føltes bra
- Hva som føltes dårlig
- Bein
- Rygg
- Kvalitet vs forventet
- Om planen ble fulgt
- Hva du er usikker på
- Hva du vil spørre trener/ChatGPT om

Knappen `Kopier dagsrapport til ChatGPT` lager en ferdig tekst med status, økter og spørsmål.

## Backup

Data ligger bare på enheten/nettleseren du bruker. Bruk `Export` jevnlig:

- `Last ned backup`
- `Kopier backup`
- `Importer tekst`
- `Importer fil`

Backup inkluderer treningslogg, Garmin-status, dagsrapporter, dagskalorier og planlagte økter.

## Filer

- `index.html` - statisk app-skall.
- `app.js` - mobilfaner, skjemaer, rapporter, eksport og backup.
- `trainingLog.js` - localStorage for økter, Garmin-status, dagsrapporter og analysegrunnlag.
- `planner.js` - lagring av planlagte/låste økter.
- `styles.css` - iPhone-first layout.
- `manifest.webmanifest` - PWA metadata.

## Publisering

Appen er statisk og kan publiseres direkte på GitHub Pages. For enklest opplasting kan `work/github-standalone-index.html` brukes som én samlet `index.html`.
