# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

Det finns två sätt att köra Utpost lokalt. Båda behöver OrbStack, Podman eller Docker och en `.env`-fil. Läs mer under [Miljövariabler](#miljövariabler).

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

#### Felsökning och övrigt

- Kontrollera API:et med `curl localhost:4000/api/health`
- Stoppa med `npm run docker:down`
- Stoppa och ta bort databasen med `npm run docker:reset`, kör sedan `npm run docker:seed` igen

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
- Databasen nås på port `5433` från din dator
- Du måste köra `npm run prepare` själv efter `npm install`, eftersom `ignore-scripts` är satt till `true` i `.npmrc`-filen
- Stoppa databasen med `npm run docker:down`

Stoppa containrarna innan du byter sätt. Annars är portarna 3000, 3001 och 4000 upptagna.

## Struktur

- `api/` - Express + Postgres (Drizzle)
- `web/` - React + Vite
- `client/` - Vue 3 + Vue Router + Vite. Allt flyttas hit från `web/`, en bit i taget
- `shared/` - Kod som delas mellan delarna

## Miljövariabler

Projektets rot och varje "del" har en egen `.env`-fil som inte ska checkas in.

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

Läses av Docker Compose. Värdena används av både databasen och API-containern.

#### `POSTGRES_USER`, `POSTGRES_PASSWORD` och `POSTGRES_DB`

- Användare, lösenord och databasnamn för Postgres
- Lokalt: `utpost` för alla tre

#### `JWT_SECRET`

- Samma sak som i `api/.env`, men för API-containern
- Lokalt: `dev-only-secret`

Värdena för Postgres måste matcha `DATABASE_URL` i `api/.env` när du kör API:et utanför Docker. I Docker bygger Compose `DATABASE_URL` själv, med tjänstnamnet `postgres` och porten `5432`.

Ändrar du Postgres-värdena efter första start behåller den gamla databasvolymen de gamla. Kör `npm run docker:reset` för att börja om.

### `api/.env`

#### `DATABASE_URL` (krävs)

- Anslutning till Postgres
- Lokalt: `postgres://utpost:utpost@localhost:5433/utpost`

#### `JWT_SECRET` (krävs)

- Lång slumpad sträng som signerar inloggningar
- Skapa med `node -p "require('crypto').randomBytes(32).toString('hex')"`

#### `PORT`

- Valfri, standard `4000`

#### `UPLOAD_DIR`

- Valfri, standard `./uploads`
- Mappen där uppladdade filer ska sparas

API:et startar inte om `DATABASE_URL` eller `JWT_SECRET` saknas.

### `client/.env` och `web/.env`

#### `API_PROXY_TARGET`

- Adress till API:et för dev-proxyn
- Lokalt: `http://localhost:4000` (utan `/api`)

Båda "frontendarna" anropar alltid `/api`. Vite skickar vidare anropen till `API_PROXY_TARGET`, så ingen API-adress finns i koden. Starta om dev-servern efter att du ändrat en `.env`-fil.

## Kommandon

```bash
npm run lint
npm run lint:md
npm run lint:spelling
npm run typecheck
npm test
npm run build
```

Samma kommandon körs av CI på varje PR mot main. Se [pipeline](docs/pipeline.md).

## Tester

- Klientens tester ligger i `client/tests` och API:ets i `api/tests`. Båda körs med `npm test`
- Alla tester ska vara gröna innan en PR mergas
- Buggfixar ska ha ett test, om det går
- Läs mer i [teststrategin](docs/testing.md)

## Deploy

Fråga Marcus.

## Branchstrategi

### Trunk-based

Vi kommer "trunk-based" med följande motivering:

- Färre mergeconflicts
- Enklare i små teams
- Bättre koll på kodbasen

## Working Agreement

- Pusha ofta, men inte så mycket kod
- Minst en som godkänner varje PR
- Bra kod (no slop/städad kod)
- Kontakt sker på Discord
- Alla behöver våga be om hjälp
- Vi hjälps åt att motivera teamet och hör av oss till varandra
