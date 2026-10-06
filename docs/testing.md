---
title: "Teststrategi"
description: "Teststrategi för Team 6 i kursen Avancerad frontend-utveckling. Del av M2-momentet."
created: "2026-10-06"
published_date: "2026-10-06"
last_modified_date: "2026-10-06"
version: 1
---

Utöver rena "funktionstester" som kontrollerar komponenter, datahämtningar (fetch) och liknande, vill vi även testa sådant som vi tror att många missar, exempelvis: har varje sida en titel och är den unik? Hygienfaktorer med andra ord.

I dagsläget skrapar vi endast på ytan, men kommer under projektets gång addera tester med exempelvis "mock API" samt testa säkerheten kring inloggat läge.

## Så testar du

Klientens tester ligger i `client/tests` och API:ets tester i `api/tests`. Kör följande nervkittlande kommando från roten av projektet för att testa båda:

```sh
npm run test
```

## Typ av tester eller "nivåer" samt beslut

Vi testar klienten och API:et med Vitest på nivåerna enhet, struktur och regression. Vi har inga krav på täckning och mockar API:et när vi skriver de testerna. Kritiska delar prioriteras med sunt förnuft.

### Enhetstester

Just nu testar vi hjälpfunktionerna för turer (`elevationGain` och `distanceKm`) och knappkomponenten `BaseButton`. Varje del testas för sig, utan att resten av appen behövs.

### Regressionstester

Ett regressionstest skrivs när en bugg har hittats och rättats, för att den inte ska komma tillbaka. Det ska misslyckas utan rättningen och lyckas med den. Vårt första gäller skuld 10 i [skulddokumentet](debt.md) och testar att API:et loggar fel som inte hanteras.

### Struktur

Just nu testar vi att routerns länkar och sidtitlar hänger ihop: att varje länk och titel är unik, att länkarna är skrivna på samma sätt och att varje sida får titeln " - Utpost" (även kallat "brand suffix"). Testerna går igenom alla routes, så en ny sida testas automatiskt. Det är våra hygienfaktorer.

### Säkerhet

Planerad, men än så länge har vi inga tester. Vi vill testa säkerheten kring inloggat läge.

## Nuvarande tester

Sökvägarna utgår från `client/tests`, utom under API som utgår från `api/tests`.

### Komponenter

#### `components/BaseButton.test.ts`

Testar knappkomponenten `BaseButton`.

- Visar texten från slotten
- Är en `button` med `type=button` som standard
- Använder `type=submit` när det väljs
- Är `primary` som standard
- Får klassen för vald variant och inte klassen för `primary`
- Är en länk (`a`) när `to` är satt

##### Utdrag från koden

```typescript
it("får klassen för vald variant", () => {
  const wrapper = mount(BaseButton, {
    props: {
      variant: "secondary",
    },
  });
  expect(wrapper.classes()).toContain("button--secondary");
  expect(wrapper.classes()).not.toContain("button--primary");
});
```

### Bibliotek/delade grejer

#### `lib/tours.test.ts`

Testar hjälpfunktionerna för turer i `src/lib/tours`.

`elevationGain`:

- Summerar bara stigningar, inte nedförsbackar
- Ger 0 för en tur utan mätpunkter
- Hoppar över mätpunkter utan höjd i stället för att räkna dem som noll

`distanceKm`:

- Avrundar `distance_m` till km korrekt
- Ger 0 för en tom tur
- Ger 0 för `undefined` och `null`

##### Utdrag från koden

```typescript
it("hoppar över mätpunkter utan höjd i stället för att räkna dem som noll", () => {
  expect(elevationGain([log(100), log(null), log(150)])).toBe(50);
});
```

### Routing

#### `routing/routing.test.ts`

Testar att routerns länkar hänger ihop.

- Varje länk är unik
- Varje namn på en länk är unikt
- Varje länk använder bara gemener och inga mellanrum
- Okända länkar leder till `NotFound`

##### Utdrag från koden

```typescript
it("okända länkar leder till NotFound", async () => {
  await router.push("/my-fingers-into-my-eyes");
  expect(router.currentRoute.value.name).toBe("NotFound");
});
```

#### `routing/titles.test.ts`

Testar sidtitlarna för alla routes.

- Varje sida har en sidtitel
- Varje sidtitel är unik
- Sidtitlar innehåller varken `undefined`, `null` eller onödiga mellanrum
- Varje länk ger en dokumenttitel som slutar på `- Utpost`. Ett testfall skapas per route, så nya sidor testas automatiskt.

##### Utdrag från koden

```typescript
it.each(routes.map((route) => toUrl(route.path)))(
  "%s har ändelsen - Utpost",
  async (url) => {
    document.title = "";
    await router.push(url);
    expect(document.title).toMatch(/ - Utpost$/);
  },
);
```

### API

#### `lib/unhandledRejection.test.ts`

Regressionstest för skuld 10 i [skulddokumentet](debt.md). Testar `handleUnhandledRejection` i `api/src/lib/unhandledRejection.js`.

- Loggar ett ohanterat fel med `console.error`, tillsammans med felmeddelandet

##### Utdrag från koden

```typescript
it("loggar ett ohanterat fel med console.error", () => {
  const logger = { error: vi.fn() };
  handleUnhandledRejection(new Error("databasen svarar inte"), logger);
  expect(logger.error).toHaveBeenCalledWith(
    "Ohanterat fel:",
    "databasen svarar inte",
  );
});
```

## När får en PR mergas?

- Specifik, uppdaterad branch
- Minst en "approver"
- Alla tester gröna

För mer information, se [stegen i pipeline.md](pipeline.md)

## Buggfixar

När vi jobbar med [skulddokumentet](debt.md) eller att vi i gruppen upptäcker en bugg, gör vi enligt följande:

- Ny branch
- Checkar "issue-brädet"
- Följer stegen för en vanlig PR
- Små, uppenbara buggar kan rättas utan större ansträngning

En buggfix kräver inte ett misslyckat test, men: en löst bugg kräver ett lyckat test!

## Vad som (kanske) inte går att testa

Vi är överens i gruppen att vi gärna vill testa sånt som användaren ser och interagerar med, så som tillgänglighet.

Men även sånt som vi utvecklare arbetar med, så som konventioner kring CSS med mera.

Vi har valt att inte sätta en täckningsgrad, eftersom det för oss just nu bara hade varit ett godtyckligt tal.

## Så valde vi (att testa)

Testning är nytt för oss, så vi valde mellan många alternativ, som att testa allt, eller bara välja lite? Vi har börjat smått i alla fall!

Ska vi skapa stora tester? Eller många små? Vill vi testa DOM-en? Superstrikta-tester?

Vi var i alla fall överens om att börja smått - och det har vi gjort!

## Övrigt och allmänt kring tester

Vi i gruppen vill såklart testa så mycket som möjligt, i den utsträckning det är rimligt.

Således har vi inga krav på täckning eller några strikta regler. Exempelvis för typer av test.

Vi låter vårt sunda förnuft och vår nyfikenhet guida oss genom projektet.

Just kring ämnet konsekvenser, och det vi samlat i skulddokumentet har öppnat våra ögon för vad som kan hända om man inte noga kontrollerar kritiska delar, såsom inloggning, filuppladdningar med mera.

I detta delmoment har vi prioriterat "lätta tester", men hoppas kunna fördjupa oss framgent.

En konsekvens, som vi alla är överens om just nu, är att alla dessa verktyg som vi använder skapar merjobb - och kanske rent av tar från kod-tid!
