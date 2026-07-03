# Legg appen på GitHub Pages

## GitHub Pages

1. Gå til `Settings` -> `Pages` i repoet.
2. Under `Build and deployment`, velg:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
3. Trykk `Save`.

Etter litt tid får du denne URL-en:

```text
https://theodor-tkd.github.io/tkd-performance-coach/
```

Åpne den på telefonen. Bruk nettleserens meny og velg "Legg til på hjemskjerm" hvis du vil bruke den som app.

## Viktig om lagring

Data lagres lokalt i nettleseren på enheten. Det betyr:

- Logger du på telefonen, ligger data på telefonen.
- Logger du på PC, ligger data på PC.
- Bruk backup/import i appen for å flytte data mellom enheter.

Ikke legg en privat API-nøkkel direkte i frontend-koden hvis repoet er public. Gratis AI kan brukes manuelt via "Kopier AI-analysepakke", eller senere via en liten backend/proxy.
