# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

Det finns två sätt att köra Utpost lokalt. Båda behöver OrbStack, Podman eller Docker och `.env`-filer. Läs mer under [Miljövariabler](#miljövariabler).

### Allt i Docker

Databasen, API:et och båda frontendarna körs i containrar.

```sh
cp .env.example .env
npm run docker:up
npm run docker:seed
```

- Vue-klienten ligger på <http://localhost:3001>
- React-appen ligger på <http://localhost:3000>
- API:et ligger på <http://localhost:4000>

#### Efter kodändringar

- Containrarna kör koden som fanns när de byggdes. Kör därför `npm run docker:up` igen för att bygga om och se dina ändringar.

#### Vue-klienten (client/) med Vite istället för nginx

Docker servar Vue-klienten (client/) med nginx. I utvecklarläge rekommenderas att köra:

```sh
npm install
npm run docker:client:stop
npm run dev:client
```

Då ligger API:et, databasen och React-appen kvar i Docker och bara Vue-klienten körs via Vite.

- `npm run docker:client:stop` slutar serva via nginx
- `npm run dev:client` börjar serva via Vite

Eftersom båda "tjänsterna" använder port `3001`, måste den ena stoppas innan den andra kan startas.

- När du kör via Vite så använder du `Ctrl+C` i terminalen för att avbryta
- Därefter kan du använda `npm run docker:client:start` för att serva via nginx igen

#### Felsökning och övrigt

- Kontrollera API:et med `curl localhost:4000/api/health`. Båda databaserna ska visa `ok`: `{"mongodb":"ok","ok":true,"postgres":"ok"}`
- Stoppa med `npm run docker:down`
- Stoppa och ta bort databasen med `npm run docker:reset`, kör sedan `npm run docker:up` och `npm run docker:seed` igen
- Får du `504` från API:et behöver du seeda, genom att köra `npm run docker:seed`

### Bara databasen i Docker

Databasen körs i Docker, resten körs på din dator med `npm run dev`. Det ger snabbare omladdning när du utvecklar.

```sh
npm install
npm run prepare
cp .env.example .env
cp api/.env.example api/.env
cp client/.env.example client/.env
cp web/.env.example web/.env
npm run docker:db
npm run seed
npm run dev
```

- Vue-klienten ligger på <http://localhost:3001>
- React-appen ligger på <http://localhost:3000>
- API:et ligger på <http://localhost:4000>
- Det finns inget `npm start` i roten, använd `npm run dev`
- Postgres nås på port `5433` och MongoDB på port `27017` från din dator
- Du måste köra `npm run prepare` själv efter `npm install`, eftersom `ignore-scripts` är satt till `true` i `.npmrc`-filen
- Stoppa databasen med `npm run docker:down`

Stoppa containrarna med `npm run docker:down` innan du byter sätt. Annars är portarna 3000, 3001 och 4000 upptagna.

## Struktur

- `api/` - Express + Postgres (Drizzle) + MongoDB
- `web/` - React + Vite
- `client/` - Vue 3 + Vue Router + Vite. Allt flyttas hit från `web/`, en bit i taget. I Docker serveras bygget av nginx, se `client/nginx`
- `shared/` - Kod som delas mellan delarna

## Miljövariabler

Projektets rot, `api/`, `client/` och `web/` har var sin `.env`-fil som inte ska checkas in.

Kopiera `.env.example` enligt nedan:

```sh
cp .env.example .env
cp api/.env.example api/.env
cp client/.env.example client/.env
cp web/.env.example web/.env
```

Vilka filer du behöver beror på hur du kör Utpost:

- Allt i Docker: bara `.env` i roten
- Bara databasen i Docker: alla fyra, eftersom `npm run dev` läser `api/.env`, `client/.env` och `web/.env`

### `.env` i roten

Läses av Docker Compose. Miljövariablerna används av både databaserna och API-containern.

#### `POSTGRES_USER`, `POSTGRES_PASSWORD` och `POSTGRES_DB`

Användare, lösenord och databasnamn för Postgres

#### `MONGO_USER`, `MONGO_PASSWORD` och `MONGO_DB`

Användare, lösenord och databasnamn för MongoDB

#### `JWT_SECRET`

- Samma sak som i `api/.env`, men för API-containern
- Lokalt: `dev-only-secret`

Kör du API:et utanför Docker måste miljövariablerna för Postgres och MongoDB stämma med `POSTGRES_URL` och `MONGODB_URL` i `api/.env`.

Kör du allt i Docker behöver du inte tänka på det. Då bygger Compose båda adresserna åt dig, med `postgres` och `mongo` som värdnamn.

Databaserna läser användare och lösenord första gången de startar. Ändrar du värdena i `.env` behöver du:

- Köra `npm run docker:reset`
- Köra `npm run docker:up`
- Köra `npm run docker:seed`

### `api/.env`

#### `POSTGRES_URL` (krävs)

Anslutning till Postgres

#### `MONGODB_URL` (krävs)

Anslutning till MongoDB

#### `JWT_SECRET` (krävs)

- Lång slumpad sträng som signerar inloggningar
- Skapa med `node -p "require('crypto').randomBytes(32).toString('hex')"`

#### `PORT`

- Valfri, standard `4000`

#### `UPLOAD_DIR`

- Valfri, standard `./uploads`
- Mappen där uppladdade filer ska sparas

API:et startar inte om `POSTGRES_URL`, `MONGODB_URL` eller `JWT_SECRET` saknas.

### `client/.env` och `web/.env`

#### `API_PROXY_TARGET`

- Adress till API:et för dev-proxyn
- Lokalt: `http://localhost:4000` (utan `/api`)

Båda "frontendarna" anropar alltid `/api`. Vite skickar vidare anropen till `API_PROXY_TARGET`, så ingen API-adress finns i koden. Starta om dev-servern efter att du ändrat en `.env`-fil.

## Kommandon

```sh
npm run lint
npm run lint:md
npm run lint:spelling
npm run typecheck
npm test
npm run build
```

Samma kontroller körs av CI på varje PR och vid push till main. Se [pipeline](docs/pipeline.md).

## Tester

- Klientens tester ligger i `client/tests` och API:ets i `api/tests`. Båda körs med `npm test`
- Alla tester ska vara gröna innan en PR mergas
- Buggfixar ska ha ett test, om det går
- Läs mer i [teststrategin](docs/testing.md)

## Deploy

Fråga Marcus.

## Branchstrategi

### Trunk-based

Vi kör "trunk-based" med följande motivering:

- Färre mergekonflikter
- Enklare i små team
- Bättre koll på kodbasen

## Arbetsöverenskommelse

- Pusha ofta, men inte så mycket kod
- Minst en som godkänner varje PR
- Bra kod (no slop/städad kod)
- Kontakt sker på Discord
- Alla behöver våga be om hjälp
- Vi hjälps åt att motivera teamet och hör av oss till varandra
