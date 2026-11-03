# Pipeline

## Flöde

```mermaid
flowchart LR
  B[branch + commit] --> PR[pull request]
  PR --> CI[CI: kvalitet på ubuntu, macos, windows och integration på ubuntu]
  CI --> S{gröna?}
  S -->|ja| G{godkänd + uppdaterad mot main?}
  S -->|nej| F[fixa, pusha igen]
  F --> PR
  G -->|ja| M[merge till main]
  G -->|nej| F
  M --> D[Deploy to Azure staging: byt avbildning till commitens sha, vänta på /api/health, röktesta]
  D --> ST[staging kör den mergade committen]
```

## Jobb

CI har fyra jobb i `.github/workflows/ci.yml`.

- SlopChecker2000: lint, typkontroll, tester och bygge av klienten. Körs på ubuntu, macos och windows
- Integration: API:ets integrationstester mot riktiga databaser. Körs på ubuntu
- Image: bygger Docker-avbildningarna för api och client. Körs på ubuntu och väntar på SlopChecker2000
- Deploy to Azure staging: byter avbildning på api och client i Azure Container Apps. Körs på ubuntu, bara vid push till main, och väntar på Image och Integration

Integration är oberoende av SlopChecker2000, så de två körs samtidigt.

## Steg och tider

Stegen i SlopChecker2000. Tid per steg och operativsystem i sekunder.

- Ubuntu: 25 sekunder
- macOS: 26 sekunder
- Windows: 49 sekunder

### `npm ci`

Fångar package-lock.json som inte stämmer med package.json.

Före M6, med React-klienten i `web/`:

- Tid på ubuntu: 10 sekunder
- Tid på macos: 11 sekunder
- Tid på windows: 19 sekunder

Efter M6, när `web/` var borttagen:

- Tid på ubuntu: 9 sekunder
- Tid på macos: 11 sekunder
- Tid på windows: 18 sekunder

Skillnaden är liten, eftersom installationen mest består av de paket som `api/` och `client/` behöver. I M6 behövde bara vyn Profil portas från `web/` till `client/`. De andra vyerna fanns redan i Vue.

### `biome ci`

Fångar lintfel, varningar, felformatering, osorterat.

- Tid på ubuntu: 1 sekund
- Tid på macos: 1 sekund
- Tid på windows: 1 sekund

### `npm run lint:md`

Fångar trasig markdown i dokumenten.

- Tid på ubuntu: 0 sekunder
- Tid på macos: 1 sekund
- Tid på windows: 1 sekund

### `npm run lint:spelling`

Fångar stavfel i .js, .jsx och .md.

- Tid på ubuntu: 2 sekunder
- Tid på macos: 2 sekunder
- Tid på windows: 4 sekunder

### `npm run typecheck`

Kör först codegen, som genererar klientens typer ur `api/src/graphql/schema.js`. Fångar typfel i api och klient, och frågor som använder ett fält som inte finns i schemat.

### `npm test`

Fångar att testerna körs (ett röktest än så länge).

- Tid på ubuntu: 2 sekunder
- Tid på macos: 1 sekund
- Tid på windows: 2 sekunder

### `npm run build`

Fångar fel som bara syns när klienten byggs.

- Tid på ubuntu: 0 sekunder
- Tid på macos: 1 sekund
- Tid på windows: 2 sekunder

## Integrationsjobbet

Jobbet kör API:ets integrationstester mot riktiga databaser.

- Postgres 18 och MongoDB 8.2 startas som `services`, med hälsokontroll
- Adresserna och `JWT_SECRET` sätts som miljövariabler. Hemligheten gäller bara CI

### `npm run seed`

Fyller Postgres med testdata.

### `npm run migrate:logs`

Flyttar turloggarna till MongoDB och kontrollerar antalet dokument och mätpunkter mot Postgres. Fångar en migrering som tappar data.

### `npm run test:api`

Fångar N+1 i turlistan och saknat inloggningskrav för `createTour`. Se [testing.md](testing.md).

## Deploy

Jobbet bygger ingenting. Det säger åt Container Apps att köra de avbildningar som Image redan byggt, med taggen `sha-` och commitens sju första tecken.

- Loggar in i Azure med OIDC. Inga lösenord i GitHub, bara id:n som variabler på miljön `azure-staging`. Resursgruppens namn är en secret, så att det inte syns i loggen
- Byter avbildning på `api` och `client`. Det ger två revisioner per deploy
- Väntar tills `/api/health` svarar med commitens hela sha och sista revisionen är klar
- Röktestar `/graphql` genom nginx, med ett anrop som kräver data ur databasen

Att kommandot gick igenom betyder bara att Azure tog emot beställningen, därför väntar jobbet på rätt sha.

- Tid på main: 102 sekunder (1 minut och 42 sekunder)
- Revisioner efter deploy: `utpost-staging--sha-1cccc22-api` (api byts först) och `utpost-staging--sha-1cccc22` (client byts sist)
- Första revisionen, från `skapa-staging.sh`: `utpost-staging--gseomay`

## Regler på main

- PR krävs, minst en godkännare och "gröna checks" från alla tre operativsystemen och från Integration
- Branchen måste vara uppdaterad mot main innan merge
- Reglerna gäller även admins
- Deploy to Azure staging är inte en status check. Den körs efter merge, på main, och hoppas över på en PR. Blir den röd är main ändå korrekt, men staging uppdaterades inte

## Kommandon

```sh
npm run lint
npm run lint:md
npm run lint:spelling
npm run typecheck
npm test
npm run build
```

Integrationstesterna kräver att databaserna är igång, seedade och migrerade. Se [README](../README.md).

```sh
npm run seed
npm run migrate:logs
npm run test:api
```
