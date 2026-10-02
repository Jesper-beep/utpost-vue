# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

```bash
npm install
npm run prepare
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm run dev
```

Appen ligger sen på <http://localhost:3000> och API:et pa <http://localhost:4000>.

Det finns inget npm start, använd npm run dev. Vue-klienten ligger på <http://localhost:3001>.

Man måste köra `npm run prepare` själv efter `npm install`, eftersom `ignore-scripts` är satt till `true` i `.npmrc-filen`.

## Struktur

- `api/` - Express + Postgres (Drizzle)
- `web/` - React + Vite
- `client/` - Vue 3 + Vue Router + Vite. Allt flyttas hit från `web/`, en bit i taget

## Kommandon

```bash
npm run lint
npm run lint:md
npm run lint:spelling
npm test
npm run build
```

Samma kommandon körs av CI på varje PR mot main. Se [pipeline](docs/pipeline.md).

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
