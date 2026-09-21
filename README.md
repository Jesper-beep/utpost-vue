# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

```bash
npm install
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm start
```

Appen ligger sen på http://localhost:3000 och API:et pa http://localhost:4000.

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite

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



