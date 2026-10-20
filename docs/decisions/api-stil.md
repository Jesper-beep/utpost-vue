---
title: "GraphQL"
description: "Beslut om huruvida GraphQL ersätter eller kompletterar REST, med uppmätta siffror för startsidan. Del av M4-momentet."
created: "2026-10-19"
published_date: "-"
last_modified_date: "2026-10-20"
version: "1"
---

## Beslut

GraphQL kompletterar REST, det ersätter det inte. Läsningar som idag kräver flera anrop, som startsidan, går via `/graphql`. Inloggning, bilduppladdning och allt som ändrar eller raderar stannar i REST. REST-rutterna svarar som förut.

Undantaget är `createTour`. Det finns både som `POST /api/tours` i REST och som mutation i GraphQL. Klienten skapar inga turer än. När den gör det väljer vi en av dem.

### Varför

- GraphQL sparar anrop. Startsidan går från 4 anrop till 1 (React-appen gör 5). Databasen gör lika många frågor som förut (4), så det är nätverket som vinner
- Svaret blir bara c:a 16 % mindre: 26020 mot 30845 byte. Kortet visar 180 tecken av `body_html` men vi hämtar hela texten. GraphQL kan välja fält, inte klippa dem
- GraphQL fixar inte N+1: 191 databasfrågor mot 201 för 50 turer. Varje tur ger en fråga var för `user`, `photos` och `logs`, och en för `guide` om turen har en. Det tar vi i M5
- Bara läsningar med flera anrop tjänar på GraphQL. Inloggning är ett enda anrop. Bilder skickas som filer, och det hjälper inte GraphQL till med. De stannar i REST, och inget i mätningarna talar för att skriva om dem

## Bakgrund

Startsidan i React-appen hämtar fem saker när den öppnas:

- `/api/guides`
- `/api/guides/popular`
- `/api/guides/regions`
- `/api/tours/latest`
- `/api/health`

Det finns med bland de mindre problemen i [skulddokumentet](../debt.md). Vue-klienten behöver fyra av dem, eftersom `/api/health` inte följde med i flytten.

Frågan är om en enda GraphQL-fråga löser det, och om det i så fall är värt att ha två API-stilar bredvid varandra. Siffrorna nedan kommer från vår egen seedade databas.

Så här mätte vi står under [Mätningar](#mätningar).

### Uppmätta siffror

#### Startsidan via REST

- Anrop: 4 (5 med `/api/health`)
- Storlek: 30845 bytes
- Databasförfrågningar: 4 st

#### Startsidan via GraphQL

- Anrop: 1
- Storlek: 26020 bytes
- Databasförfrågningar: 4 st

#### 50 turer via REST

- Databasförfrågningar: 201 st, räknat i koden

#### 50 turer via GraphQL (`AllaTurer`)

- Storlek: 66285 bytes
- Databasförfrågningar: 191 st

## Mätningar

Vi mäter samma vy, startsidan, mot samma seedade databas:

- REST mäts i React-appen (`web/`), som är oförändrad och gör fem anrop
- GraphQL mäts i Vue-klienten (`client/`), som gör ett

Kommandona utgår från att allt körs i OrbStack, PodMan eller Docker. Alla anrop går via klienternas nginx.

Observera att Vue-vyn bara behöver fyra av React-startsidans fem anrop, eftersom `/api/health` inte följde med i flytten.

### Innan du startar

Se till att OrbStack/PodMan eller Docker är igång.

1. Kör `npm run docker:up`
2. Kör `npm run docker:seed`

### REST

Alla förfrågningar görs med GET. Endpointen (slutpunkt/ändpunkt) `/api/health` utelämnas. Alla mätningar okomprimerade.

- curl -s `<endpoint>` | wc -c

#### De fem endpoints som vi testar

- `localhost:3000/api/guides`
- `localhost:3000/api/guides/popular`
- `localhost:3000/api/guides/regions`
- `localhost:3000/api/tours/latest`

##### Alla guider

- Endpoint: `/api/guides`
- Vad: Alla guider, senast uppdaterad först
- Storlek: 26128 byte, c:a 25,5 kB

##### Populära guider

- Endpoint: `/api/guides/popular`
- Vad: De 6 senaste publicerade guiderna
- Storlek: 3908 byte

##### Landskap

- Endpoint: `/api/guides/regions`
- Vad: Alla landskap, utan dubbletter
- Storlek: 96 byte

##### Senaste turerna

- Endpoint: `/api/tours/latest`
- Vad: De 5 senaste turerna
- Storlek: 713 byte

##### Hälsokontroll

- Endpoint: `/api/health`
- Vad: Om API:et, Postgres och MongoDB svarar. Vue-klienten använder inte den
- Storlek: 42 byte

#### Summa av REST

- Antal förfrågningar: 5 (inklusive /api/health)
- Total mängd: 30887 bytes (inklusive /api/health)

### GraphQL

Alla förfrågningar görs med POST. Alla mätningar okomprimerade.

```sh
curl -s localhost:3001/graphql -H "Content-Type: application/json" -d '{"query":"query Startsidan { guides { id slug title region difficulty body_html: bodyHtml length_km: lengthKm } popularGuides(limit: 6) { id slug title region difficulty body_html: bodyHtml length_km: lengthKm } regions tours(limit: 5) { id title distance_m: distanceM } }"}' | wc -c
```

#### Den endpoint vi testar

- `localhost:3001/graphql`

##### Startsidan

- Endpoint: `/graphql`
- Vad: Allt startsidan visar som en fråga
- Storlek: 26020 bytes

#### Summa av GraphQL

- Antal förfrågningar: 1
- Total mängd: 26020 bytes

### Databas-förfrågningar

Antal frågor till Postgres. REST räknas i rutternas kod, eftersom API:et inte loggar dem. GraphQL läses ur API-loggen, som skriver en rad för varje fråga med antalet databasfrågor.

1. Kör `Startsidan`, frågan som startsidan skickar. Kommandot finns under [GraphQL](#graphql) ovan
2. Kör `AllaTurer`, den tyngsta frågan:

    ```sh
    curl -s localhost:3001/graphql -H "Content-Type: application/json" -d '{"query":"query AllaTurer { tours(limit: 50) { id user { displayName } guide { title } photos { id } logs { recordedAt } } }"}' | wc -c
    ```

    *Skickar en GraphQL-fråga till API:et och skriver ut hur många bytes som kommer tillbaka.*

3. Läs loggen:

    ```sh
    docker logs utpost-api | grep graphql
    ```

    *Tittar i loggen för API:et och visar bara raderna som innehåller "graphql".*

Varje rad ser ut så här, där siffran är antalet databasfrågor:

```text
graphql Startsidan: N databasfrågor
```

#### Startsidan via REST

##### Alla guider

- Endpoint: `/api/guides`
- Frågor: 1

##### Populära guider

- Endpoint: `/api/guides/popular`
- Frågor: 1

##### Landskap

- Endpoint: `/api/guides/regions`
- Frågor: 1

##### Senaste turerna

- Endpoint: `/api/tours/latest`
- Frågor: 1

#### Summa av startsidan via REST

- Antal förfrågningar: 4
- Antal frågor: 4

#### Startsidan via GraphQL

##### Startsidan

- Endpoint: `/graphql`
- Vad: Allt startsidan visar som en fråga
- Frågor: 4

#### Summa av startsidan via GraphQL

- Antal förfrågningar: 1
- Antal frågor: 4

#### Den tyngsta frågan via REST

##### Alla turer

- Endpoint: `/api/tours`
- Vad: De 50 senaste turerna, med användare, guide, bilder och punkter
- Frågor: 1 + 4 per tur, alltså 201 för 50 turer

#### Den tyngsta frågan via GraphQL

##### AllaTurer

- Endpoint: `/graphql`
- Vad: 50 turer, med `user`, `guide`, `photos` och `logs`
- Storlek: 66285 byte, c:a 64,7 kB
- Frågor: 191

## Schema

Schemat finns i [schema.js](../../api/src/graphql/schema.js). Det är kontraktet mot klienten, med de namn klienten vill ha (`bodyHtml`) och inte Postgres kolumner (`body_html`).

- `User` har bara `id` och `displayName`. `password_hash` finns inte i schemat och kan därför inte läsas ut
- `!` lovar att fältet aldrig är null. `Tour.guide` och `guide(slug)` saknar `!`, eftersom en tur inte behöver ha en guide och en slug kan saknas
- `tours(limit)` har ett tak på 200. Observera att `popularGuides(limit)` saknar tak
- Svarstyperna i klienten skrivs för hand och kontrolleras inte mot frågan. Det tar vi i M5
