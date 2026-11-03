---
title: "Hosting"
description: "Beslut om var Utpost körs i molnet, med bortvalda alternativ, vad vi faktiskt hyr och vad som låser oss till Azure. Del av M6-momentet."
created: "2026-11-03"
published_date: "-"
last_modified_date: "2026-11-03"
version: "1"
---

## Beslut

Staging körs i Azure Container Apps (Consumption, Sweden Central). Appen har fyra containrar: client, api, postgres och mongo.

Containrarna körs som sidecars. Det betyder att de ligger i samma app, når varandra på localhost och startar och stängs av tillsammans.

Appen stängs av helt mellan passen, när ingen använder den. Första anropet efteråt startar den igen, och det kallar vi en kallstart.

Vid varje merge till main byter pipelinen avbildning i appen.

Produktion är inte beslutad. Det vi vet om den står under [Staging och produktion är inte samma sak](#staging-och-produktion-är-inte-samma-sak).

### Varför

- Avbildningarna ligger redan i GHCR, och Container Apps kör dem utan ändringar i koden
- Appen är avstängd när ingen använder den, och kostar då inget
- Pipelinen loggar in med OIDC, utan lösenord i GitHub
- Prenumerationen och resursgrupperna finns redan i kursen, så vi behöver inget betalkort
- Beslutet gäller staging. Produktion är inte beslutad

## Vad vi faktiskt hyr

### Klient och API

- Tjänst: Azure Container Apps, Consumption, en app med sidecars
- Nivå: PaaS (containrar)
- Vem sköter det: Microsoft sköter servrarna och skalningen (0 till 1 replika), vi sköter avbildningarna
- Kostnad i staging: 0 kr hittills, uppskattad. Appen ligger inom gratiskvoten

### Postgres

- Tjänst: `postgres:18` som sidecar i samma app, utan volym
- Nivå: ingen tjänst, vår egen container
- Vem sköter det: vi, och det finns ingen backup
- Kostnad i staging: ingår i klient och API

### MongoDB

- Tjänst: `mongo:8.2` som sidecar i samma app, utan volym
- Nivå: ingen tjänst, vår egen container
- Vem sköter det: vi, och det finns ingen backup
- Kostnad i staging: ingår i klient och API

### Avbildningar

- Tjänst: GitHub Container Registry (GHCR), publika paket
- Nivå: SaaS
- Vem sköter det: GitHub
- Kostnad i staging: 0 kr

### Deploy

- Tjänst: GitHub Actions med `az containerapp update`
- Nivå: SaaS
- Vem sköter det: GitHub kör jobbet, vi skriver det
- Kostnad i staging: 0 kr

### Resurser och kvot

De fyra containrarna begär 1,75 vCPU och 3,5 GiB tillsammans, se [staging.yaml](../../infra/azure/staging.yaml). Appen har `minReplicas: 0` och `maxReplicas: 1`.

Hela klassen delar prenumerationen, och därmed gratiskvoten.

Förbrukning hittills: appen har varit vaken c:a en timme, från att vi skapade den och testade.

Gratiskvoten är 180 000 vCPU-sekunder per månad. Med 1,75 vCPU räcker den till c:a 28,6 vakna timmar för hela klassen tillsammans.

Siffran är en uppskattning. Portalens kostnadsanalys har vi inte kunnat läsa.

## Alternativ vi jämförde

Vi har inte provat något av alternativen. Uppgifterna kommer från respektive leverantörs egna sidor i november 2026, och priser och villkor behöver kontrolleras igen innan ett beslut för produktion.

Vi jämförde tre leverantörer med samma krav: de ska köra våra Docker-avbildningar, helst kunna stängas av helt när ingen använder dem, och ha en region i EU.

### Scaleway Serverless Containers

- Leverantören är fransk, och tjänsten kan stänga av containrarna helt och starta dem igen vid första anropet
- Den har en gratisnivå på 400 000 GB-sekunder minne och 200 000 vCPU-sekunder per månad, men kräver ett betalkort
- Den kan inte koppla på lagringsvolymer, eftersom containrarna är tänkta att sakna tillstånd, så databaserna måste ligga i en annan tjänst
- Vi valde bort den för staging eftersom kursen ger oss en färdig Azure-prenumeration, och för att vi då hade behövt köra Postgres och Mongo som egna tjänster
- Den passar bäst av de tre om vi vill ha en europeisk leverantör för produktion

### Google Cloud Run

- Leverantören är amerikansk, och Cloud Run finns i regionen Stockholm
- Tjänsten kan köra flera containrar i samma tjänst (sidecars), så vår app med fyra containrar går att flytta nästan som den är
- Vi valde bort den eftersom vi då hade behövt ett eget konto och en egen betalmetod
- Den är det närmaste alternativet till Container Apps om vi lämnar Azure
- Vi har inte kontrollerat att avstängning vid inaktivitet och sidecars gäller i just Stockholm

### Safespring (hanterad Kubernetes)

- Leverantören är svensk, med datacenter i Sverige och Norge
- Själva Kubernetes-tjänsten kostar en fast summa på 4 900 kr per månad, och servrarna som kör containrarna kostar extra
- Det går inte att stänga av helt, så vi betalar även när ingen använder appen
- Vi valde bort den eftersom kostnaden är långt över vad en staging motiverar
- Den passar för produktion om svensk jurisdiktion väger tyngre än priset

## Staging och produktion är inte samma sak

Staging räcker för att testa en deploy. Produktion kräver mer.

- Databaserna ligger i staging som containrar utan volym och är tomma vid varje kallstart
- I produktion behövs hanterade databaser med backup, till exempel Azure Database for PostgreSQL och Cosmos DB for MongoDB
- `SEED_ON_START=1` är rätt för testdata i staging, men får aldrig vara på i produktion, eftersom den fyller en tom databas med påhittad data
- `minReplicas: 0` betyder att appen stängs av när ingen använder den. Det ger kallstart, så produktion behöver minst en replika igång, och flera om en ska kunna gå ner
- Hemligheterna skapas i staging av `skapa-staging.sh`, och produktion behöver en rutin för att byta dem
- Produktion ska vara en egen app, helst med någon som måste godkänna varje deploy

## Inlåsning

Ingenting i avbildningarna vet att de kör i Azure. Fyra filer och några värden skulle behöva ändras om vi flyttade.

### Filer som bara finns för Azure

- `infra/azure/staging.yaml`
- `infra/azure/skapa-staging.sh`
- `infra/azure/identitet.sh`
- Jobbet Deploy i `.github/workflows/ci.yml` (`azure/login` och `az containerapp update`)

### Filer som är likadana i alla moln

- `api/Dockerfile` och `client/Dockerfile`
- `client/nginx/default.conf.template`
- `.env.example`
- `api/src/`

### Värden som skiljer mellan compose och Azure

#### `API_UPSTREAM`

- Compose: `api:4000`
- Azure: `localhost:4000`, eftersom sidecars delar localhost

#### `POSTGRES_URL`

- Compose: `postgres:5432`, med lösenord ur `.env`
- Azure: `localhost:5432`, med lösenord som secret

#### `MONGODB_URL`

- Compose: `mongo:27017`, med lösenord ur `.env`
- Azure: `localhost:27017`, med lösenord som secret

#### `JWT_SECRET`

- Compose: värdet ur `.env`
- Azure: secret i appen, skapad av `skapa-staging.sh`

#### `SEED_ON_START`

- Compose: `1`
- Azure: `1`

## Konsekvenser

- Första anropet efter en paus tog 32 sekunder, från första anropet till `"ok":true`
- Anropet gick först ut i timeout efter 20 sekunder, sedan kom ett 502 medan api:et startade, och sedan svarade appen
- Databaserna fylls med ny testdata vid varje kallstart, så användare som någon registrerat försvinner när appen har stängts av
- Databaserna har ingen volym och ingen backup, så det finns inget att återställa från
- Vi har `maxReplicas: 1`, eftersom databaserna lever i samma replika. Går den ner är appen nere tills en ny har startat
- Deploy byter api och client i två anrop och ger två revisioner. Mellan dem kör appen en ny api med en gammal client
- Jobbet väntar därför på den sista revisionen och på rätt `sha`
- Deploy är inte en status check. Den körs efter merge, och är den röd är `main` ändå korrekt men staging uppdaterades inte
