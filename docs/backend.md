---
title: "Backend"
description: "Omtag av Utposts backend med ny mappstruktur, Drizzle och Drizzle Kit för databasen och Zod för indata."
created: "2026-11-19"
published_date: "2026-11-25"
last_modified_date: "2026-11-25"
version: "1"
---

Backenden i Utpost har fått en ny mappstruktur, och databasfrågorna är omskrivna till Drizzle (ett bibliotek som låter oss fråga databasen från TypeScript). Funktionerna är desamma, och adresserna till guider, turer och foton är oförändrade. Det som är nytt är hur koden är ordnad, hur databasen byggs upp och hur vi kontrollerar indata.

Omtaget görs i förebyggande syfte och är inte kopplat till någon specifik uppgift. Vi använder nu Drizzle och Drizzle Kit (ett verktyg som skapar migreringar ur schemat) för databasen, och Zod för att kontrollera indata när någon skapar konto eller loggar in.

## Överfört rakt av

Först tittar vi på det som är oförändrat. Med det menar vi att samma anrop ger samma resultat som tidigare, med två undantag. Fältnamnen är nu camelCase, se [camelCase i stället för snake_case](#camelcase-i-stället-för-snake_case), och några buggar är rättade, se [fixade buggar och säkerhetsproblem](#fixade-buggar-och-säkerhetsproblem).

### Adresser och svar

Alla adresser fungerar som förut, utom den för att skapa konto. Den hittar du under [namn som ändrats](#namn-som-ändrats).

- Guiderna: `GET /api/guides`, `/regions`, `/popular`, `/search`, `/:slug` och `PUT /api/guides/:id`
- Turerna: `GET /api/tours`, `/latest`, `/:id` samt `POST` och `DELETE`
- Resten: `POST /api/photos`, `POST /api/auth/login`, `GET /api/health`, `/api/notices` och `/api/cms/webhook`

### Kod som flyttades utan ändring

- `cms/contentful.js` är orörd, bortsett från importen av konfigurationen. Filen är fortfarande JavaScript
- GraphQL-schemat har samma typer, fält och frågor
- Token är fortfarande HS256 och gäller i en timme

## Det som ändrades och varför

### Drizzle i stället för handskriven SQL

Förut skrev varje rutt sin egen SQL med `pool.query` och fick tillbaka rader utan typer. Nu beskriver `db/schema/` tabellerna i TypeScript, och Drizzle ger oss både typerna och frågorna ur samma beskrivning. Ett stavfel i ett kolumnnamn stoppas då redan när vi kontrollerar typerna.

- Tabellerna beskrivs på ett ställe i stället för tre: i `create table`, i frågorna och i typerna
- `GET /api/tours` gjorde fyra frågor för varje tur, alltså över 200 frågor för 50 turer. Nu hämtar en enda fråga turerna med användare, guide, bilder och mätpunkter

### Migreringar med Drizzle Kit

Förut skapade `createTables` tabellerna med `create table if not exists`, som inte kan ändra en tabell som redan finns. Nu läser Drizzle Kit schemat och skriver en migrering (en SQL-fil som flyttar databasen från ett läge till nästa). Migreringarna ligger i `api/drizzle/`, och Drizzle håller reda på vilka som redan har körts.

### Främmande nycklar/nyckelrelationer (foreign keys)

En främmande nyckel (foreign key) är en regel om att en kolumn måste peka på en rad som finns i en annan tabell. Förut fanns inga sådana regler, så en tur kunde peka på en användare som inte fanns och en borttagen tur lämnade kvar sina loggar och foton.

- `tour_logs.tour_id` och `photos.tour_id` tas bort tillsammans med turen (`on delete cascade`)
- `tours.guide_id` och `guides.author_id` blir tomma om guiden eller användaren tas bort (`on delete set null`)
- `tours.user_id` går inte att ta bort så länge användaren har turer, eftersom inget i API:et tar bort användare och vi inte vill radera någons turer av misstag

### Index

Ett index är en sorterad kopia av en kolumn som gör att databasen hittar rader utan att läsa hela tabellen. Vi har bara lagt till index där de faktiskt behövs för våra frågor.

- `tours (started_at)`, eftersom turlistan, `/latest` och GraphQL sorterar på startdatum
- `tour_logs (tour_id, recorded_at)`, som hittar och sorterar en turs mätpunkter i ett steg
- Ingen fråga filtrerar på `tours.user_id` eller sorterar på `guides.updated_at`, så de har inget index än. Tabellerna är små, och varje index gör varje skrivning lite dyrare

### Unika begränsningar (unique constraint)

En unik begränsning (unique constraint) gör att databasen vägrar spara samma värde två gånger. Då kan inte två personer som registrerar sig samtidigt med samma e-post båda lyckas, vilket en kontroll i koden inte kan garantera.

- `users.email` och `users.display_name`
- `guides.slug`
- `photos.tour_id`, så att en tur har högst en bild även när två uppladdningar pågår samtidigt

### Typer i databasen

Id-kolumnerna använder nu identity i stället för serial. Det är ett modernare, SQL-standardiserat sätt att låta PostgreSQL generera ID:n automatiskt och det [rekommenderade valet för nya tabeller](https://www.postgresql.org/docs/current/ddl-identity-columns.html).

Tider sparas som timestamptz (en tidsstämpel med tidszon) i stället för timestamp. Det gör att PostgreSQL kan hantera tidpunkter från olika tidszoner korrekt. Med timestamp sparas ingen tidszonsinformation.

`role` och `difficulty` är enum-typer i databasen, vilket innebär att kolumnerna bara tillåter fördefinierade värden. Värdelistorna finns i @utpost/shared, så databasen, Zod och klienten utgår från samma uppsättning värden.

### camelCase i stället för snake_case

Förut skickade API:et databasens radnamn rakt ut, så svaren hade fält som `user_id`, `created_at` och `length_km`. Nu heter samma fält `userId`, `createdAt` och `lengthKm`.

Postgres-kolumner skrivs i snake_case (ord med understreck, till exempel `user_id`), medan JavaScript, TypeScript och GraphQL använder camelCase (ord med versal, till exempel `userId`). Vi låter Drizzle översätta med `casing: "snake_case"`, så databasen behåller sina kolumnnamn och allt ovanför databasen använder camelCase.

GraphQL-schemat använde redan camelCase. Nu behöver ingen del av systemet översätta namn mellan lagren.

### TypeScript överallt

Alla filer i `api/src` är nu TypeScript, utom `cms/contentful.js`, som ännu inte är konverterad. Typerna för användare, turer och foton delas via `@utpost/shared`. Zod-schemana för att skapa konto och logga in ligger också där, så klienten kan använda samma gränser som API:et.

### Lager med varsin uppgift

Förut gjorde varje rutt allt själv: den läste indata, körde SQL och byggde svaret. Nu har varje del en uppgift, och samma service används av både REST och GraphQL, så en fråga skrivs bara en gång.

- `routes/<namn>/index.ts` läser indata och svarar
- `services/` innehåller logiken och Drizzle-frågorna
- `schemas/` innehåller Zod-schemana för indata

Mellanprogram (middleware, kod som körs före en rutt) ligger i `middleware/`. Där finns kontrollen av inloggning, hastighetsbegränsningen och felhanteraren.

### Uppstart utan `boot.js`

Tidigare ansvarade `boot.js` för att vänta på Postgres, skapa tabeller och lägga in testdata. Nu sköts detta av `db/prepare.ts`, som anropas från `server.ts` innan API:et börjar lyssna efter anrop.

Vi valde att lägga detta i API:et eftersom databaserna i Azure körs som containrar i samma app som API:et och inte nödvändigtvis startar i någon bestämd ordning. API:et behöver därför kunna vänta på att Postgres är redo innan det startar.

Om flera API-instanser körs samtidigt riskerar de däremot att försöka köra migreringarna parallellt. På sikt kan det därför vara bättre att flytta migreringarna till ett separat steg i driftsättningen som körs innan de nya API-instanserna startas. Då behöver varje instans inte hantera migreringarna vid uppstart.

### Hastighetsbegränsning på inloggning och registrering

Hastighetsbegränsning (rate limit) är en gräns för hur många anrop en klient får göra under en viss tid. Förut gällde en gräns på tio anrop per kvart för alla adresser under `/api`, utom adressen som CMS:et anropar och `/api/health`.

Nu gäller gränsen bara `POST /api/auth/login` och `POST /api/auth/signup`, där någon kan gissa lösenord eller skapa konton i bulk. Den är tio försök per 15 minuter och IP-adress, gemensamt för inloggning och registrering, och den är avstängd i utvecklings- och testmiljön. GraphQL har kvar sin egen begränsning.

### Argon2id i stället för scrypt

Tidigare använde vi scrypt för att beräkna lösenordens hashvärden. Nu har vi bytt till Argon2id, en funktion som är särskilt utvecklad för lösenordshashning. Vi använder OWASP:s rekommenderade miniminivå: 19 MiB minne, två iterationer och en parallell tråd.

Eftersom hashvärdena från scrypt inte kan verifieras med Argon2id behöver en befintlig databas seedas om. Vi gjorde bytet av tre skäl:

- OWASP rekommenderar Argon2id för nya system och anger scrypt som ett alternativ om Argon2id inte finns tillgängligt
- Argon2id kräver betydligt mindre minne med våra inställningar. En inloggning krävde tidigare 128 MiB med scrypt, jämfört med 19 MiB nu. Det är en fördel eftersom API:et har 1 GiB minne tillgängligt i stagingmiljön
- Argon2id finns inbyggt i Node.js (`crypto.argon2` sedan version 24.7), så vi behöver inte installera något extra paket

### Foton och turer

En tur kan ha högst en bild, vilket säkerställs av en unik begränsning i databasen. Om två uppladdningar sker samtidigt går den ena igenom, medan den andra får statuskod 409 och dess filer tas bort.

När en tur tas bort raderar databasen även tillhörande loggar och foton. API:et tar dessutom bort själva bildfilerna från `uploads/`, vilket inte gjordes tidigare.

### Felhantering

Felhanteraren i `middleware/error-handler.ts` returnerar HTTP-statuskod 400 vid ogiltig indata eller felaktig JSON, HTTP-statuskod 413 när en förfrågan är för stor och HTTP-statuskod 500 för övriga fel.

Rutterna använder `schema.parse(...)` direkt i sina handlers. Express 5 skickar automatiskt vidare fel som uppstår i asynkrona handlers till felhanteraren. Därför behövs inte `validate.js` längre.

### Borttaget

- `boot.js`, som ersatts av `db/prepare.ts`
- `lib/validate.js`, som ersatts av `schema.parse(...)` direkt i rutterna
- `lib/unhandledRejection.js` och tillhörande test, eftersom de inte längre användes
- `db/mongo-smoke.js`, som ersatts av `db/migrate-logs.ts`

## Namn som ändrats

Filerna har fått namn efter vad de gör, och varje rutt har en egen mapp.

| Före                         | Efter                                                     |
| ---------------------------- | --------------------------------------------------------- |
| `src/index.js`               | `src/server.ts`                                           |
| `src/boot.js`                | `src/db/prepare.ts`                                       |
| `src/config.js`              | `src/config/env.ts`                                       |
| `src/db/client.js`           | `src/db/postgres.ts`                                      |
| `src/db/schema.js`           | `src/db/schema/` (en mapp per tabell)                     |
| `src/db/migrate.js`          | `src/db/migrate.ts` och migreringar i `api/drizzle/`      |
| `src/lib/auth.js`            | `src/lib/token.ts` och `src/middleware/authentication.ts` |
| `src/lib/schemas.js`         | `src/schemas/` och `shared/src/schemas/auth.ts`           |
| `src/routes/auth.js`         | `src/routes/login/` och `src/routes/signup/`              |
| `src/routes/<namn>.js`       | `src/routes/<namn>/index.ts`                              |
| `src/routes/routes.test.js`  | `tests/routes/<namn>/` och `tests/app.test.ts`            |
| `src/graphql/server.test.js` | `tests/graphql/server.test.ts`                            |

Adressen för att skapa konto har också fått ett nytt namn, från `POST /api/auth/register` till `POST /api/auth/signup`. Klienten och testerna använder den nya adressen.

## Så fungerar det

### Ett anrop från början till slut

Så här går ett anrop för att skapa ett konto genom API:et.

1. Klienten skickar `POST /api/auth/signup`. `app.ts` skickar anropet vidare till `signupRouter`, där hastighetsbegränsningen håller koll på antalet försök.
2. Rutten validerar indata med `registerSchema` och beräknar lösenordets hashvärde. Om indatan är ogiltig svarar API:et med HTTP-statuskod 400.
3. `createUser` i `services/users.ts` sparar användaren i databasen. Databasens unika begränsningar för e-postadress och användarnamn förhindrar dubbletter. Om någon av uppgifterna redan finns svarar API:et med HTTP-statuskod 409.
4. Rutten svarar med HTTP-statuskod 201 och skickar tillbaka en token och användaruppgifterna, utan lösenordets hashvärde.

### Adresser och mappar

Mappstrukturen i `routes/` styr inte vilka adresser API:et använder. Det bestäms i stället av adresserna som anges i `app.ts`, där vi samlar alla adresser på ett ställe. Det är alltså där vi ändrar en adress, utan att behöva ändra mappstrukturen.

| Mapp               | Adress              |
| ------------------ | ------------------- |
| `routes/cms/`      | `/api/cms`          |
| `routes/guides/`   | `/api/guides`       |
| `routes/health/`   | `/api/health`       |
| `routes/login/`    | `/api/auth/login`   |
| `routes/notices/`  | `/api/notices`      |
| `routes/photos/`   | `/api/photos`       |
| `routes/signup/`   | `/api/auth/signup`  |
| `routes/tours/`    | `/api/tours`        |

### Tre lager, tre namn

Frontend-sidan, API-adressen och backend-filen har varsitt namn. De behöver inte följa samma namngivning eller struktur. Till exempel kan sidan ha ett svenskt namn, API-adressen ett engelskt och filen namnges efter rutten.

| Lager          | Exempel                      |
| -------------- | ---------------------------- |
| Frontend-sida  | `/skapa-konto`               |
| Backend-adress | `/api/auth/signup`           |
| Backend-fil    | `src/routes/signup/index.ts` |

### Ändra schemat

Du ändrar tabellerna i `db/schema/`. Drizzle Kit skriver sedan en migrering i `api/drizzle/`, och ett annat kommando kör den mot databasen.

In:

```sh
npm run db:generate
```

In:

```sh
npm run db:migrate
```

Ut:

```text
...
Migreringarna är körda.
```

För att prova en schemaändring i en lokal databas utan att skapa en migrering finns `db:push`. Kommandot ändrar databasen direkt ur schemat och skriver ingen fil i `api/drizzle/`. Använd det bara lokalt, och skapa en migrering med `db:generate` för ändringar som ska behållas. En databas som har ändrats med `db:push` går inte att köra migreringarna mot, eftersom de försöker skapa tabeller och typer som redan finns. Nollställ den med `npm run docker:reset`.

In:

```sh
npm run db:push
```

### Startskriptet

`npm run start` kör `src/server.ts`, och containeravbildningen startar API:et med samma fil. `npm run dev` gör samma sak med `node --watch`, så API:et startar om när en fil ändras. Med `SEED_ON_START=1` fyller API:et en tom databas med påhittad data, vilket passar i stagingmiljön men aldrig får vara på i produktion.

In:

```sh
npm run start --workspace=api
```

#### Det som händer vid start

1. `server.ts` anropar `prepareDatabase()` i `db/prepare.ts`, som väntar på Postgres med upp till 30 försök och två sekunder mellan försöken
2. Migreringarna körs, och när `SEED_ON_START=1` och databasen saknar användare läggs testdata in
3. API:et börjar lyssna på porten

### Seed-skriptet

`seed` fyller databasen med påhittad data. Skriptet kör först migreringarna och tömmer sedan alla tabeller, så allt som låg i databasen försvinner. Alla användare har samma kända lösenord, så skriptet ska bara användas med påhittad data. I Docker heter kommandot `npm run docker:seed`.

In:

```sh
npm run seed --workspace=api
```

#### Det som skapas

- Tolv användare. Den första är redaktör (`redaktor@utpost.se`), den andra är medlem (`medlem@utpost.se`) och alla har lösenordet `hemligt123`
- Fyrtio guider, där var nionde är opublicerad
- Tvåhundra turer med 20 till 39 mätpunkter var. Mätpunkterna sparas i Postgres, i tabellen `tour_logs`

#### Efter seed

Skriptet skriver ut hur många rader som skapades och en användare att logga in som. Mätpunkterna bor också i MongoDB, så kör `migrate:logs` efter varje `seed`. I Docker heter kommandot `npm run docker:migrate-logs`.

In:

```sh
npm run migrate:logs --workspace=api
```

### Inloggning och token

- `lib/token.ts` skapar och kontrollerar token, som signeras med HS256 och gäller i en timme
- `middleware/authentication.ts` har `requireUser` (kräver inloggning) och `requireRole` (kräver en roll, till exempel `editor`)
- GraphQL använder samma kontroll som REST. Förut angav GraphQL ingen algoritm och godtog därför även HS384 och HS512

Mer om lösenord och token finns i [säkerhetsdokumentet](security.md).

### Frågeräknaren i GraphQL

GraphQL-svaret innehåller `extensions.databasfragor`, som visar hur många databasfrågor som kördes under ett anrop. Tidigare sköttes räkningen av en egen `query`-funktion.

Nu räknar Drizzles logger varje fråga, medan `lib/query-stats.ts` håller reda på vilka frågor som hör till vilket anrop. Det görs med `AsyncLocalStorage`, som bevarar anropets sammanhang även genom asynkrona operationer och `await`.

I nuläget går alla frågor genom Drizzle och applikationen använder inga transaktioner. Om vi börjar använda transaktioner behöver vi kontrollera om Drizzles logger även räknar anrop som `BEGIN` och `COMMIT`.

Testerna kontrollerar att turlistan kräver högst två databasfrågor och att en tur med mätpunkter kräver exakt två.

## Validering med Zod

Zod-schemana för att skapa konto och logga in beskriver hur indata ska se ut, och de ligger i `shared/src/schemas/auth.ts`. På så sätt använder klienten och API:et samma regler för validering. De övriga schemana, för turer, guider och foton, ligger i `api/src/schemas/`.

Om indatan inte är giltig svarar API:et med HTTP-statuskod 400 och en lista med `issues`. Varje fel innehåller en `path`, som visar vilket fält felet gäller, och ett `message` med en beskrivning av felet. Felmeddelandena kommer från Zod tills vi väljer att skriva egna.

### Användarnamn (displayName)

- Minst 1 och högst 15 tecken
- Bara a-z och 0-9
- Sparas med små bokstäver, så `Anna` och `anna` är samma namn
- Måste vara unikt

### Förnamn (firstName)

- Minst 1 och högst 50 tecken
- Bokstäver från alla språk, till exempel å, ä, ö och bokstäver med accent
- Ett mellanslag, bindestreck eller apostrof får stå mellan bokstäver, så `Anna-Karin`, `O'Brien` och `van der Berg` fungerar
- Siffror, andra tecken och emoji ger fel

### Efternamn (lastName)

Samma regler som för förnamnet gäller.

### E-post (email)

- Måste vara en giltig e-postadress, med @ och en domän
- Högst 254 tecken totalt och högst 64 före @
- Sparas med små bokstäver, och mellanslag i början och slutet tas bort
- Måste vara unik, och tecknet `+` är tillåtet

### Lösenord (password)

Vi fokuserar på längd i stället för krav på olika typer av tecken, i linje med NIST:s riktlinjer för lösenord. Lösenorden normaliseras med NFKC innan de hashas, så likvärdiga Unicode-representationer (exempelvis emoji) behandlas på samma sätt.

- Minst 16 och högst 64 Unicode-kodpunkter
- Alla tecken som går att skriva ut är tillåtna, även mellanslag och emoji. Radbrytningar och andra styrtecken är inte tillåtna
- Vid inloggning kontrolleras bara att lösenordet har 1 till 64 Unicode-kodpunkter, så äldre och kortare lösenord fortfarande fungerar

## Det som ändrades i klienten

- Formuläret för att skapa konto har nu fälten Förnamn, Efternamn och Användarnamn, med samma längdgränser som i `@utpost/shared`
- Klienten anropar `/auth/signup`, och `codegen` hämtar GraphQL-schemat från `api/src/graphql/schema.ts`
- Alla fältnamn använder camelCase, och GraphQL-frågorna behöver inte längre några alias (`lengthKm` i stället för `length_km: lengthKm`)
- Profilsidan visar förnamnet som rubrik, eftersom användarnamnet inte längre är avsett att innehålla mellanslag

## Tester

### API-testerna

Alla API-tester ligger nu i `api/tests/`, och mapparna där följer mapparna i `api/src`. Testerna är skrivna i TypeScript, med undantag för `cms/contentful.test.js`. Testerna körs mot riktiga databaser, så både Postgres och MongoDB måste vara igång, seedade och migrerade. Kod som rutt-testerna delar, som att starta appen och anropa API:et, ligger i `tests/helpers/api.ts`.

- `routes.test.js` är uppdelat i en testfil per rutt, `routes/<namn>/index.test.ts`, och `graphql/server.test.js` ligger nu i `graphql/server.test.ts`. Båda är överförda till TypeScript och uppdaterade för att använda Drizzle i stället för `pool.query`.
- Testet för foton, `routes/photos/index.test.ts`, använde tidigare en låtsasdatabas. Nu körs testet mot den riktiga databasen, medan bara bildfunktionen är ersatt. På så sätt testas även att databasens unika begränsningar fungerar som de ska.
- Nya tester täcker registrering (HTTP 201 och 409), två samtidiga uppladdningar, sökord som innehåller `%`, en tur där guiden saknas, hastighetsbegränsningen (HTTP 429), ett avstånd som inte är ett tal och ett svar från bildfunktionen med fel form.

### Klientens tester

Klientens testdata använder camelCase, och användarna i testerna har förnamn och efternamn.

### Köra testerna

In:

```sh
npm run test:api
```

In:

```sh
npm run test:client
```

## Mätningar före och efter

Vi mätte den gamla och den nya backenden på samma dator, med samma Docker-uppsättning och påhittad data. Den gamla koden är sista commiten före omarbetningen, som vi körde från en egen mapp med `git worktree`. Databaserna fick ungefär lika många mätpunkter i båda körningarna: 5 875 rader i `tour_logs` före och 5 909 efter.

### Hastighet

Hastighetsbegränsningen var avstängd vid mätningarna. Varje resultat är medianen av 20 anrop, efter 5 uppvärmningsanrop.

- Turlistan, `GET /api/tours` med 50 turer: 15,4 ms före och 6,6 ms efter, alltså ungefär 2,3 gånger snabbare. Svaret är 278 809 byte före och 247 279 byte efter, men fältnamnen är nu camelCase, så storleken går inte att jämföra rakt av
- GraphQL-frågan `AllaTurer`: 5,4 ms före och 5,1 ms efter, med 5 databasfrågor i båda. Skillnaden ligger inom mätfelet, eftersom GraphQL redan använde DataLoader sedan M5
- Inloggning: 168,7 ms före med scrypt och 12,5 ms efter med Argon2id, ungefär 13 gånger snabbare. Det betyder inte att lösenorden är säkrare. Vinsten är istället att varje försök använder 19 MiB minne i stället för 128 MiB

### Säkerhet och riktighet

Här skickade vi samma anrop med `curl` till båda versionerna, med hastighetsbegränsningen på.

- Hastighetsbegränsning: den gamla koden svarade med HTTP-statuskod 429 från det elfte anropet till vilken adress som helst under `/api`, till exempel `GET /api/guides`. Nu svarar alla tolv anropen med 200, eftersom gränsen bara gäller inloggning och registrering
- Ogiltigt avstånd: `POST /api/tours` med `"distanceM": null` sparade en tur med avståndet 0 m och svarade 200. Nu svarar API:et med 400 och pekar ut fältet `distanceM`
- Dubbel registrering: två samtidiga registreringar med samma e-post gav två 201 och två konton med samma e-post, i alla fyra försöken. Nu ger varje par ett 201 och ett 409, och databasen har ett konto per e-post

### Så mätte vi

Varje hastighetsmätning är en slinga med `curl` som skriver ut svarstiden. De fem första anropen räknas inte, och vi tar de två mittersta av de 20 sorterade tiderna. Hastighetsbegränsningen stängdes av med `NODE_ENV: development` i Docker Compose, eftersom den annars stoppar slingorna. Det är inte längre satt i `compose.yaml`, men den nya koden begränsar bara inloggning och registrering, så slingan mot `/api/tours` stoppas inte av den.

In:

```sh
for i in $(seq 1 25); do curl -s -o /dev/null -w "%{time_total}\n" localhost:3001/api/tours; done | tail -n 20 | sort -n | sed -n '10,11p'
```

Ut:

```text
0.006636
0.006681
```

## Fixade buggar och säkerhetsproblem

- API:et validerar nu bildfunktionens svar med Zod. Tidigare litade det på svaret, vilket kunde leda till ett otydligt fel (HTTP-statuskod 500) om svaret hade fel format. Nu returneras i stället HTTP-statuskod 502, som visar att felet kommer från en extern tjänst
- Avstånd och längd i indata måste nu vara tal. Tidigare kunde Zod automatiskt omvandla `null`, tomma strängar och `true` till 0 eller 1. Det kunde till exempel leda till att en tur sparades med avståndet 0 meter
- API:et kraschar inte längre om en ledig Postgres-anslutning bryts, till exempel vid en omstart av Postgres. Felet loggas i stället
- Migreringarna i `api/drizzle/` versionshanteras nu i Git. Mappen var tidigare ignorerad i `.gitignore`, vilket gjorde att migreringarna saknades i pipelinen och containeravbildningen. Därför kunde API:et inte skapa databastabellerna

## Planerat att lägga till

### Felhantering och drift

#### Logga hela felet vid HTTP-statuskod 500

Logga hela felet, så att vi ser var i koden det uppstod. I dag loggas bara metoden, adressen och felmeddelandet. Det kan vi göra med `console.error`, och kanske senare med [Pino](https://www.npmjs.com/package/pino).

#### Stänga av API:et ordentligt

Implementera en kontrollerad avstängning av API:et när containern stoppas, så att pågående anrop och uppladdningar får möjlighet att slutföras innan processen avslutas. Containrarna ersätts vid varje merge till `main`.

#### Förenkla felhanteraren

Förenkla `error-handler.ts`. Fel från `express.json` innehåller redan en `status`-egenskap med HTTP-statuskod 400 eller 413. Därför kan de två separata specialfallen ersättas med en gemensam kontroll. På så sätt får även andra klientfel rätt HTTP-statuskod i stället för att felaktigt returnera HTTP-statuskod 500.

#### Validera `PORT` och `CMS_CACHE_SECONDS`

Validera i `config/env.ts` att `PORT` och `CMS_CACHE_SECONDS` innehåller giltiga numeriska värden. Ogiltiga värden blir annars `NaN` utan att något felmeddelande visas. Om `CMS_CACHE_SECONDS` blir `NaN` hämtar API:et innehållet från Contentful vid varje anrop i stället för att använda cache.

### Inloggning

#### Blockera vanliga och komprometterade lösenord

Förhindra användare från att skapa konton med vanliga eller kända komprometterade lösenord. Validera lösenordet vid registrering och neka lösenord som bedöms vara osäkra.

Kan vi kanske använda [Have I Been Pwned:s API](https://haveibeenpwned.com/API/v3)?

#### Se över hastighetsbegränsningen i GraphQL

Kontrollera hur hastighetsbegränsningen i GraphQL fungerar och om den räknar anrop per fält eller per förfrågan. Gränsen är tio anrop per IP-adress under 15 minuter och gäller samtliga fält under `Query`. Begränsningen är aktiverad i stagingmiljön.

Startsidan hämtar data från fyra olika `Query`-fält, vilket innebär att en vanlig besökare riskerar att nå gränsen och bli tillfälligt blockerad.

Begränsningen bör möjligen justeras eller omräknas så att vanliga besökare inte riskerar att blockeras vid normal användning.

#### Lägga inloggningen i en `httpOnly`-cookie

Spara en refresh-token i en `httpOnly`-cookie som JavaScript på sidan inte kan läsa. Det gör att användaren förblir inloggad även efter att sidan laddas om. Detta är nästa steg i [utloggad efter omladdning](security.md#utloggad-efter-omladdning).

Eftersom webbläsaren skickar cookies automatiskt behöver vi även skydda API:et mot CSRF (att en annan webbplats får webbläsaren att skicka anrop till API:et), exempelvis med `SameSite`. I dag hämtar både API-rutterna och GraphQL token från `Authorization`-headern, så båda behöver anpassas för att läsa token från cookien.

Två idéer att undersöka närmare:

- [cookie-parser](https://www.npmjs.com/package/cookie-parser) för att läsa cookien i Express
- [`@whatwg-node/server-plugin-cookies`](https://www.npmjs.com/package/@whatwg-node/server-plugin-cookies) för att läsa den i GraphQL

Express kan sätta cookien själv med `response.cookie`. Om bara en refresh-rutt läser cookien behöver GraphQL inget av dem.

### GraphQL

#### Begränsa frågornas djup

Lägg till `@envelop/depth-limit` i `graphql/server.ts` för att begränsa hur djupt nästlade GraphQL-frågor får vara. På så sätt kan API:et neka alltför djupa frågor som annars riskerar att belasta servern. Paketet tillhör samma Envelop-ekosystem som `@envelop/rate-limiter`, som vi redan använder.

**Behöver kollas upp:** Vilken gräns för frågedjup som är lämplig.

### Contentful

#### Konvertera `contentful.js` till TypeScript

Konvertera `cms/contentful.js` till TypeScript och validera svaren från Contentful med Zod, som vi gör med bildfunktionens svar. Importerna och `tests/cms/contentful.test.js` behöver då också ändras.

#### Låta `previewNotices` fungera utan CMS

Låt `previewNotices` i `cms/contentful.js` returnera en tom lista när CMS:et inte är konfigurerat, på samma sätt som hämtningen av publicerade notiser redan gör. I nuläget ger förhandsgranskning av notiser ett fel om CMS-nycklar saknas.

#### Hämta fler än hundra poster

Se till att `fetchEntries` kan hämta fler än hundra poster från Contentful. I nuläget är gränsen satt till `limit=100`, vilket innebär att endast de första hundra notiserna eller guiderna hämtas. Eventuella ytterligare poster kommer inte med.

### Databas

#### Bestäm hur vi använder `db:push`

`db:push` ändrar databasen direkt ur schemat och skriver ingen migrering. API:et och `seed` kör sedan migreringarna och misslyckas på tabeller och typer som redan finns, så en databas som har ändrats med `db:push` måste nollställas. Bestäm om och hur vi vill använda `db:push` lokalt, eller ta bort det.

### Klienten

#### Tydligare felmeddelanden

Visa vilket fält som är fel när indata inte godkänns. API:et svarar med `issues`, en lista där varje fel har ett fält (`path`) och en beskrivning (`message`), men klienten visar i dag bara "ogiltig indata". Felmeddelandena kommer än så länge från Zod, och vi behöver skriva egna som användaren förstår.

#### Visa reglerna i fälten

Visa reglerna för varje fält i formuläret, så att användaren ser dem innan formuläret skickas. Till exempel "Lösenord (16 till 64 tecken)". Längderna för namnen finns redan som konstanter i `@utpost/shared`.

## Mappstrukturen

Mappstrukturen visar `api/` och `shared/` som de ser ut efter omtaget. Mapparna `client/` och `docs/` ligger kvar på toppnivån. `cms/contentful.js` är den enda källfilen i `api/src` som fortfarande är JavaScript.

```text
api/
  drizzle/
  drizzle.config.ts
  Dockerfile
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    app.ts
    server.ts
    cms/
      contentful.js
    config/
      env.ts
    db/
      migrate-logs.ts
      migrate.ts
      mongo.ts
      postgres.ts
      prepare.ts
      seed.ts
      schema/
        index.ts
        guides/
          index.ts
        photos/
          index.ts
          relations.ts
        tour-logs/
          index.ts
          relations.ts
        tours/
          index.ts
          relations.ts
        users/
          index.ts
    graphql/
      loaders.ts
      resolvers.ts
      schema.ts
      server.ts
    lib/
      database-errors.ts
      imageFunction.ts
      password.ts
      photos.ts
      public-user.ts
      query-stats.ts
      token.ts
    middleware/
      authentication.ts
      error-handler.ts
      rate-limit.ts
    routes/
      cms/
        index.ts
      guides/
        index.ts
      health/
        index.ts
      login/
        index.ts
      notices/
        index.ts
      photos/
        index.ts
      signup/
        index.ts
      tours/
        index.ts
    schemas/
      auth.ts
      common.ts
      guides.ts
      photos.ts
      tours.ts
    services/
      guides.ts
      photos.ts
      tour-logs.ts
      tours.ts
      users.ts
    types/
      auth.ts
      cms.ts
      express.d.ts
      graphql.ts
      guides.ts
      photos.ts
      tour-logs.ts
      tours.ts
      users.ts
  tests/
    app.test.ts
    cms/
      contentful.test.js
    graphql/
      server.test.ts
    helpers/
      api.ts
    lib/
      imageFunction.test.ts
    middleware/
      rate-limit.test.ts
    routes/
      cms/
        index.test.ts
      guides/
        index.test.ts
      login/
        index.test.ts
      photos/
        index.test.ts
      signup/
        index.test.ts
      tours/
        index.test.ts
shared/
  src/
    index.ts
    schemas/
      auth.ts
```

## Mappar och filer

Konventionella konfigurationsfiler som `Dockerfile`, `package.json`, `tsconfig.json` och `vitest.config.ts` tas inte upp var för sig.

### Mappen api

- `drizzle/` och `drizzle.config.ts`: SQL-migreringarna som skapas av Drizzle Kit och konfigurationen för Drizzle Kit
- `src/`: källkoden
- `tests/`: API-testerna, i samma mappstruktur som `src/`, och `helpers/api.ts` med kod som testerna delar

### Mappen src: start och adresser

- `server.ts`: förbereder databasen och startar servern på angiven port
- `app.ts`: skapar Express-appen och bestämmer API:ets adresser
- `routes/`: en mapp per rutt, med en `index.ts` i varje. Mapparna bestämmer inte adresserna, se [adresser och mappar](#adresser-och-mappar)
- `graphql/`: GraphQL-schemat, resolvers, loaders och servern

### Mappen src: indata och logik

- `schemas/`: Zod-schemana som validerar indata
- `services/`: affärslogik och Drizzle-frågor, med en fil per område
- `types/`: typer som delas mellan flera filer
- `lib/`: hjälpfunktioner för lösenord, token, databasfel, foton, bildfunktionen, publika användaruppgifter och frågeräknaren

### Mappen src: konfiguration och CMS

- `config/env.ts`: läser miljövariablerna och ger ett fel om en obligatorisk variabel saknas
- `cms/`: hämtar guidernas texter och notiser från Contentful

### Mappen db: anslutningar och schema

- `postgres.ts`: anslutningen till Postgres och Drizzle
- `mongo.ts`: anslutningen till MongoDB
- `schema/`: tabellerna, med en mapp per tabell och tabellen i `index.ts`. En tabell med relationer har också en `relations.ts`, och `schema/index.ts` samlar allt åt Drizzle

### Mappen db: migrering och testdata

- `migrate.ts`: kör migreringarna från `api/drizzle/`
- `prepare.ts`: väntar på att Postgres ska bli tillgängligt, kör migreringarna och lägger in testdata om `SEED_ON_START=1`
- `seed.ts`: innehåller testdata för Postgres
- `migrate-logs.ts`: kopierar mätpunkterna från Postgres till MongoDB

### Mappen middleware

- `authentication.ts`: innehåller `requireUser`, `requireRole` och `getAuthenticatedUser`
- `rate-limit.ts`: hanterar hastighetsbegränsningen för inloggning och registrering
- `error-handler.ts`: hanterar fel från alla rutter

### Mappen shared

- `src/index.ts`: typer och konstanter som delas mellan API:et och klienten, till exempel `DIFFICULTIES` och `USER_ROLES`
- `src/schemas/auth.ts`: Zod-schemana för registrering och inloggning

## Uppdaterade dependencies

Följande dependencies har installerats eller uppdaterats:

- node (till v24.7.0 som innehåller "argon2id")
- graphql-yoga (till v6.1.0)
- drizzle-orm (v0.45.3)
- drizzle-kit (v0.31.11)
- zod (v4.6.7, nu också i `shared`)
- @testing-library/jest-dom (till v8.0.0)
- jsdom (till v31.0.1)
