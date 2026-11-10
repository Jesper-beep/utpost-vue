---
title: "Serverless"
description: "Beslut om att flytta bildbehandlingen från API:et till en Azure Function, med uppmätta siffror, bortvalt alternativ och vad som låser oss till Azure. Del av M7-momentet."
created: "2026-11-09"
published_date: "-"
last_modified_date: "2026-11-10"
version: "1"
---

## Beslut

Vi har flyttat bildbehandlingen från API:et till en Azure Function (`process-image`, HTTP-trigger). Funktionen använder `sharp`, precis som API:et gjorde.

API:et tar fortfarande emot bilden och kontrollerar att turen finns och tillhör användaren. Sedan skickar det bilden till funktionen och sparar varianterna som funktionen svarar med.

Funktionen stängs av helt mellan anropen, när ingen använder den. Första anropet efteråt startar en ny instans, och det kallar vi en kallstart.

### Motivering

- Bildbehandling tar lång tid och belastar processorn hårt. Medan API:et behandlade bilderna dröjde `/api/health` som längst 1215 ms (median). Nu är det 25 ms
- Funktionen skalar för sig, så API:et behöver inte bli större för att klara fler uppladdningar
- En bild som är för stor kraschar funktionen. API:et fortsätter svara på inloggning och turer
- Funktionen är avstängd när ingen laddar upp en bild
- Vi behåller `sharp`, så bilderna blir likadana som förut

## Bakgrund

Före M7 gjorde API:et allt i samma anrop: tog emot bilden, kontrollerade den, beskar den och skapade åtta AVIF-varianter med `sharp`. Det hände i samma process som svarade på `/api/health`, inloggningar och GraphQL.

Det är skuld 9 i [skulddokumentet](../debt.md): en bild som är för stor kan använda upp API:ets minne och få tjänsten att sluta svara.

Vi mätte vad en uppladdning kostar resten av appen. Medan flera bilder laddades upp samtidigt dröjde `/api/health` som längst 1215 ms (median). Hur vi mätte beskrivs under [Mätningar](#mätningar).

## Alternativ vi jämförde

Vi har inte provat Serverless Framework. Uppgifterna om verktyget kommer från tilläggets egen sida på GitHub i november 2026. Resten är vår egen bedömning.

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

Vi mäter hur länge `/api/health` som längst dröjer medan flera bilder laddas upp samtidigt. Den tiden kallar vi *längsta svarstid*.

Skriptet [mat-upload.mjs](../../scripts/mat-upload.mjs) loggar in, skickar uppladdningarna samtidigt och frågar `/api/health` var 100:e millisekund. Båda mätningarna kördes lokalt i Docker.

### Innan du startar

1. Kör `npm run docker:up`
2. Kör `npm run docker:seed`
3. Seeden skriver ut en rad som `Testinloggning: <e-post> / hemligt123, tur <id>`. Använd den e-postadressen och turen nedan
4. Efter flytten: starta den lokala ersättningen för funktionen med `node scripts/lokal-funktion.mjs`, i en egen terminal ([lokal-funktion.mjs](../../scripts/lokal-funktion.mjs))

### Kommandot

```sh
node scripts/mat-upload.mjs --image "/sökväg/till/bild.jpg" --email "e-post" --tour "tur-id"
```

*Loggar in, laddar upp bilden flera gånger samtidigt och skriver ut hur länge `/api/health` som längst dröjde.*

### Före: `sharp` i API:et

Fem körningar med tio uppladdningar samtidigt. Siffrorna varierar mellan körningarna, så vi visar medianen.

- Längsta svarstid för `/api/health`: 1215 ms
- Längsta uppladdningen: 49,1 s

Över de fem körningarna låg `/api/health` mellan 13 och 9933 ms, och uppladdningarna mellan 47,0 och 51,9 s.

### Efter: `sharp` i funktionen

Fem körningar med tio uppladdningar samtidigt, mot den lokala ersättningen för funktionen. Siffrorna varierar mellan körningarna, så vi visar medianen.

- Längsta svarstid för `/api/health`: 25 ms
- Längsta uppladdningen: 25,8 s

Över de fem körningarna låg `/api/health` mellan 23 och 201 ms, och uppladdningarna mellan 25,1 och 26,6 s. Jämfört med före är svarstiden för `/api/health` ungefär 50 gånger lägre och uppladdningen ungefär dubbelt så snabb. Körningarna gjordes inte om varandra, så en del av skillnaden kan bero på maskinens belastning.

Mätningarna gick via klienten på port 3001, så varje health-anrop har även proxyns tid med sig. Ersättningen kör samma bildbehandling som funktionen, men utan Azure-värdens omkostnad.

## Kallstart

Funktionen stängs av när ingen använder den, så första anropet efter en paus startar en ny instans. Vi mätte direkt mot funktionen i Azure, utan API:et emellan, så att staging inte också behöver väckas från noll.

Första anropet gjordes efter en paus, och aldrig direkt efter en deploy. En deploy startar om funktionen, så det hade blivit en kallstart som inte säger något om en vanlig dag.

### Så mätte vi

```sh
az login
RESURSGRUPP="ditt-resursgrupp"
BILDFIL="/sökväg/till/bild.jpg"
KEY="$(az functionapp keys list --name utpost-vue-fn --resource-group "$RESURSGRUPP" --query functionKeys.default --output tsv)"
for run in 1 2 3; do
  curl -s -o "$TMPDIR/svar.json" -w "total tid: %{time_total}s\n" -X POST -H "x-functions-key: $KEY" -H "Content-Type: image/jpeg" --data-binary "@$BILDFIL" https://utpost-vue-fn.azurewebsites.net/api/process-image
  jq '{coldStart, instance, processingMs}' "$TMPDIR/svar.json"
done
unset KEY
```

*Hämtar nyckeln, skickar bilden tre gånger och skriver ut total tid, om det var en kallstart, vilken instans som körde och hur länge bildbehandlingen tog. Nyckeln skrivs aldrig ut.*

### Kall

Det första anropet efter pausen gjordes med en skärmbild: 20,9 s totalt, varav 19,2 s bildbehandling.

Därefter gjorde vi nio anrop med ett foto på 4592 × 2584 px. Sju av dem startade en ny instans (`coldStart: true`, olika `instance`).

- Total tid: 20,9 till 22,1 s
- Bildbehandlingen: 19,2 till 19,8 s
- Tid utanför bildbehandlingen: 1,6 till 2,6 s

### Varm

Samma foto. Två av de nio anropen körde på instanser som redan var igång (`coldStart: false`).

- Total tid: 22,2 s och 21,0 s
- Bildbehandlingen: 20,4 s och 19,2 s
- Tid utanför bildbehandlingen: 1,8 s i båda

Tiden utanför bildbehandlingen var 1,6–2,6 s för de kalla anropen och 1,8 s för de varma - så skillnaden syns inte i mätningarna. Två varma anrop är för få för att säga något säkert.

### Duger kallstarten?

Ja, den duger. Vi ser ingen mätbar skillnad mellan kalla och varma anrop, och variationen mellan anropen är större än skillnaden.

Det som tar tid är bildbehandlingen, c:a 19 s per bild i Azure. Den tar lika lång tid på en kall som på en varm instans. Hur mycket av det som är AVIF-kodningen och hur mycket som är instansens processorkraft har vi inte undersökt.

Azure startar ibland en ny instans trots att varma instanser finns. Det såg vi i mätningarna, och vi vet inte varför.

## Var koden bor och vad som låser

Bara filen som tar emot anropet och det som skapar och publicerar funktionen vet att koden körs i Azure.

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

Om vi flyttar skrivs `process-image.js` om till den nya leverantörens form. API:et får en ny adress och en ny nyckel, och skriptet och pipelinejobbet byts ut. `image.js` går att köra i vilken Node-miljö som helst.

## Konsekvenser

- Första uppladdningen efter en paus är en kallstart. Vi ser ingen mätbar skillnad mot en varm instans. Se [Kallstart](#kallstart)
- Bildbehandlingen tar c:a 19 s per bild i Azure. API:et väntar på den, så uppladdningen i webbläsaren tar lika lång tid
- Kostnaden i staging har vi inte kunnat läsa av. Funktionen har inga instanser som alltid är igång, så den kostar bara när den körs
- Nyckeln visas bara när funktionen skapas. Den ligger som secret i Container App och får inte läggas i någon fil i repot
- Vi har två jobb som publicerar till Azure: Deploy to Azure staging för api och client, och Deploy to Azure Functions för funktionen
- Ingen av dem är en obligatorisk statuscheck. Om något av dem blir rött är `main` ändå korrekt, men Azure har inte uppdaterats
- Röktestet i pipelinen skickar data som inte är en bild och väntar på 400. Det visar att koden kör och att nyckeln fungerar. Att en riktig bild går att behandla prövas med en uppladdning efter merge
- API:et väntar på funktionen i högst 60 sekunder. Om funktionen inte går att nå får användaren 502, och om den avvisar bilden får användaren 400
- Funktionen svarar med varianterna som base64, vilket gör svaret c:a en tredjedel större än bilderna
- Bilderna sparas fortfarande på API:ets disk. Staging har ingen volym, så de försvinner när appen startas om
- Permanent lagring hade inneburit Blob Storage och Event Grid, och det blev för mycket för M7. Så det valde vi bort
- Lokalt kräver uppladdningen att den lokala ersättningen körs, med `node scripts/lokal-funktion.mjs`
