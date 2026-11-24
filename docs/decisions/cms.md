---
title: "CMS"
description: "Beslut om vilket innehåll som bor i Contentful, vad som ligger kvar i databasen och varför Contentful räcker för Utpost. Del av M9-momentet."
created: "2026-11-24"
published_date: "-"
last_modified_date: "2026-11-24"
version: "1"
---

## Beslut

Notiserna och guidernas text bor i Contentful. Resten av guiden ligger kvar i Postgres, och API:et sätter ihop delarna när en besökare öppnar sidan.

Contentful är ett CMS (Content Management System), alltså ett system där redaktionen skriver innehållet. Det är headless, vilket betyder att det lagrar innehållet och lämnar ut det som data utan en egen webbplats.

## Bakgrund

Guidernas text låg som HTML i kolumnen `body_html`. Redaktionen ändrade den med `PUT /api/guides/:id`, och API:et sparade HTML-strängen som den var. Kommentaren i [`schema.js`](../../api/src/db/schema.js) säger det rakt ut: "Redaktionen skickar in HTML som vi klistrar in här."

## Innehållsmodellen

Vi lagrar texten som rich text. Det är text med struktur, till exempel stycken, rubriker och fet stil, som data i stället för HTML. Klienten bestämmer hur den ser ut.

En post är en enskild notis eller guide i Contentful.

En slug är den del av adressen som namnger en guide, till exempel `norra-leden-7`.

### Notis

- `rubrik`: namnet på notisen, högst 80 tecken
- `text`: rich text med fet, kursiv och länkar. Inget annat är tillåtet, så redaktören kan inte förstöra layouten
- `niva`: redaktören väljer `info` eller `varning`. Färgen bestämmer klienten
- `guideSlug`: guidens slug, om notisen gäller en guide. Kopplingen till guiden bryts när testdata skapas på nytt i stagingmiljön, eftersom guiden då får en ny slug

### Guide

- `guideId`: guidens id i Postgres. API:et hittar rätt post med det, och en slug går inte att använda eftersom den slumpas i testdata
- `rubrik`: guidens namn. Det finns bara så att redaktören ser vilken guide posten gäller, och appen läser det inte
- `text`: rich text med rubriker (nivå 2 och 3), listor, fet, kursiv och länkar

Titel, region, svårighetsgrad, längd, bild och `published` stannar i Postgres. Appen söker, sorterar och kopplar turer på dem, så de måste finnas som data i databasen.

## Alternativ

Vi valde Contentful, som kursen valde. TODO: det bortvalda alternativet och hur det skiljer sig från Contentful.

- Redigering: redaktören skriver i Contentfuls webbapp, där valideringar stoppar ogiltigt innehåll
- Utkast: en post är utkast, ändrad, publicerad eller arkiverad. Delivery-nyckeln läser bara det publicerade och preview-nyckeln läser allt, så besökarna får inga utkast
- Kostnad: gratisnivån tillåter 100 000 anrop i månaden och sju skrivningar i sekunden. Den lagrar i USA och är till för test och lärande

## Motivering

TODO: varför Contentful räcker för Utpost, knutet till vem som redigerar och hur ofta.

## Vad som hade fått oss att byta

- Taket på 100 000 anrop i månaden. Med en hämtning i minuten per innehållstyp blir det som mest ungefär 86 000 anrop i månaden (en uppskattning), och nås taket pausas läsningen till nästa månad
- Villkoren. Gratisnivån är inte till för kommersiellt bruk, och villkoren kan ändras. TODO: länk till källan för siffrorna och villkoren

## Konsekvenser

### När Contentful inte svarar

- Guidesidan visar titel, region, svårighetsgrad och längd, och i stället för texten står "Guidens text går inte att visa just nu"
- Startsidan visas utan notiser och utan utdrag på guidekorten
- API-loggen får en rad som börjar med `cms: kunde inte hämta`
- Har API:et hämtat innehåll tidigare visar det det gamla i stället för ingenting

### Publicering

För att spara anrop kommer API:et ihåg svaret från Contentful i en cache (ett tillfälligt minne) i en minut. Contentful kan också skicka en webhook, alltså ett anrop till API:et varje gång något publiceras. Då töms cachen direkt.

- Utan webhook syns en publicering efter upp till en minut (`CMS_CACHE_SECONDS`)
- Med webhook syns den vid nästa omladdning, men Contentful kan ge den gamla versionen i några sekunder

### Migrering och byte

- Migreringen gör ungefär 125 anrop (tre per guide och några för innehållstypen) med 200 millisekunder emellan. Svarar Contentful med HTTP-statuskod 429 väntar skriptet så länge `X-Contentful-RateLimit-Reset` säger och försöker igen
- En guide som inte är publicerad i databasen blir ett utkast i Contentful, så redaktören kan förbereda den
- Delivery-nyckeln och preview-nyckeln ligger som hemligheter på servern. Management-token, som kan skriva, ligger bara i `.env` på en dator
- Byter vi CMS skriver vi om `api/src/cms/contentful.js` och skripten i `scripts/`. Schemat och klienten ändras inte
