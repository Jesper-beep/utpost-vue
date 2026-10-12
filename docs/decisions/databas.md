---
title: "Databas"
description: "Beslut om dokumentmodell för turer, med uppmätta siffror (storlek på /api/tours-svaret, antal rader i tour_logs och största turen). Del av M3-momentet."
created: "2026-10-12"
published_date: "2026-10-12"
last_modified_date: "2026-10-12"
version: 1
---

## Beslut

Vi sparar varje tur som ett eget dokument i MongoDB. Punkterna från `tour_logs` och bilderna ligger inbäddade i dokumentet.

Användare och guider stannar i Postgres. Turen pekar på dem med `user_id` och `guide_id`.

Migreringen görs (kanske) i M5, inte nu (se [utläggning nedan](#problemet-är-kanske-inte-postgres)).

## Nuläge och bakgrund

Idag är det som räknas som en "Tur" i Utpost (`/turer`, `/turer/:id`) förekommande i flertalet Postgres-tabeller.

Till exempel `tours` och `tour_logs`. `tour_id` förekommer även i `photos`-tabellen.

Ju fler turer, desto fler "uppslag" måste göras, och det tar dessutom utrymme i databasen.

Om allt detta kan sparas som ett "MongoDB-dokument" skulle det krävas färre uppslag, och det skulle ta något mindre utrymme (se mätningarna nedan).

Tabellen `tour_logs` tar 576 kB på disk, inklusive index, för 5857 rader. Det blir ungefär 100 byte per rad.

### Uppmätta siffror

- Storlek på `/api/tours`-svaret: 278 kB
- Rader i `tour_logs`: 5857, fördelade på 200 turer
- Största turen: 39 punkter, ett dokument på 3,4 kB
- Frågor för en lista på `/turer`: upp till 201

Siffrorna kommer från seedad data. En riktig tur har ungefär 300 punkter, enligt kommentaren i `schema.js`.

### Postgres saknar index på `tour_id`

`tour_logs` saknar index på `tour_id`. Det är den kolumn som alla uppslag görs på, till exempel `where tour_id = $1` i `api/src/routes/tours.js`.

Utan index kan Postgres behöva läsa hela tabellen för varje tur. Listan på `/turer` hämtar 50 turer och gör fyra frågor per tur, alltså upp till 201 frågor för en sida.

Ett index på `tour_logs(tour_id)` skulle göra varje uppslag billigare och hör till det vi kan göra idag inom Postgres.

Det löser dock inte att en tur ligger utspridd över flera tabeller och kräver flera frågor.

Jämförelsen av storlek (se nedan) är därför något till Postgres fördel: MongoDB-samlingen har ett eget index på `tour_id` (och `_id`), medan Postgres bara har primärnycklarna ("primary key").

Trots det blev MongoDB mindre.

## Dokumentmodell

Så här skulle en tur kunna se ut som ett dokument. Värdena är bara exempel, men fälten kommer från `tours`, `tour_logs` och `photos`. Det här är ett förslag, inget färdigt.

```json
{
    "tour_id": 70,
    "user_id": 4,
    "guide_id": 12,
    "title": "Tur 70",
    "started_at": "2026-05-14T08:12:00Z",
    "distance_m": 18400,
    "notes": null,
    "stats": { "points": 39, "elevation_gain_m": 412, "avg_heart_rate": 121 },
    "logs": [
        { "t": "2026-05-14T08:12:00Z", "lat": 61.2, "lon": 14.9, "elevation_m": 640, "heart_rate": 118, "note": null }
    ],
    "photos": [
        { "filename": "tour-70-1.jpg", "width": 4032, "height": 3024, "created_at": "2026-05-14T11:40:00Z" }
    ]
}
```

### Bäddas in

Det som alltid läses tillsammans med turen och som aldrig slås upp från något annat håll:

- `logs`: punkterna hör bara till sin tur
- `photos`: bilderna visas också bara på sin tur

Det är här MongoDB kan "samla" allt som har med en tur att göra, i stället för att det ligger utspritt på tre tabeller.

### Refereras

Det som ändras på ett ställe, men syns på många turer:

- `user_id`: byter någon namn ska det inte behöva ändras på alla deras turer
- `guide_id`: samma sak med guidens titel

Listan på `/turer` behöver ändå namn och guidetitel. Dem får vi hämta från Postgres, med en fråga för alla turer i stället för en per tur.

### Beräknas i förväg

Sånt som annars räknas ut varje gång en tur visas. Det ligger i `stats`:

- `points`: antal punkter
- `elevation_gain_m`: total stigning (idag räknar klienten ut den, för varje tur)
- `avg_heart_rate`: medelpuls

Då slipper klienten gå igenom alla punkter varje gång.

### Index

- `tour_id` (unikt), finns kvar tills migreringen är klar
- `user_id` och `started_at` (fallande), för en användares turer
- `started_at` (fallande), för listan på `/turer`

### Gränsen

Vi låter en tur ha upp till 5 000 punkter inbäddade. Det blir ungefär 0,45 MB (c:a 90 byte per punkt).

Vad är en realistisk tur? Idag har en tur ungefär 300 punkter. Sparar vi en punkt var 10:e sekund blir en heldag på 10 timmar ungefär 3 600 punkter, alltså c:a 0,3 MB. Det är en lång tur, och 5 000 punkter ger lite marginal över den. Hur ofta en punkt sparas vet vi inte än, så det är en uppskattning.

MongoDB har en egen gräns på 16 MB per dokument, vilket är ungefär 180 000 punkter. Den behöver vi inte tänka på.

Blir en tur ändå större än 5 000 punkter, till exempel om en punkt sparas varje sekund, lägger vi punkterna i en egen samling (`tour_points`), med högst 1 000 punkter per dokument och `tour_id` som koppling. Tur-dokumentet behåller sina `stats`.

## Vad som stannar i Postgres

### users

Stannar. Inloggning, roller och lösenord hör hemma här, och turer pekar på användaren med `user_id`.

### guides

Stannar. Redaktionen ändrar en guide på ett ställe, och den syns på många turer.

### tours

Flyttas till MongoDB. Raden blir fälten högst upp i dokumentet. Tabellen finns kvar tills migreringen är klar.

### tour_logs

Flyttas till MongoDB som `logs` i dokumentet. Tabellen finns kvar, men ingen kod skriver till den, tills migreringen är verifierad.

### photos

Flyttas till MongoDB som `photos` i dokumentet. Tabellen finns kvar tills migreringen är klar.

## Migrering i M5

### Steg

1. Ta en `pg_dump` av `tours`, `tour_logs` och `photos`
2. Skapa indexen i MongoDB
3. Gör ett skript utifrån `mongo-smoke.js` som går igenom alla rader i `tours` och skriver ett dokument per tur med `replaceOne` och `upsert` på `tour_id`. Det går att köra om
4. Verifiera, se nedan
5. Kör skriptet i steg 3 igen, så att nya turer kommer med, och byt läsningarna (`GET /api/tours`, `/api/tours/latest` och `/api/tours/:id`) till MongoDB
6. Byt skrivningarna (`POST` och `DELETE` på `/api/tours`, samt bilderna) till MongoDB
7. Låt `tour_logs` ligga kvar, men ingen kod skriver till den, tills inget längre läser från den. Ta sedan bort tabellerna `tour_logs`, `photos` och `tours`

Mellan steg 5 och 6 hamnar nya turer bara i Postgres. Håll det fönstret kort, och kör skriptet en sista gång efter steg 6 så att inget missas.

### Verifiering

- Antal dokument är lika med antal rader i `tours`
- Summan av `stats.points` är lika med antal rader i `tour_logs` (5857 med dagens seed)
- Tio turer jämförs fält för fält mellan Postgres och MongoDB
- `/turer/:id` ger samma svar före och efter bytet

### tour_logs

Tabellen tas inte bort förrän verifieringen är grön och läsningarna har bytts. "Dumpen" från steg 1 sparas.

## Alternativ vi jämförde

### Stanna i Postgres med index

Lägg till ett index på `tour_logs(tour_id)` och hämta alla turer med en fråga per tabell i stället för fyra per tur.

Det borde lösa de 201 frågorna och kräver ingen ny databas. Men en tur ligger fortfarande utspridd på tre tabeller, och `tour_logs` växer med ungefär 300 rader per tur.

### Problemet är (kanske) inte Postgres

Problemet idag är inte Postgres i sig, utan hur koden är skriven. Just nu körs multipla queries, och `tour_logs` saknar index.

Så som uppgiften är utformad, finns inget utrymme att faktiskt testa huruvida MongoDB skulle vara snabbare och "bättre".

I våra mätningar är mängden data på disk väldigt liten.

Att dessutom köra två databaser istället för en, skapar mycket extrajobb.

Att MongoDB kan "samla" allt som har med turer att göra är ett plus. Men är det tillräckligt med plus för att lägga tid och energi på en migrering?

Om uppgiften hade tillåtit det, skulle vi nog ha gjort det. Vi kommer ändå att gå igenom all backend-kod. Två snabba vi hade kunnat fixa relativt enkelt:

- Lägga på ett index på `tour_logs(tour_id)` (gör förfrågningar c:a 4 till 8 gånger snabbare)
- Samla värden med `json_agg` (ej mätt)

Värt att nämna är dock att vi pratar om mycket, mycket små vinningar.

#### Fultest med index

0. Droppa index om det redan finns

    ```sh
    docker exec utpost-postgres psql -U admin -d utpost -c "drop index if exists tour_logs_tour_id_idx"
    ```

    "DROP INDEX"

1. Skapa en baseline utan index:

    ```sh
    docker exec utpost-postgres psql -U admin -d utpost -c "explain analyze select * from tour_logs where tour_id = 70"
    ```

    Se, execution time (hur lång tid Postgres tog på sig att köra "queryn")

    ```text
    Execution Time: 0.257 ms
    ```

2. Skapa index och "uppdatera Postgres så att index kan väljas"

    ```sh
    docker exec utpost-postgres psql -U admin -d utpost -c "create index tour_logs_tour_id_idx on tour_logs (tour_id)"
    ```

    "CREATE INDEX"

    ```sh
    docker exec utpost-postgres psql -U admin -d utpost -c "analyze tour_logs"
    ```

    "ANALYZE"

3. Skapa en baseline med index:

    ```sh
    docker exec utpost-postgres psql -U admin -d utpost -c "explain analyze select * from tour_logs where tour_id = 70"
    ```

    Se, execution time (hur lång tid Postgres tog på sig att köra "queryn")

    ```text
    Execution Time: 0.058 ms
    ```

0,257 ms mot 0,058 ms är ungefär 4 gånger snabbare. I en tidigare körning blev det 0,319 ms mot 0,041 ms, alltså ungefär 8 gånger. Siffrorna varierar mellan körningar.

#### Index kostar utrymme

Ett index gör läsningar snabbare, men är inte gratis. Det är en "egen struktur" som sparas vid sidan av tabellen.

- Utrymme: indexet tar plats på disk utöver raderna. Vi har inte mätt hur mycket
- Skrivningar: varje ny rad i `tour_logs` måste också in i indexet, så de blir något dyrare

För `tour_logs` är det ändå en bra affär. Tabellen läses oftare än den skrivs, och indexet ligger på en enda heltalskolumn.

### Punkterna som `jsonb` i Postgres

Spara `logs` som en `jsonb`-kolumn på `tours`. En tur blir då en rad, utan ny databas.

Det ger oss ett uppslag per tur, men punkterna är krångligare att indexera och fråga mot, och vi har redan MongoDB i miljön.

### Ett dokument per tur i MongoDB

Det vi valde. En tur läses oftast som en helhet, och dokumentet blir något mindre än raderna (544 kB mot 648 kB för 200 turer).

## Konsekvenser

- Listan på `/turer` kan göras med två frågor (en till MongoDB och en till Postgres för namn och guidetitlar) i stället för upp till 201.
- Vi kör två databaser, och användare och guider måste hämtas från Postgres.
- Under migreringen finns turerna på två ställen och måste hållas lika.
- En tur har en gräns på 5 000 punkter innan den måste delas upp.
- `/api/tours` hämtar fortfarande bara 50 turer, om vi inte ändrar det.

## Test

Observera att testet idag är missvisande, då `mongo-smoke.js` endast mäter en tur, medan de seedade Postgres-turerna innehåller all data, vilket väger mycket tyngre.

Vi kan iterera över turerna med `mongo-smoke.js` för att simulera och likställa MongoDB med Postgres:

### Alla turer i MongoDB

#### In

```sh
for id in $(seq 1 200); do npm run -s mongo:smoke --workspace=api -- $id | head -2; done
```

Därefter mäts samlingen:

```sh
docker exec utpost-mongo mongosh -u admin -p password --authenticationDatabase admin utpost --quiet --eval 'print((db.tours.totalSize() / 1024).toFixed(0) + " kB")'
```

#### Ut

```text
544 kB
```

*Närmast Postgres, då detta räknar med alla relationer.*

### Postgres

#### In

```sh
docker exec utpost-postgres psql -U admin -d utpost -t -A -c "select pg_size_pretty(pg_total_relation_size('tours') + pg_total_relation_size('tour_logs'))"
```

#### Ut

```text
648 kB
```

`tour_logs` använder 576 kB för 5857 rader (antalet kommer från `seed.js`).

Det blir ungefär 100 byte per rad.

### MongoDB

#### In

```sh
npm run -s mongo:smoke --workspace=api -- 70 | head -2
```

#### Ut

```text
Postgres: 1 rad i tours + 39 rader i tour_logs
MongoDB:  1 dokument, 3.4 kB
```

Tur 70 har 39 punkter och blir ett dokument på 3,4 kB. Det blir ungefär 90 byte per punkt (3512 byte / 39 punkter).

### API

API:et måste köra, till exempel med `npm run dev:api`.

#### In

```sh
curl -s -o /dev/null -w "%{size_download}\n" localhost:4000/api/tours | awk '{printf "%.0f kB\n", $1/1024}'
```

#### Ut

278 kB

*Svaret gäller de 50 senaste turerna (`limit 50`), med punkter, bilder, användare och guide.*

### Slutsats

För samma 200 turer sparar MongoDB ungefär 16 % utrymme.

#### Postgres

`tours` + `tour_logs`, inklusive index: 648 kB.

#### MongoDB

`tours` i form av en samling ("collection"), inklusive index: 544 kB.

#### Att ha i åtanke

- Siffrorna kommer från seedad data med 20 till 39 punkter per tur. En riktig tur har ungefär 300 punkter, enligt kommentaren i `schema.js`
- Bilder (`photos`) ingår inte, varken i Postgres eller i MongoDB
- `/api/tours` hämtar bara de 50 senaste turerna (`limit 50`)
- Skillnaden på 16 % är liten. Den största vinsten är färre uppslag, inte mindre utrymme
- Att välja MongoDB kan anses ceremoniellt i sammanhanget
