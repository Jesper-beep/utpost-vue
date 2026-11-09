---
title: "Serverless"
description: "Beslut om att flytta bildbehandlingen från API:et till en Azure Function, med uppmätta siffror, bortvalt alternativ och vad som låser oss till Azure. Del av M7-momentet."
created: "2026-11-09"
published_date: "-"
last_modified_date: "2026-11-09"
version: "1"
---

## Beslut

Vi har flyttat bildbehandlingen från API:et till en Azure Function (`process-image`, HTTP-trigger). Funktionen använder `sharp`, precis som API:et gjorde.

API:et tar fortfarande emot bilden och kontrollerar att turen finns och tillhör användaren. Sedan skickar det bilden till funktionen och sparar varianterna som funktionen svarar med.

Funktionen stängs av helt mellan anropen, när ingen använder den. Första anropet efteråt startar den igen, och det kallar vi en kallstart.

### Motivering

- Bildbehandling tar lång tid och äter processor. Medan API:et behandlade bilderna dröjde `/api/health` som längst 7381 ms. Nu dröjer den 22 ms
- Funktionen skalar för sig, så API:et behöver inte bli större för att klara fler uppladdningar
- En bild som är för stor tar ner funktionen. API:et fortsätter svara på inloggning och turer
- Funktionen är avstängd när ingen laddar upp en bild
- Vi behåller `sharp`, så bilderna blir likadana som förut

## Bakgrund

Före M7 gjorde API:et allt i samma anrop: tog emot bilden, kontrollerade den, beskar den och skapade åtta AVIF-varianter med `sharp`. Det hände i samma process som svarade på `/api/health`, inloggningar och GraphQL.

Det är skuld 9 i [skulddokumentet](../debt.md): en bild som är för stor kan använda upp API:ets minne och få tjänsten att sluta svara.

Vi mätte vad en uppladdning kostar resten av appen. Medan flera bilder laddades upp samtidigt dröjde `/api/health` 7381 ms som längst. Så här mätte vi står under [Mätningar](#mätningar).

## Alternativ vi jämförde

Vi har inte provat Serverless Framework. Uppgifterna om det kommer från tilläggets egen sida på GitHub i november 2026. Resten är vår egen bedömning.

### Azure Functions (valt)

- Funktionen ligger i `functions/` i samma repo. Vi skapar den en gång med [skapa-funktion.sh](../../infra/azure/skapa-funktion.sh), och därefter publicerar pipelinen den med `Azure/functions-action`
- Pipelinen loggar in med samma OIDC-identitet som för staging
- Den är avstängd när ingen laddar upp en bild, och kostar bara när den körs
- Nackdelen är kallstarten, se [Konsekvenser](#konsekvenser)

### Serverless Framework

- Verktyget beskriver funktionerna i en konfigurationsfil och publicerar dem åt oss, hos flera olika leverantörer
- Stödet för Azure kommer från tillägget [serverless-azure-functions](https://github.com/serverless/serverless-azure-functions)
- Tilläggets repo arkiverades den 9 december 2024 och tar inte emot några ändringar
- Senaste versionen är skriven för Serverless Framework 1.x, och en användare har bett om stöd för Azure Functions v4. Vi hittade inget svar på det
- Vi valde bort det eftersom stödet för Azure inte längre underhålls
- Det hade passat om vi hade flera funktioner, eller ville kunna byta leverantör utan att skriva om hur vi publicerar. Vi har en funktion och en leverantör

## Mätningar

Vi mäter hur länge API:et som längst dröjer med att svara på `/api/health` medan flera bilder laddas upp samtidigt. Siffran kallar vi `health max`.

Skriptet [mat-upload.mjs](../../scripts/mat-upload.mjs) loggar in, skickar uppladdningarna samtidigt och frågar `/api/health` var 100:e millisekund. Båda mätningarna kördes lokalt i Docker.

### Innan du startar

1. Kör `npm run docker:up`
2. Kör `npm run docker:seed`
3. Seeden skriver ut en rad som `Testinloggning: <e-post> / hemligt123, tur <id>`. Använd den e-postadressen och turen nedan
4. Efter flytten: kör funktionen med `npm --prefix functions start`

### Kommandot

```sh
node scripts/mat-upload.mjs --image <bildfil> --email <e-post> --tour <tur-id>
```

*Loggar in, laddar upp bilden flera gånger samtidigt och skriver ut hur länge `/api/health` som längst dröjde.*

### Före: `sharp` i API:et

- health max: 7381 ms
- Längsta uppladdningen: 28378 ms

### Efter: `sharp` i funktionen

- health max: 22 ms

API:et svarar alltså lika snabbt under uppladdningar som utan. Observera att funktionen kördes på samma dator, så uppladdningarna tog lika lång tid som förut.

## Var koden bor och vad som låser

Bara filen som tar emot anropet och det som skapar och publicerar funktionen vet att koden kör i Azure.

### Filer som bara finns för Azure

- `functions/src/process-image.js` (registrerar utlösaren med `@azure/functions`)
- `functions/host.json`
- `infra/azure/skapa-funktion.sh`
- Jobbet Deploy to Azure Functions i `.github/workflows/ci.yml` (`azure/login` och `Azure/functions-action`)

### Filer som är likadana i alla moln

- `functions/src/image.js` (all bildbehandling, importerar inget från Azure)
- `api/src/lib/imageFunction.ts`, utom namnet på headern med nyckeln (`x-functions-key`)
- `api/src/routes/photos.ts`
- Klientens komponenter för uppladdningen

### Värden som skiljer mellan compose och Azure

#### `IMAGE_FUNCTION_URL`

- Compose: `http://host.docker.internal:7071/api/process-image`
- Azure: funktionens adress, som miljövariabel i Container App

#### `IMAGE_FUNCTION_KEY`

- Compose: värdet ur `.env`, tomt som standard
- Azure: funktionens nyckel, som secret i Container App

Om vi flyttade skrivs `process-image.js` om till den nya leverantörens form. API:et får en ny adress och en ny nyckel, och skriptet och pipelinejobbet byts ut. `image.js` går att köra i vilken Node-miljö som helst.

## Konsekvenser

- Första uppladdningen efter en paus är en kallstart
- Kostnaden i staging har vi inte kunnat läsa av. Funktionen har inga instanser som alltid är igång, så den kostar bara när den körs
- Nyckeln visas bara när funktionen skapas. Den ligger som secret i Container App och får inte läggas i någon fil i repot
- Vi har två jobb som publicerar till Azure: Deploy to Azure staging för api och client, och Deploy to Azure Functions för funktionen
- Ingen av dem är en status check. Blir en röd är `main` ändå korrekt, men Azure uppdaterades inte
- Röktestet i pipelinen skickar data som inte är en bild och väntar på 400. Det visar att koden kör och att nyckeln fungerar. Att en riktig bild går att behandla prövas med en uppladdning efter merge
- API:et väntar på funktionen i högst 60 sekunder. Går det inte att nå funktionen får användaren 502, och avvisar funktionen bilden får användaren 400
- Funktionen svarar med varianterna som base64, vilket gör svaret c:a en tredjedel större än bilderna
- Bilderna sparas fortfarande på API:ets disk. Staging har ingen volym, så de försvinner när appen startas om
- Permanent lagring hade betytt Blob Storage och Event Grid. Det valde vi bort för M7
- Lokalt kräver uppladdningen att funktionen körs, med `npm --prefix functions start`
