# Pipeline

## Flöde

```mermaid
flowchart LR
  B[branch + commit] --> PR[pull request]
  PR --> CI[CI på ubuntu, macos, windows]
  CI --> S{gröna?}
  S -->|ja| G{godkänd + uppdaterad mot main?}
  S -->|nej| F[fixa, pusha igen]
  F --> PR
  G -->|ja| M[merge till main]
  G -->|nej| F
```

## Steg och tider

Tid per steg och operativsystem, i sekunder. Fylls i efter en första körning.

### `npm ci`

Fångar package-lock-json  som inte stämmer med package.json.

- Tid på ubuntu: -
- Tid på macos: -
- Tid på windows: -

### `biome ci`

Fångar lintfel, varningar, felformatering, osorterat.

- Tid på ubuntu: -
- Tid på macos: -
- Tid på windows: -

### `npm run lint:md`

Fångar trasig markdown i dokumenten.

- Tid på ubuntu: -
- Tid på macos: -
- Tid på windows: -

### `npm run lint:spelling`

Fångar stavfel i .js, .jsx och .md.

- Tid på ubuntu: -
- Tid på macos: -
- Tid på windows: -

### `npm test`

Fångar att testerna körs (ett röktest än så länge).

- Tid på ubuntu: -
- Tid på macos: -
- Tid på windows: -

### `npm run build`

Fångar fel som bara syns när klienten byggs.

- Tid på ubuntu: -
- Tid på macos: -
- Tid på windows: -

## Regler på main

- PR krävs, minst en godkännare och "gröna checks" från alla tre operativsystemen
- Branchen måste vara uppdaterad mot main innan merge
- Reglerna gäller även admins

## Kommandon

```sh
npm run lint
npm run lint:md
npm run lint:spelling
npm test
npm run build
```
