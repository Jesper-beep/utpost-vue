---
title: "CMS"
description: "Beslut om vilket innehåll som bor i Contentful, vad som ligger kvar i databasen och vilka alternativ vi valde bort. Del av M9-momentet."
created: "2026-11-24"
published_date: "-"
last_modified_date: "2026-11-24"
version: "1"
---

## Beslut

Notiserna (meddelanden från redaktionen till besökarna) och guidernas text bor i Contentful. Resten av guiden ligger kvar i Postgres, och API:et (programmet som klienten hämtar data från) sätter ihop delarna när en besökare öppnar sidan.

Contentful är ett CMS (Content Management System), alltså ett system där redaktionen skriver innehållet. Det är dessutom headless: tjänsten lagrar innehållet och lämnar ut det som data, utan någon egen webbplats, så det är vår app som bestämmer hur innehållet ser ut.

## Bakgrund

Guidernas text låg som HTML i kolumnen `body_html`. Redaktionen ändrade texten med `PUT /api/guides/:id`, och API:et sparade HTML-strängen precis som den kom in. Klienten fick strängen med i svaret från API:et och tog bort alla taggar, så rubriker, listor och kursiv text gick förlorade.

## Innehållsmodellen

Vi lagrar texten som formaterad text (rich text). Det är text med struktur, till exempel stycken, rubriker och fet stil, som data i stället för HTML. Klienten bestämmer hur texten ser ut.

En post är en enskild notis eller guide i Contentful.

En slug är den del av adressen som namnger en guide, till exempel `norra-leden-7`.

### Notis

- `rubrik`: namnet på notisen, högst 80 tecken
- `text`: formaterad text med fet, kursiv och länkar. Inget annat är tillåtet, så redaktören kan inte förstöra layouten
- `niva`: redaktören väljer `info` eller `varning`. Färgen bestämmer klienten
- `guideSlug`: guidens slug, om notisen gäller en guide. Kopplingen till guiden bryts när testdata skapas på nytt i stagingmiljön, eftersom guiden då får en ny slug

### Guide

- `guideId`: guidens id i Postgres. API:et hittar rätt post med det, och en slug går inte att använda eftersom den slumpas i testdata
- `rubrik`: guidens namn. Det finns bara så att redaktören ser vilken guide posten gäller, och appen läser det inte
- `text`: formaterad text med rubriker (nivå 2 och 3), listor, fet, kursiv och länkar

Titel, region, svårighetsgrad, längd, bild och `published` stannar i Postgres. Appen söker, sorterar och kopplar turer på dem, så de måste finnas som data i databasen.

## CMS:er vi tittade på

### Valt

- [Contentful](https://www.contentful.com/): CMS:et som ingår i kursen

### Bortvalda

- [Astro](https://astro.build/): kan bygga HTML-sidor av markdownfiler
- [Eleventy](https://www.11ty.dev/): kan bygga HTML-sidor av markdownfiler
- [WordPress](https://wordpress.org/): ett CMS med egen webbplats och eget administratörsgränssnitt

Vi övervägde också att bygga ett eget CMS och att klara oss helt utan.

## Alternativ

Kursen valde Contentful åt oss. Varför det inte var vårt val står under [Motivering](#motivering).

### Så fungerar Contentful hos oss

#### Redigering

Redaktören skriver i Contentfuls webbapp. Fälten har regler som redaktören inte kan bryta, till exempel högst 80 tecken i rubriken på en notis.

#### Utkast

En post är utkast, ändrad, publicerad eller arkiverad. Besökarna ser inga utkast, eftersom API:et läser publicerat innehåll med en särskild nyckel (se [Nycklar](#nycklar)).

#### Kostnad

Gratisnivån tillåter 100 000 anrop i månaden. Den lagrar innehållet i USA och är enligt Contentful bara till för att testa och lära sig.

### Astro och Eleventy

Astro och Eleventy kan bygga HTML-sidor av markdownfiler. Markdown är vanlig text där enkla tecken, till exempel `#` och `-`, blir rubriker och listor.

- Vi hade behövt bygga om webbplatsen med något av dem
- Markdown passar inte alla redaktörer

#### Astro

Astro verkar intressant, men det är nytt för oss.

#### Eleventy

Enligt vår uppfattning är Eleventy nischat, och den som ska använda det behöver vara utvecklare. Sedan version 3 bygger det dessutom bara statiska sidor, så det är svårt att publicera notiser och annat innehåll som ändras ofta.

### WordPress

WordPress är ett CMS med en egen webbplats och ett eget administratörsgränssnitt, byggt i PHP med en MySQL-databas. Funktioner utöver grunden läggs till med tillägg (plugins), alltså program från tredje part. Vi valde bort det av tre skäl:

- Det mesta vi behöver finns inte färdigt, så varje egen funktion kräver ett tillägg
- Varje tillägg måste uppdateras hela tiden och testas mot de andra, så underhållet växer med varje funktion
- Lösningen blir mycket specialbygge och snabbt inaktuell

### Ett eget CMS

Vi kunde ha byggt ett enkelt CMS själva.

- Vi hade inte tid att bygga det
- Det var oklart vem som skulle behöva och använda det

### Inget CMS

Utpost är en ganska liten webbplats med mest redaktionellt innehåll, så appen hade kunnat klara sig utan CMS. Användarna laddar redan upp sina egna turer och foton. Redaktörer och administratörer hade kunnat få fler behörigheter eller egna sidor i appen.

Vi valde bort det eftersom vi inte hade tid att bygga de sidorna.

## Motivering

Vi använder Contentful bara för att kursens uppgift krävde det. Enligt oss är Contentful mer än Utpost behöver, nästan för mycket för en så liten app. Med mer tid, eller med andra regler i kursen, hade vi hellre lagt arbetet på att göra Utpost komplett, med fler endpoints (adresser i API:et som tar emot anrop) och mer funktionalitet i appen.

## Vad som hade fått oss att byta

### Taket

En hämtning i minuten per innehållstyp ger ungefär 86 000 anrop i månaden (en uppskattning), före förhandsgranskningar och webhooks. Nås gränsen på 100 000 pausas läsningen till nästa månad. Siffrorna står på [Contentfuls prissida](https://www.contentful.com/pricing/) och under [Usage limits](https://www.contentful.com/help/admin/usage/usage-limit/).

### Villkoren

Enligt [Usage limits](https://www.contentful.com/help/admin/usage/usage-limit/) får gratisnivån bara användas för att testa och lära sig om Contentful, inte för kommersiellt bruk. Contentful kan också ändra villkoren.

## Konsekvenser

### När Contentful inte svarar

- Guidesidan visar titel, region, svårighetsgrad och längd, och i stället för texten står "Guidens text går inte att visa just nu"
- Startsidan visas utan notiser och utan utdrag på guidekorten
- API-loggen får en rad som börjar med `cms: kunde inte hämta`
- Har API:et hämtat innehåll tidigare visar det gamla innehållet i stället för ingenting

### Publicering

För att spara anrop kommer API:et ihåg svaret från Contentful i en cache (ett tillfälligt minne) i en minut. Contentful kan också skicka en webhook, alltså ett anrop till API:et varje gång något publiceras. Då töms cachen direkt.

- Utan webhook syns en publicering efter upp till en minut (`CMS_CACHE_SECONDS`)
- Med webhook syns den vid nästa omladdning, men Contentful kan ge den gamla versionen i några sekunder

### Migrering

Migreringen flyttar guidernas text från Postgres till Contentful. Skriptet `scripts/cms-migrate-guides.mjs` skapar först innehållstypen Guide (mallen för en guides fält). Sedan läser det alla guider i databasen, gör om varje guides HTML till formaterad text och sparar texten som en post i Contentful. Du kan köra skriptet flera gånger utan att få dubbletter, eftersom varje guide alltid får samma id i Contentful, till exempel `utpost-guide-7`. En ny körning uppdaterar alltså guiden som redan finns.

- Skriptet gör ungefär 125 anrop till Contentful, högst tre per guide (läsa, spara och publicera) och några få för guidens fält. Det väntar 200 millisekunder mellan varje anrop, eftersom Contentful tillåter sju anrop i sekunden
- Svarar Contentful med HTTP-statuskod 429 har skriptet gjort för många anrop. Det väntar då lika länge som Contentful ber om, försöker igen och ger upp efter fem försök
- En guide som inte är publicerad i databasen blir ett utkast i Contentful, så att redaktören kan förbereda den. Tills den publiceras står det "Guidens text går inte att visa just nu" på guidesidan

### Nycklar

API:et använder två nycklar för att läsa från Contentful. Delivery-nyckeln ger bara publicerat innehåll, och preview-nyckeln ger även utkast. En tredje nyckel, management-token, kan skriva till Contentful. Bara skripten i `scripts/` behöver den. Alla tre är hemligheter, alltså värden som aldrig får stå i koden.

- Delivery-nyckeln och preview-nyckeln ligger som hemligheter i stagingmiljön
- Management-token ligger bara i `.env` på en utvecklares dator, eftersom API:et aldrig skriver till Contentful

### Byte av CMS

Skulle vi byta CMS skriver vi om `api/src/cms/contentful.js` och skripten i `scripts/`. Klienten och API:ets GraphQL-schema behöver inte ändras. GraphQL är ett frågespråk för API:er, och schemat beskriver vad klienten kan fråga om.
