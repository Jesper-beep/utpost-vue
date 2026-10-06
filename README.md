# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

Du behöver ställa in flera .env-filer innan du börjar. Läs mer under [Miljövariabler](#miljövariabler).

```sh
npm install
npm run prepare
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm run dev
```

Appen ligger sen på <http://localhost:3000> och API:et på <http://localhost:4000>.

Det finns inget npm start, använd npm run dev. Vue-klienten ligger på <http://localhost:3001>.

Man måste köra `npm run prepare` själv efter `npm install`, eftersom `ignore-scripts` är satt till `true` i `.npmrc-filen`.

## Struktur

- `api/` - Express + Postgres (Drizzle)
- `web/` - React + Vite
- `client/` - Vue 3 + Vue Router + Vite. Allt flyttas hit från `web/`, en bit i taget

## Miljövariabler

Varje del har en egen `.env`-fil som inte checkas in. Kopiera `.env.example` och fyll i värdena:

```sh
cp api/.env.example api/.env
cp client/.env.example client/.env
cp web/.env.example web/.env
```

### `api/.env`

#### `DATABASE_URL` (krävs)

- Anslutning till Postgres
- Lokalt: `postgres://utpost:utpost@localhost:5433/utpost`

#### `JWT_SECRET` (krävs)

- Lång slumpad sträng som signerar inloggningar
- Skapa med `node -p "require('crypto').randomBytes(32).toString('hex')"`

#### `PORT`

- Valfri, standard `4000`

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

- Testerna ligger i `client/tests` och körs med `npm test`
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
