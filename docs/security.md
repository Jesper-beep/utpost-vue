# Säkerhet

Genomgång av säkerheten i Utpost efter M8. Listan följer OWASP Top 10 (2025).

Minst tre rader ska ha ett fynd, en rättning i en PR och ett test som var rött före rättningen.

Datum: ______

Hotbilden i en mening: ______ (vad är värt att skydda i Utpost, och vem är angriparen?)

## Autentiseringen (M8)

- Lösenord: ______ (hur lagras de, med vilket schema, och var i koden?)
- Token: ______ (vad står i den, hur länge gäller den, var ligger den i klienten och vad händer vid omladdning?)
- Skyddade routes: ______ (vilka anrop kräver token, vilka kräver rollen editor, och var sitter kontrollen?)

## OWASP Top 10 - genomgång

| #   | Risk                                  | Gäller oss? | Fynd (fil och endpoint) | Rättning (PR) | Kontroll (test eller curl) |
| --- | ------------------------------------- | ----------- | ----------------------- | ------------- | -------------------------- |
| A01 | Broken Access Control                 |             |                         |               |                            |
| A02 | Security Misconfiguration             |             |                         |               |                            |
| A03 | Software Supply Chain Failures        |             |                         |               |                            |
| A04 | Cryptographic Failures                |             |                         |               |                            |
| A05 | Injection                             |             |                         |               |                            |
| A06 | Insecure Design                       |             |                         |               |                            |
| A07 | Authentication Failures               |             |                         |               |                            |
| A08 | Software or Data Integrity Failures   |             |                         |               |                            |
| A09 | Security Logging & Alerting Failures  |             |                         |               |                            |
| A10 | Mishandling of Exceptional Conditions |             |                         |               |                            |

## Validering av indata

______ (var sitter valideringen, vilka scheman finns och vad svarar API:et vid ogiltig indata?)

## Headers vi sätter (nginx)

______ (resultatet av `curl -I` mot staging, med CSP och de andra headers för säkerhet)

## Skanning i pipelinen

______ (vilka verktyg körs i jobbet Säkerhet, vad hittar var och en och vad gör jobbet rött?)

## Kända brister (medvetet kvar)

______ (det vi valt att inte laga än, och varför)
