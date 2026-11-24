---
title: "CMS"
description: "Beslut om vilket innehåll som bor i Contentful, vad som ligger kvar i databasen och vilka alternativ vi valde bort. Del av M9-momentet."
created: "2026-11-24"
published_date: "-"
last_modified_date: "2026-11-24"
version: "1"
---

## Beslut

Notiserna och guidernas text bor i Contentful. Resten av guiden ligger kvar i Postgres, och API:et (programmet som klienten hämtar data från) sätter ihop delarna när en besökare öppnar sidan.

Contentful är ett CMS (Content Management System), alltså ett system där redaktionen skriver innehållet. Contentful är dessutom headless. Det betyder att tjänsten lagrar innehållet och lämnar ut det som data, utan någon egen webbplats, så det är vår app som bestämmer hur innehållet ser ut.

## Bakgrund

Guidernas text låg som HTML i kolumnen `body_html`. Redaktionen ändrade texten med `PUT /api/guides/:id`, och API:et sparade HTML-strängen precis som den kom in. Klienten fick strängen med i svaret från API:et och tog bort alla taggar, så rubriker, listor och kursiv text gick förlorade.

## Innehållsmodellen

Vi lagrar texten som formaterad text (rich text). Det är text med struktur, till exempel stycken, rubriker och fet stil, som data i stället för HTML. Klienten bestämmer hur den ser ut.

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

## CMS:er vi tittade på

### Valt

- [Contentful](https://www.contentful.com/): CMS:et som ingår i kursen

### Bortvalda

- [Astro](https://astro.build/): bygger HTML-sidor av markdownfiler
- [Eleventy](https://www.11ty.dev/): bygger HTML-sidor av markdownfiler
- [WordPress](https://wordpress.org/): ett CMS med egen webbplats och eget administratörsgränssnitt

Vi övervägde också att bygga ett eget CMS och att klara oss helt utan.

## Alternativ

Kursen valde Contentful åt oss. Varför det inte var vårt val står under [Motivering](#motivering).

Så här fungerar Contentful hos oss:

- Redigering: redaktören skriver i Contentfuls webbapp, där valideringar stoppar ogiltigt innehåll
- Utkast: en post är utkast, ändrad, publicerad eller arkiverad. Delivery-nyckeln läser bara det publicerade och preview-nyckeln läser allt, så besökarna får inga utkast
- Kostnad: gratisnivån tillåter 100 000 anrop i månaden och sju anrop i sekunden. Den lagrar i USA och är till för test och lärande

### Astro och Eleventy

Astro och Eleventy bygger HTML-sidor av markdownfiler. Markdown är vanlig text där enkla tecken, till exempel `#` och `-`, blir rubriker och listor.

- Vi hade behövt bygga om webbplatsen med något av dem
- Markdown passar inte alla redaktörer

#### Astro

Astro verkar intressant, men det är nytt för oss.

#### Eleventy

Enligt vår uppfattning är Eleventy nischat, och den som ska använda det behöver nästan säkert vara utvecklare. Sedan version 3 bygger det dessutom bara statiska sidor, så det är svårt att publicera notiser och annat innehåll som ändras ofta.

### WordPress

WordPress är ett CMS med en egen webbplats och ett eget administratörsgränssnitt, byggt i PHP med en MySQL-databas. Funktioner utöver grunden läggs till med tillägg (plugins), alltså program från tredje part. Vi valde bort det av tre skäl:

- Det mesta vi behöver finns inte färdigt, så varje egen funktion kräver ett tillägg
- Varje tillägg måste uppdateras hela tiden och testas mot de andra, så underhållet växer med varje funktion
- Lösningen blir mycket specialbygge och blir snabbt inaktuell

### Ett eget CMS

Vi kunde ha byggt ett enkelt CMS själva.

- Vi hade inte tid att bygga det
- Det var oklart vem som skulle behöva och använda det

### Inget CMS

Utpost är en ganska liten webbplats med mest redaktionellt innehåll, så appen hade kunnat klara sig utan CMS. Användarna laddar redan upp sina egna turer och foton. Redaktörer och administratörer hade kunnat få fler behörigheter eller egna sidor i appen.

Vi valde bort det eftersom vi inte hade tid.

## Motivering

Contentful är inte vårt val. Så långt vi kan se var det kursen som bestämde det. Med mer tid, eller med andra regler i kursen, hade vi hellre lagt arbetet på att göra Utpost komplett, med fler endpoints (adresser i API:et som tar emot anrop) och mer funktionalitet i appen.

## Vad som hade fått oss att byta

- Taket på 100 000 anrop i månaden. Med en hämtning i minuten per innehållstyp blir det ungefär 86 000 anrop i månaden, och förhandsgranskningar och webhooks kommer ovanpå (en uppskattning). Nås taket pausas läsningen till nästa månad
- Villkoren. Gratisnivån är inte till för kommersiellt bruk, och villkoren kan ändras. Siffrorna står på [Contentfuls prissida](https://www.contentful.com/pricing/) och under [Usage limits](https://www.contentful.com/help/admin/usage/usage-limit/)

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
- En guide som inte är publicerad i databasen blir ett utkast i Contentful, så redaktören kan förbereda den. Tills den publiceras står "Guidens text går inte att visa just nu" på guidesidan
- Delivery-nyckeln och preview-nyckeln ligger som hemligheter på servern. Management-token, som kan skriva, ligger bara i `.env` på en dator
- Byter vi CMS skriver vi om `api/src/cms/contentful.js` och skripten i `scripts/`. Schemat och klienten ändras inte
