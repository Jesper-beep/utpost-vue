---
title: "Serverless"
description: "Beslut om att flytta bildbehandlingen från API:et till en Azure Function, med bortvalda alternativ, uppmätta siffror och vad som låser oss till Azure. Del av M7-momentet."
created: "2026-11-09"
published_date: "-"
last_modified_date: "2026-11-09"
version: "1"
---

## Beslut

Bildbehandlingen körs i en Azure Function (`process-image`, HTTP-trigger) och inte längre i API:et. Funktionen använder `sharp`, precis som API:et gjorde.

API:et tar fortfarande emot bilden och kontrollerar att turen finns och tillhör användaren. Sedan skickar det bilden till funktionen med ett vanligt HTTP-anrop, och sparar varianterna som funktionen svarar med.

Funktionen körs på Flex Consumption (Node 24, Sweden Central). Den stängs av helt mellan anropen. Första anropet efteråt startar en ny instans, och det kallar vi en kallstart.

### Varför

- Bildbehandling tar lång tid och äter processor. I API:et stod resten av appen still medan den pågick: `/api/health` dröjde 7381 ms som längst under samtidiga uppladdningar, och 22 ms efter flytten
- Funktionen skalar för sig, så API:et behöver inte bli större för att klara fler uppladdningar
- Funktionen är avstängd när ingen laddar upp en bild

## Bakgrund

Före M7 gjorde API:et allt i samma anrop: tog emot bilden, kontrollerade den, beskar den och skapade åtta AVIF-varianter med `sharp`. Det hände i samma process som svarade på `/api/health`, inloggningar och GraphQL.

Uppladdningen ligger kvar i API:et, eftersom API:et vet vem som är inloggad. Bara själva bildbehandlingen har flyttat.

## Vad vi faktiskt hyr

### Bildfunktionen

- Tjänst: Azure Functions, plan Flex Consumption, en app (`utpost-vue-fn`)
- Nivå: FaaS
- Vem sköter det: Microsoft sköter servrarna och skalningen (0 till 10 instanser), vi sköter koden
- Inställningar: 2048 MB per instans, ett anrop i taget per instans, Node 24
- Kostnad i staging: inte avläst. Funktionen har inga instanser som alltid är igång, så den kostar bara när den körs

### Lagringskonto

- Tjänst: Azure Storage, ett konto som funktionen behöver för sin egen drift
- Nivå: PaaS
- Vem sköter det: Microsoft
- Kostnad i staging: inte avläst

### Publicering

- Tjänst: GitHub Actions med `Azure/functions-action`
- Nivå: SaaS
- Vem sköter det: GitHub kör jobbet, vi skriver det
- Kostnad i staging: 0 kr

## Alternativ vi jämförde

Vi har inte provat något av alternativen. Uppgifterna om Serverless Framework kommer från tilläggets egen sida på GitHub i november 2026. Resten är vår egen bedömning.

Vi jämförde tre sätt att lösa samma problem: att API:et inte ska stå still under en uppladdning.

### Behålla `sharp` i API:et

- Ingen ny tjänst, ingen nyckel och ingen kallstart
- Hela API:et är långsamt så fort någon laddar upp en bild, se [Mätningar](#mätningar)
- Fler samtidiga uppladdningar kräver ett större API
- Vi valde bort det eftersom det är problemet M7 ska lösa

### Blob Storage och Event Grid

- Webbläsaren laddar upp bilden direkt till Blob Storage. Event Grid startar funktionen när filen har kommit, och funktionen skriver varianterna tillbaka till lagringen
- API:et slipper bilddata helt, och det är det vanliga mönstret i Azure
- Det kräver ett lagringskonto med behörigheter, Event Grid och ett sätt för klienten att få veta när bilden är klar
- Staging har ingen volym idag, så det vore en större ombyggnad än M7 ryms i
- Vi valde bort det för nu. Det är vägen att gå om bilderna blir många eller stora

### Serverless Framework

- Verktyget beskriver funktioner i en konfigurationsfil och publicerar dem åt oss, hos flera leverantörer
- Stödet för Azure kommer från tillägget [serverless-azure-functions](https://github.com/serverless/serverless-azure-functions). Dess repo arkiverades den 9 december 2024 och tar inte emot några ändringar
- Senaste versionen är skriven för Serverless Framework 1.x, och en användare har frågat efter stöd för Azure Functions v4 utan att få det
- Vi har en funktion och en leverantör, så vi skulle få ett verktyg och en fil till utan att använda flexibiliteten
- Vi valde bort det. Vi skapar funktionen en gång med [skapa-funktion.sh](../../infra/azure/skapa-funktion.sh) och publicerar därefter med `Azure/functions-action`

## Mätningar

Vi mäter om API:et svarar medan många bilder laddas upp samtidigt. Skriptet [mat-upload.mjs](../../scripts/mat-upload.mjs) loggar in, skickar uppladdningarna samtidigt och frågar `/api/health` var 100:e millisekund.

Siffran vi jämför är `health max`, alltså den längsta tiden API:et dröjde med att svara på hälsokollen.

Båda mätningarna kördes lokalt i Docker. Efter flytten kördes funktionen med `npm --prefix functions start`.

### Innan du startar

1. Kör `npm run docker:up`
2. Kör `npm run docker:seed`
3. Seeden skriver ut en rad som `Testinloggning: <e-post> / hemligt123, tur <id>`. Använd den e-postadressen och turen nedan

### Före: `sharp` i API:et

```sh
node scripts/mat-upload.mjs --image <bildfil> --email <e-post> --tour <tur-id>
```

*Loggar in, laddar upp bilden flera gånger samtidigt och skriver ut hur länge `/api/health` som längst dröjde.*

- health max: 7381 ms
- Längsta uppladdningen: 28378 ms

### Efter: `sharp` i funktionen

Samma kommando, med funktionen igång i ett eget fönster.

- health max: 22 ms

API:et svarar alltså lika snabbt under uppladdningar som utan.

### Vad siffrorna inte visar

Funktionen kördes på samma dator som API:et, så själva uppladdningarna gick inte fortare. Samma processor gjorde samma arbete. Det vi mätte är att API:et inte längre står still.

## Var koden bor och vad som låser

Själva bildbehandlingen vet inte att den kör i Azure. Det gör bara filen som tar emot anropet, och det som skapar och publicerar funktionen.

### Filer som bara finns för Azure

- `functions/src/process-image.js` (registrerar utlösaren med `@azure/functions`)
- `functions/host.json`
- `infra/azure/skapa-funktion.sh`
- Jobbet Deploy to Azure Functions i `.github/workflows/ci.yml` (`azure/login` och `Azure/functions-action`)

### Filer som är likadana i alla moln

- `functions/src/image.js` (all bildbehandling, importerar inget från Azure)
- `api/src/lib/imageFunction.ts`, utom namnet på headern med nyckeln
- `api/src/routes/photos.ts`
- Klientens komponenter för uppladdningen

### Värden som hör till Azure

#### `IMAGE_FUNCTION_URL`

- Compose: `http://host.docker.internal:7071/api/process-image`
- Azure: funktionens adress, som miljövariabel i Container App

#### `IMAGE_FUNCTION_KEY`

- Compose: värdet ur `.env`, tomt som standard
- Azure: funktionsnyckeln, som secret i Container App

#### `x-functions-key`

- Headern som API:et skickar nyckeln i. Namnet är Azures

### Om vi flyttade

- `image.js` går att köra i vilken Node-miljö som helst
- `process-image.js` skrivs om till den nya leverantörens form
- API:et behöver en ny adress, en ny nyckel och ett annat namn på headern
- Skriptet och pipelinejobbet byts ut. Det är det mesta av jobbet

## Konsekvenser

- Första uppladdningen efter en paus är en kallstart. Då startar en ny instans innan bilden behandlas
- API:et väntar på funktionen i högst 60 sekunder. Går det inte att nå funktionen får användaren 502, och avvisar funktionen bilden får användaren 400
- Funktionen svarar med varianterna som base64, vilket gör svaret c:a en tredjedel större än bilderna. Det går bra för åtta varianter av en bild, men inte för stora filer
- Bilderna sparas fortfarande på API:ets disk. Staging har ingen volym, så de försvinner när appen startas om, precis som databaserna. Se [hosting.md](hosting.md)
- Nyckeln visas bara när funktionen skapas och får inte läggas i någon fil i repot
- Det finns en tjänst, en nyckel och ett pipelinejobb till att sköta
- Lokalt kräver uppladdningen att funktionen körs, med `npm --prefix functions start`
- Deploy to Azure Functions är inte en status check. Den körs efter merge, och är den röd är `main` ändå korrekt men funktionen uppdaterades inte
- Röktestet i pipelinen skickar data som inte är en bild och väntar på 400. Det visar att koden kör och att nyckeln fungerar, men inte att en riktig bild går att behandla. Det prövas med en uppladdning efter merge
