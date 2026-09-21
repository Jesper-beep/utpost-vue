# Tekniska problem

Tabellen är ett kort index. Detaljerna finns längre ner.

## Allvar

### Hög

Kan leda till dataläckor, avbrott eller fel data.

### Medel

Bromsar varje ändring.

### Låg

Stör, men kostar lite att hantera.

| # | Problem | Plats | Allvar |
|---|---------|-------|--------|
| 1 | En person kan lura sökningen att visa mer än den ska | `api/src/routes/guides.js:24` | Hög |
| 2 | Lösenord sparas så att de går att läsa | `api/src/routes/auth.js:22` | Hög |
| 3 | Databasens lösenord och inloggningsnyckel ligger i projektet | `api/src/config.js:2-7` | Hög |
| 4 | Servern skickar med lösenordet | `api/src/routes/auth.js:20-23` | Hög |
| 5 | Vem som helst kan ändra guider | `api/src/routes/guides.js:35-42` | Hög |
| 6 | Vem som helst kan radera andras turer | `api/src/routes/tours.js:46-50` | Hög |
| 7 | Vem som helst kan läsa användarnas turer och mätningar | `api/src/routes/tours.js:7-34` | Hög |
| 8 | En guide kan innehålla kod som körs hos besökaren | `web/src/pages/GuideDetail.jsx:19-21` | Hög |
| 9 | En person kan skicka in en bildstorlek som slår ut servern | `api/src/routes/photos.js:35-45` | Hög |
| 10 | Sidan kan fastna utan att berätta att något gick fel | `api/src/index.js:25-29` | Hög |

## 1. En person kan lura sökningen att visa mer än den ska

### Vad

Det som en person skriver i sökrutan klistras direkt in i sökningen.

### Var

`api/src/routes/guides.js:22-27`, framför allt rad 24, kolumn 15.

```javascript
guidesRouter.get('/search', async (req, res) => {
  const q = req.query.q || '';
  const sql = `select * from guides where title ilike '%${q}%' or region ilike '%${q}%'`;
  const result = await pool.query(sql);
  res.json(result.rows);
});
```

### Varför

En person kan skriva in särskilda tecken i stället för vanlig söktext. Då kan sökningen visa guider som inte skulle ha visats.

### Allvar

Hög

---

## 2. Lösenord sparas så att de går att läsa

### Vad

Lösenord sparas med texten `plaintext:` framför. Det betyder att lösenordet går att läsa direkt i databasen.

### Var

`api/src/routes/auth.js:18-23`, rad 22, kolumn 22.

```javascript
const result = await pool.query(
  'insert into users (email, password_hash, display_name) values ($1,$2,$3) returning *',
  [email, `plaintext:${password}`, displayName],
);
```

### Varför

Om någon får tag i databasen kan personen se användarnas lösenord direkt. Många använder samma lösenord på flera ställen.

### Allvar

Hög

---

## 3. Databasens lösenord och inloggningsnyckel ligger i projektet

### Vad

Databasens lösenord och nyckeln som används för att kontrollera inloggningar ligger direkt i projektet.

### Var

`api/src/config.js:3:3-4:3`.

```javascript
export const config = {
  databaseUrl: 'postgres://utpost:utpost@localhost:5433/utpost',
  jwtSecret: 'utpost-super-secret-2021',
  port: 4000,
  uploadDir: './uploads',
};
```

### Varför

Alla som får tag i koden kan försöka ansluta till databasen eller skapa en falsk inloggning.

### Allvar

Hög

---

## 4. Servern skickar med lösenordet

### Vad

Servern skickar tillbaka hela användarens post, även fältet som innehåller lösenordsuppgiften.

### Var

`api/src/routes/auth.js:20-23`, rad 20 och 23, samt `api/src/routes/tours.js:9`.

```javascript
const result = await pool.query(
  'insert into users (email, password_hash, display_name) values ($1,$2,$3) returning *',
  [email, `plaintext:${password}`, displayName],
);
res.json({ token: sign(result.rows[0]), user: result.rows[0] });
```

### Varför

Webbsidan behöver inte få den uppgiften. Om någon ser svaret får den personen information som aldrig skulle ha skickats ut.

### Allvar

Hög

---

## 5. Vem som helst kan ändra guider

### Vad

Ändringen av en guide kräver inte att personen har loggat in.

### Var

`api/src/routes/guides.js:35:1-42:3`.

```javascript
guidesRouter.put('/:id', async (req, res) => {
  const { title, region, difficulty, lengthKm, bodyHtml, published } = req.body;
  const result = await pool.query(
    `update guides set title=$1, region=$2, difficulty=$3, length_km=$4, body_html=$5,
     published=$6, updated_at=now() where id=$7 returning *`,
    [title, region, difficulty, lengthKm, bodyHtml, published, req.params.id],
  );
```

### Varför

En utomstående kan ändra text, bilder och om guiden ska synas. Det kan förstöra innehåll eller användas för att lägga in skadlig text.

### Allvar

Hög

---

## 6. Vem som helst kan radera andras turer

### Vad

En tur kan raderas utan inloggning och utan att kontrollera vem som äger den.

### Var

`api/src/routes/tours.js:46:1-50:3`.

```javascript
toursRouter.delete('/:id', async (req, res) => {
  await pool.query('delete from tour_logs where tour_id = $1', [req.params.id]);
  await pool.query('delete from tours where id = $1', [req.params.id]);
  res.json({ ok: true });
});
```

### Varför

Vem som helst som känner till ett tur-nummer kan ta bort någon annans tur och dess mätningar.

### Allvar

Hög

---

## 7. Vem som helst kan läsa användarnas turer och mätningar

### Vad

Turer, bilder och mätningar hämtas utan att personen behöver logga in.

### Var

`api/src/routes/tours.js:7:1-21:3`, och `api/src/routes/photos.js:59:1-62:3`.

```javascript
toursRouter.get('/', async (req, res) => {
  const tours = await pool.query('select * from tours order by started_at desc limit 50');
```

### Varför

Det kan visa namn, e-post, plats, puls och bilder för vem som helst. Sådant ska bara visas för rätt person.

### Allvar

Hög

---

## 8. En guide kan innehålla kod som körs hos besökaren

### Vad

Text från en guide läggs direkt in på webbsidan utan att först kontrolleras.

### Var

`web/src/pages/GuideDetail.jsx:19-21`, rad 20, kolumn 12. Samma sak finns i `web/src/components/GuideCard.jsx:8-10`.

```javascript
<div dangerouslySetInnerHTML={{ __html: guide.body_html }} />
```

### Varför

Om någon lägger in skadlig kod i en guide körs den hos alla som öppnar guiden. Den kan till exempel stjäla en aktiv inloggning.

### Allvar

Hög

---

## 9. En person kan skicka in en bildstorlek som slår ut servern

### Vad

Servern använder bildens bredd och höjd utan att kontrollera om de är rimliga.

### Var

`api/src/routes/photos.js:35:1-45:3`, framför allt rad 39, kolumn 18.

```javascript
const { tourId, filename, width, height } = req.body;
const pixels = new Uint8Array(width * height * 4).fill(128);
```

### Varför

En enda mycket stor bildstorlek kan använda upp nästan allt minne och göra tjänsten långsam eller få den att sluta fungera.

### Allvar

Hög

---

## 10. Sidan kan fastna utan att berätta att något gick fel

### Vad

Fel skrivs bara i serverns logg. Personen som väntar på svar får inget tydligt felmeddelande.

### Var

`api/src/index.js:25:1-29:3`, framför allt rad 27-29.

```javascript
process.on('unhandledRejection', (err) => {
  console.error('Ohanterat fel:', err.message);
});
```

### Varför

Sidan kan bli stående och vänta. Det blir svårt för både användaren och den som sköter tjänsten att förstå vad som gick fel.

### Allvar

Hög

---

## Övrigt

Följande problem är mindre allvarliga än de tio ovan och kan tas efter dem:

- Startsidan behöver hämta fem olika saker innan allt är klart: `web/src/pages/Home.jsx:13-17`.
- Formulär kan skicka tomma eller felaktiga uppgifter, och servern säger inte alltid tydligt vad som blev fel: `api/src/routes/auth.js:17-23`, `api/src/routes/tours.js:37-44` och `api/src/routes/photos.js:35-53`.
- Guider som inte ska synas kan ändå öppnas: `api/src/routes/guides.js:6-8` och `api/src/routes/guides.js:29-33`.
- Om något går fel får besökaren inte alltid veta det: `web/src/api.js:3-14`.
- Profilsidan hämtar alla turer innan den visar användarens egna: `web/src/pages/Profile.jsx:8-11`.
- När sidan med turer öppnas hämtar servern först 50 turer. Sedan hämtar den ägaren, guiden, bilderna och mätningarna en tur i taget. Det kan bli över 200 separata frågor innan sidan visas: `api/src/routes/tours.js:7-21`.
- En inloggning ligger kvar länge i webbläsaren: `api/src/lib/auth.js:4-5` och `web/src/pages/Login.jsx:17-19`.
- Det går inte att skapa ett konto från webbsidan, trots att servern har stöd för det: `api/src/routes/auth.js:18` och `web/src/App.jsx`.
- Om någon söker efter till exempel `berg&dal` delas texten upp och bara en del används. Om sökningen innehåller `#` kommer resten inte ens fram till servern. Sökningen kan därför ge fel resultat för helt vanliga sökord: `web/src/pages/Guides.jsx:14-17`.
- Ett verktyg för att arbeta med databasen finns installerat, men används inte: `api/package.json` och `api/src/db/client.js`.
- Vilken annan webbplats som helst kan försöka prata med servern: `api/src/index.js:10`.
- Servern accepterar meddelanden som är upp till 50 MB stora: `api/src/index.js:11`.
- Om en tur, guide eller bild tas bort kan hänvisningar till den gamla posten ligga kvar: `api/src/db/migrate.js:6-54`.
