---
title: "Säkerhet"
description: "Så skyddar vi Utpost efter M8: hotbilden, autentiseringen, OWASP Top 10 (2025) risk för risk, säkerhetshålen vi fixade och testade, valideringen, headers, skanningen i pipelinen samt kända brister."
created: "2026-11-16"
published_date: "-"
last_modified_date: "2026-11-25"
version: "1"
---

Efter M8 kontrollerar API:et i Utpost vem du är och vad du skickar in. Här går vi igenom säkerheten risk för risk enligt [OWASP Top 10](https://top10.owasp.org/2025/) från 2025.

OWASP (Open Worldwide Application Security Project) är en ideell organisation. Deras Top 10 listar de tio allvarligaste säkerhetsriskerna i webbappar.

## Uppdatering 25 november 2026

Backenden är omarbetad, se [dokumentet om backenden](backend.md). Texten nedan beskriver koden som den var i M8, och filerna som den länkar till har bytt namn eller är borttagna.

- Lösenorden hashas nu med Argon2id i stället för scrypt, i formatet `argon2id:<salt>:<nyckel>`. Varje inloggningsförsök kostar 19 MiB minne i stället för 128 MiB
- GraphQL kontrollerar token med samma `verifyToken` som REST och godtar bara HS256. Det lagar fyndet under [A08](#a08-software-or-data-integrity-failures) och den del av bristen under [Åtkomst och indata](#åtkomst-och-indata) som gäller algoritmen. Gränsen för hur djupa frågorna får vara saknas fortfarande, men vi ska lägga till `@envelop/depth-limit`, se [begränsa frågornas djup](backend.md#begränsa-frågornas-djup)
- Indata valideras med `schema.parse(...)` direkt i rutterna, och `validate.js` är borttaget. Avstånd och längd måste vara tal, så `null` och tomma strängar blir inte 0
- Inloggning och registrering har en gräns på tio försök per 15 minuter och IP-adress, se [hastighetsbegränsning](backend.md#hastighetsbegränsning-på-inloggning-och-registrering). Det lagar fyndet under [A06](#a06-insecure-design) och den del av bristen under [Inloggning och token](#inloggning-och-token) som gäller antalet försök. Gränsen är avstängd i utvecklings- och testmiljön, och kontona spärras fortfarande inte
- Express 5 skickar fel från asynkrona handlers vidare till felhanteraren i `middleware/error-handler.ts`, så `wrap` under [A10](#a10-mishandling-of-exceptional-conditions) behövs inte längre
- Lösenordet ska ha 16 till 64 tecken (Unicode-kodpunkter) i stället för minst åtta, och normaliseras med NFKC. Vid inloggning kontrolleras bara att det har 1 till 64 tecken

## Hotbilden

Utpost har konton, guider och turer att skydda. Angriparen kan vara vem som helst som anropar API:et direkt, till exempel med curl (ett program som skickar HTTP-anrop från terminalen). Det kan också vara en medlem som vill ändra någon annans tur.

## Autentiseringen (M8)

Autentisering betyder att vi kontrollerar vem du är. Vi gör det med lösenord och token.

### Lösenord

Vi sparar aldrig själva lösenordet, bara ett hashvärde. Ett hashvärde är resultatet av en beräkning som inte går att köra baklänges.

Vi räknar ut hashvärdet med scrypt (en hashfunktion för lösenord) från lösenordet plus ett salt (16 slumpade byte som är unika för varje användare). Två användare med samma lösenord får därför olika hashvärden. Vi sparar hashvärdet i formatet `scrypt:<salt>:<nyckel>` i `users.password_hash`.

#### Mer om scrypt

- scrypt är långsam med flit, så det blir dyrt att gissa lösenord om databasen läcker
- Inställningarna N, r och p följer OWASP:s rekommendation
- Koden finns i [`password.js`](../api/src/lib/password.js) och [`auth.js`](../api/src/lib/auth.js)

### Inloggningens svar

När du loggar in räknar API:et ut hashvärdet för lösenordet du skrev och jämför det med hashvärdet i databasen. En vanlig jämförelse slutar vid första skillnaden, så svarstiden avslöjar hur mycket som stämde. `timingSafeEqual` jämför alltid alla byte och tar lika lång tid varje gång.

Finns inget konto med e-postadressen kör API:et ändå `verifyPassword` mot ett påhittat hashvärde. Då tar fel e-post och fel lösenord lika lång tid och svarstiden avslöjar inte vilka konton som finns.

`publicUser` tar bort `password_hash` ur alla svar.

### Token

Vår token är en JWT (JSON Web Token), ett bevis på att du har loggat in. Den innehåller `id`, `email` och `role`. Vi signerar den med HS256 (en metod som använder en hemlighet som bara API:et känner till).

- Den gäller en timme, så en token som läcker blir snart värdelös
- Hemligheten kommer ur miljövariabeln `JWT_SECRET` och API:et startar inte utan den. `requireUser` godtar bara token som är signerade med HS256
- Klienten sparar token i minnet (se [`token.ts`](../client/src/lib/token.ts)) i stället för i `localStorage`, som allt JavaScript på sidan kan läsa. Priset är att du blir utloggad när du laddar om sidan, se [utloggad efter omladdning](#utloggad-efter-omladdning)

### Skyddet sitter i API:et

HTTP-statuskod 401 betyder att vi inte vet vem du är. HTTP-statuskod 403 betyder att vi vet vem du är, men att du saknar behörighet till det du ber om. Kontrollen sitter i API:et, i [`auth.js`](../api/src/lib/auth.js).

Klienten har en router. Den visar rätt vy för adressen i webbläsaren och skickar dig till inloggningssidan om du inte är inloggad, se [`index.js`](../client/router/index.js). Då slipper du en vy som ändå inte fungerar. Den som anropar API:et direkt, till exempel med curl, går förbi routern. Därför måste API:et kontrollera själv.

API:et kräver ingen token för inloggning, registrering och anrop med `GET`.

### Vad API:et kräver token för

- Att skapa en tur med `POST /api/tours` eller `createTour` i `/graphql`
- Att ta bort en tur med `DELETE /api/tours/:id`. Turen ska vara din om du inte är redaktör
- Att lägga till ett foto med `POST /api/photos`. Turen ska vara din
- Att ändra en guide med `PUT /api/guides/:id`. Du ska vara redaktör (rollen `editor`)

#### Uppdatering 20 november 2026

Vi har tagit bort mutationen `createTour`. Du skapar nu en tur bara med `POST /api/tours`.

## Genomgång av OWASP Top 10

Varje risk börjar med "Gäller oss?". Under "Fynd" står det vi hittade. Under "Rättning" står vad vi lagade och i vilken PR (pull request, en begäran om att slå ihop kod). Under "Test" står testet som bevisar rättningen. Testerna ligger i [`routes.test.js`](../api/src/routes/routes.test.js).

Varje rättning har ett test som misslyckades innan vi lagade hålet. Körningen där testet misslyckades står i PR-beskrivningen. När ett fynd finns i [skulddokumentet](debt.md) står skuldens nummer inom parentes, till exempel (skuld 6).

### A01 Broken Access Control

#### Gäller oss?

Ja, vem som helst kunde lägga till, ändra och radera data genom API:et.

#### Fynd

- API:et lät vem som helst radera en tur med `DELETE /api/tours/:id` i [`tours.js`](../api/src/routes/tours.js) utan inloggning (skuld 6)
- API:et tog emot bilder med `POST /api/photos` i [`photos.ts`](../api/src/routes/photos.ts) utan inloggning
- API:et lät vem som helst ändra en guide med `PUT /api/guides/:id` i [`guides.js`](../api/src/routes/guides.js) (skuld 5)

#### Rättning

- PR #70 (steg 2) lade till `requireUser`, så API:et kräver inloggning för att skapa en tur, ta bort en tur och lägga till ett foto
- Vid `DELETE` jämför API:et turens ägare (`user_id` i databasen) med användaren i token. API:et svarar med statuskod 401 utan token, 403 om turen är någon annans och 404 om turen saknas
- PR #70 (steg 4) lade till `requireUser`, `requireRole("editor")` och `validate(guideUpdateSchema)` för `PUT /api/guides/:id`. API:et svarar med statuskod 404 om guiden saknas

#### Test

##### Turer och bilder

- `DELETE /api/tours/:id utan token ger 401 och turen finns kvar`
- `en medlem kan inte ta bort någon annans tur (403)`
- `POST /api/photos utan token ger 401 - uppladdning kräver inloggning`

##### Guider

- `PUT /api/guides/:id utan token ger 401 och guiden ändras inte`
- `en medlem kan inte ändra en guide (403)`

### A02 Security Misconfiguration

#### Gäller oss?

Ja, både API:et och nginx har inställningar som kan vara fel. CORS (Cross-Origin Resource Sharing) bestämmer vilka andra webbplatser som får anropa API:et från en webbläsare. Mer om headers står under [headers vi sätter i nginx](#headers-vi-sätter-i-nginx).

#### Fynd

- API:et svarade med `Access-Control-Allow-Origin: *`, eftersom [`app.js`](../api/src/app.js) hade `app.use(cors())`. Då fick alla webbplatser anropa API:et
- Express skickade headern `X-Powered-By`, som avslöjar att API:et kör Express

#### Rättning

- PR #70 (steg 4) tog bort paketet `cors`, eftersom klienten når API:et på samma adress genom nginx och Vite
- PR #70 (steg 5) stängde av `X-Powered-By` i Express med `app.disable("x-powered-by")`

#### Test

`svaret ger ingen access-control-allow-origin till en annan webbplats`

### A03 Software Supply Chain Failures

#### Gäller oss?

Ja, eftersom API:et och klienten använder många npm-paket och containeravbildningarna innehåller paket från operativsystemet. Jobbet Säkerhet kör `npm audit` och Trivy på varje PR, se [skanning i pipelinen](#skanning-i-pipelinen).

#### Fynd

Vi sparade inte resultatet från den första skanningen. Därför körde vi om Trivy mot koden före steg 5 den 17 november 2026.

- Två sårbarheter med allvarlighetsgrad HIGH i nginx-containeravbildningen för `client`: CVE-2026-107891 i `musl` och `musl-utils` och CVE-2026-85091 i `zlib`
- Tio sårbarheter med allvarlighetsgrad HIGH i paketen `brace-expansion`, `ip-address`, `tar` och `undici`, som följer med npm i containeravbildningen för `api`

Vi har inte godkänt några undantag, så [`.trivyignore`](../.trivyignore) är tom.

#### Rättning

- PR #70 (steg 5) uppgraderade `musl`, `musl-utils` och `zlib` i nginx-containeravbildningen för `client`, se [`Dockerfile`](../client/Dockerfile)
- PR #70 (steg 5) tog bort npm ur containeravbildningen för `api`, se [`Dockerfile`](../api/Dockerfile)

#### Mät själv

Med kommandona bygger du containeravbildningarna från koden före steg 5 i en tillfällig mapp och skannar dem med samma Trivy-version och inställningar som `scripts/security-scan.mjs`. Ditt resultat kan skilja sig från vårt, eftersom containeravbildningarna vi bygger på och Trivys databas uppdateras.

In:

```bash
mkdir -p /tmp/utpost-old
git archive 8a3be17 | tar -x -C /tmp/utpost-old
cd /tmp/utpost-old
docker build -f client/Dockerfile -t utpost-client-old .
docker build -f api/Dockerfile -t utpost-api-old .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache ghcr.io/aquasecurity/trivy:0.76.2 image --severity HIGH,CRITICAL --ignore-unfixed utpost-client-old
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache ghcr.io/aquasecurity/trivy:0.76.2 image --severity HIGH,CRITICAL --ignore-unfixed utpost-api-old
```

### A04 Cryptographic Failures

#### Gäller oss?

Ja, eftersom lösenord och token är det som är värt att stjäla.

#### Fynd

- API:et sparade lösenorden i klartext med `plaintext:` framför (skuld 2)
- Vid inloggning och registrering skickade API:et tillbaka hela användarposten, också lösenordet (skuld 4)
- Hemligheten för token låg i koden (skuld 3). Vi lagade det i M6, se [Hemligheten](../README.md#hemligheten) i README

#### Rättning

PR #70 (steg 2) införde scrypt i `password.js` och `publicUser` i `auth.js`. Seedskriptet (som fyller databasen med testdata) räknar ut hashvärdet för `hemligt123` en gång och använder det för alla testkonton. Typen `LoginResponse.user` i `shared` innehåller bara de publika fälten.

#### Test

- `lösenordet i databasen är hashat, inte klartext`
- `svaret på en lyckad inloggning innehåller token och användaren - men aldrig password_hash`

### A05 Injection

#### Gäller oss?

Ja, eftersom det du skriver i sökrutan hamnar i en SQL-fråga. SQL är språket vi använder för att prata med databasen.

#### Fynd

- API:et byggde SQL-frågan för `GET /api/guides/search` i `guides.js` med strängkonkatenering (sammanfoga strängar). Ett citattecken i sökordet blev då en del av frågan (skuld 1)
- Skuld 8 gällde React-appen, där en guide kunde innehålla kod som körs hos besökaren. Vue-klienten använder inte `v-html` och webbläsaren kör bara skript från vår egen adress tack vare `Content-Security-Policy`, se [headers vi sätter i nginx](#headers-vi-sätter-i-nginx)

#### Rättning

Sedan PR #70 (steg 2) skickar API:et sökordet som parametern `$1`, och databasen läser aldrig en parameter som kod. API:et begränsar sökordet till 100 tecken med `searchSchema`.

#### Test

`ett citattecken i sökordet ger 200 och en tom lista, inte 500`

### A06 Insecure Design

#### Gäller oss?

Delvis. Det mesta av skyddet finns och det som saknas står under "Fynd".

#### Det vi har

- Gränser för all indata i [`schemas.js`](../api/src/lib/schemas.js)
- En kontroll som jämför turens ägare i databasen med användaren i token
- En bild per tur. API:et svarar med statuskod 409 om turen redan har en
- Ett tak för hur stor en uppladdning får vara

#### Fynd

Inloggningen har ingen gräns för antal försök (rate limiting). Vi har inte lagat det än, se [kända brister](#kända-brister-medvetet-kvar).

### A07 Authentication Failures

#### Gäller oss?

Ja, eftersom inloggningen inte får avslöja vilka konton som finns.

#### Fynd

- Fel lösenord och okänd e-post gav redan samma svar, så där fanns inget hål
- API:et svarar med statuskod 409 vid registrering när e-postadressen redan finns och avslöjar då att kontot finns

#### Rättning

Token gäller en timme i stället för trettio dagar.

#### Test

- `fel lösenord och okänd e-post ger samma svar (401, samma text)`
- `registrering med för kort lösenord ger 400 med vad som var fel`

### A08 Software or Data Integrity Failures

#### Gäller oss?

Delvis. Vi bygger containeravbildningarna för `api` och `client` själva, men de bygger på färdiga containeravbildningar från andra, till exempel `node`. Pipelinen använder också färdiga steg från andra (actions).

#### Fynd

- `requireUser` godtar bara token som är signerade med HS256. Men `userFrom` i [`server.js`](../api/src/graphql/server.js) kör `jwt.verify` utan att ange algoritm när den kontrollerar token för `/graphql`
- Stegen för Trivy och ZAP i [`ci.yml`](../.github/workflows/ci.yml) är låsta till en commit. De andra stegen är låsta till en versionstagg, som ägaren kan flytta till ny kod

Vi har inte lagat något av dem än.

### A09 Security Logging & Alerting Failures

#### Gäller oss?

Ja, eftersom vi inte ser om någon provar sig fram till ett lösenord.

#### Fynd

Felhanteraren loggar metod, adress och meddelande när API:et svarar med HTTP-statuskod 500. API:et loggar inte misslyckade inloggningar (statuskod 401) och nekade anrop (statuskod 403). Vi har inte lagat det än, se [kända brister](#kända-brister-medvetet-kvar).

### A10 Mishandling of Exceptional Conditions

#### Gäller oss?

Ja, eftersom ett oväntat fel kan göra att anropet hänger sig eller att API:et avslöjar detaljer.

#### Fynd

- Express 4 fångar inte fel i asynkron kod, så felet nådde aldrig felhanteraren och anropet hängde sig (skuld 10)
- Anropet hängde sig när ID:t inte var ett tal och när JSON:en var trasig
- Skuld 9 var att en för stor bild kunde få servern att sluta fungera. Vi lagade det i M7 när en Azure Function tog över bildbehandlingen, se [`serverless.md`](decisions/serverless.md)

#### Rättning

- PR #70 (steg 2) lade `wrap` (en funktion som skickar felet vidare till felhanteraren) runt koden som svarar på anrop och en felhanterare sist i `app.js`. Felhanteraren svarar med statuskod 400 när anropet är felaktigt, 413 när anropet är för stort och 500 utan detaljer för allt annat
- API:et stoppar ett ID som inte är ett tal med `idParam`

#### Test

- `ett id som inte är ett tal ger 400, inte ett ohanterat fel`
- `trasig JSON ger 400 med ett svar - inte ett anrop som hänger`
- `ett tourId som inte är ett heltal stoppas med 400 innan något sparas`

## Validering av indata

Validering betyder att vi kontrollerar indata innan vi använder den. Klienten kontrollerar också indata, men den som anropar API:et direkt går förbi klienten. Därför kontrollerar API:et indata innan koden som hanterar anropet får den.

Vi skriver scheman (beskrivningar av hur indata ska se ut) med [Zod](https://zod.dev/). De ligger i [`schemas.js`](../api/src/lib/schemas.js).

### Scheman

- `loginSchema` och `registerSchema` för inloggning och registrering, där lösenordet ska ha minst åtta tecken
- `createTourSchema` för nya turer
- `guideUpdateSchema` för redaktionens ändringar av en guide
- `searchSchema` för sökordet efter frågetecknet i adressen och `idParam` för ID:t i adressen

### Så fungerar valideringen

`validate(schema)` i [`validate.js`](../api/src/lib/validate.js) byter ut `req.body` mot det validerade värdet. Värdet har rätt typer och inga okända fält. Sökordet hamnar i `req.validQuery`, eftersom `req.query` inte går att skriva över i Express 4.

Vid ogiltig indata svarar API:et med statuskod 400 och `{ error: "ogiltig indata", issues: [{ path, message }] }`. Vid trasig JSON svarar API:et också med 400 och vid ett för stort anrop med 413. Vid alla andra fel svarar API:et med 500 utan detaljer och skriver detaljerna i loggen.

När du laddar upp en bild skickar klienten bara bildens rådata. Därför kontrollerar `readTourId` i [`photos.ts`](../api/src/routes/photos.ts) att `tourId` i adressen är ett tal. API:et använder inte scheman i `/graphql`, se [kända brister](#kända-brister-medvetet-kvar).

## Headers vi sätter i nginx

En header är en extra rad i svaret som talar om för webbläsaren hur webbplatsen får användas. Vi har samlat våra headers i [`headers.conf`](../client/nginx/headers.conf) och nginx läser in filen med `include` i `default.conf.template`.

### Skydd mot angrepp

- `Content-Security-Policy` säger åt webbläsaren att bara ladda resurser från vår egen adress och att stoppa inbäddning i andra webbplatser
- `X-Content-Type-Options: nosniff` säger åt webbläsaren att inte gissa filtyp
- `X-Frame-Options: DENY` säger åt webbläsaren att inte låta andra webbplatser bädda in vår webbplats
- `Strict-Transport-Security` säger åt webbläsaren att bara använda HTTPS i ett år

### Övriga headers

- `Referrer-Policy`, `Permissions-Policy` och `X-Permitted-Cross-Domain-Policies` säger åt webbläsaren att begränsa vad webbplatsen delar och får göra
- `Cache-Control: no-cache, no-store` ber webbläsaren att inte spara svar
- Headern `X-Powered-By` har värdet Shrek och avslöjar inget om servern. Pipelinen kontrollerar att värdet stämmer

### Mät själv

Med kommandot ser du headers för startsidan i stagingmiljön.

In:

```bash
curl -I https://utpost-staging.yellowisland-a04de7fc.swedencentral.azurecontainerapps.io/
```

## Skanning i pipelinen

Jobbet Säkerhet i [`ci.yml`](../.github/workflows/ci.yml) körs på varje PR och varje push till `main`, samtidigt som de andra jobben. Flödet står i [`pipeline.md`](pipeline.md).

### Verktygen, billigast först

1. `npm audit --omit=dev --audit-level=high` letar efter kända sårbarheter i paketen som körs i produktion
2. [Trivy](https://trivy.dev/) skannar repot efter sårbarheter och hemligheter
3. Trivy skannar containeravbildningarna `utpost-api` och `utpost-client` efter sårbarheter i operativsystemet och paketen
4. [ZAP](https://www.zaproxy.org/) (Zed Attack Proxy) gör en baseline-skanning (en lätt skanning som bara tittar på svaren och inte skickar några attacker) av webbplatsen medan den kör

### När jobbet misslyckas

- npm audit hittar något på nivån high eller värre
- Trivy hittar något på nivån HIGH eller CRITICAL som går att laga med en nyare version. Trivy hoppar över fynd som ingen har lagat än (`ignore-unfixed`), eftersom vi inte kan göra något åt dem
- ZAP hittar ett problem vars regel står som `FAIL` i [`rules.tsv`](../.zap/rules.tsv), till exempel saknad `Content-Security-Policy`, saknad `nosniff` eller saknat skydd mot inbäddning

### Undantag

Vi samlar undantagen i [`.trivyignore`](../.trivyignore) och [`rules.tsv`](../.zap/rules.tsv). `.trivyignore` är tom och några regler i `rules.tsv` står som `WARN` eller `IGNORE`.

Vi ignorerar regel 10037 (`X-Powered-By` läcker information), eftersom nginx byter värdet till Shrek och pipelinen kontrollerar det.

## Kända brister (medvetet kvar)

### Utloggad efter omladdning

Du blir utloggad när du laddar om sidan, eftersom token bara ligger i minnet. Nästa steg är en refresh-token i en `httpOnly`-cookie, som JavaScript inte kan läsa. En refresh-token är en extra token som klienten använder för att hämta en ny token utan att du loggar in igen.

### Inloggning och token

- Inloggningen har ingen gräns för antal försök och ingen spärr av konton. Varje försök kostar 128 MiB minne i scrypt och API:et har 1 GiB i stagingmiljön, så några samtidiga försök kan fylla minnet
- När du loggar ut tar klienten bara bort sin token. En token som någon redan har kopierat gäller tills den går ut efter en timme. Om din roll ändras gäller den nya rollen först då
- API:et svarar med statuskod 409 vid registrering när e-postadressen redan finns, så vem som helst kan ta reda på vilka konton som finns

### Åtkomst och indata

- Vem som helst kan läsa turer, bilder och mätpunkter, eftersom API:et inte kräver token för anrop med `GET` (skuld 7)
- API:et kontrollerar inte indata i `/graphql` med `createTourSchema`, så `createTour` tar emot värden som `POST /api/tours` nekar
- API:et anger ingen algoritm när det kontrollerar token i `/graphql` och har ingen gräns för hur djupa frågorna får vara
- Kontona i testdata, till exempel `redaktor@utpost.se`, har samma kända lösenord ("hemligt123") i stagingmiljön. Stagingmiljön är åtkomlig från internet

#### Uppdatering 20 november 2026

Vi har tagit bort mutationen `createTour`. Då finns inte längre bristen att `createTour` tog emot värden som `POST /api/tours` nekar.

### Loggning och skanning

- API:et loggar inte säkerhetshändelser, så vi ser varken misslyckade inloggningar eller nekade anrop
- ZAP gör bara en baseline-skanning, så ingen skanning skickar några attacker mot webbplatsen
