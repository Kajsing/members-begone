# Teknisk dokumentation

## Arkitektur

Udvidelsen er en dependency-fri Manifest V3-udvidelse.

- `manifest.json` begrænser content scriptet til `youtube.com`.
- `src/detector.js` indeholder ren, testbar badge- og kortdetektion.
- `src/content.js` indlæser indstillinger, observerer DOM’en og markerer fundne kort.
- `src/content.css` håndterer både skjul og pladsholder uden inline styles.
- `src/popup.*` er brugerfladen til aktivering, visningstilstand og manuel rescan.
- `tests/detector.test.js` dækker sprog-fallbacks, strukturelle signaler og valg af kort-wrapper.
- `scripts/validate-manifest.mjs` kontrollerer manifest, filreferencer, URL-scope og dynamisk kodekørsel.

Der bruges ingen service worker. YouTube-content scriptet kan selv håndtere hele livscyklussen, og den ekstra baggrundsproces ville derfor kun øge kompleksiteten.

## Detektionsstrategi

Detektoren prioriterer markører som `BADGE_STYLE_TYPE_MEMBERS_ONLY` og klasser, der indeholder `members-only`. Det er den mest robuste og sproguafhængige vej.

Som fallback genkendes den eksakte badge-tekst på en lille liste over YouTube-badgecontainere. Matchene er forankret til hele teksten, så en normal videotitel som “My members only Q&A is public now” ikke bliver skjult.

Når et badge findes, vælges `ytd-rich-item-renderer` før et indre lockup-element. Det er vigtigt, fordi det er rich-item-wrapperen, som ejer YouTubes grid-slot; skjules kun barnet, står der et tomt hul.

## Dynamiske sider

YouTube er en SPA. Et `MutationObserver` behandler tilføjede eller ændrede deltræer, mens `yt-navigate-finish` og `yt-page-data-updated` udløser en fuld kontrol efter intern navigation. Arbejdet samles via `requestIdleCallback`, så feed-rendering ikke blokeres.

Markerede kort valideres igen. Hvis YouTube genbruger et DOM-element til en normal video, bliver markøren fjernet.

## Indstillinger

Kun disse værdier gemmes i `chrome.storage.sync`:

- `enabled`: boolean, standard `true`.
- `mode`: `hide` eller `placeholder`, standard `hide`.

## Vedligeholdelse

Hvis YouTube ændrer markup:

1. Inspicér medlemsbadgets tag, klasse, `aria-label` og `badge-style-type`.
2. Tilføj den smalleste stabile markør i `STRONG_SIGNAL_SELECTOR` eller badgecontaineren i `BADGE_CONTAINER_SELECTOR`.
3. Tilføj en test, der reproducerer den nye struktur.
4. Kør `npm run verify`.
5. Smoke-test både forsiden og søgeresultater med udvidelsen slået til og fra.

## Kendte begrænsninger

- YouTube kan ændre interne elementnavne uden varsel.
- Tekst-fallbacken dækker de mest almindelige sprog, men den strukturelle markør er nødvendig for ukendte oversættelser.
- Allerede åbne YouTube-faner skal genindlæses første gang en upakket udvidelse installeres.

## Beslutninger og afvigelser

- Standardtilstanden er fuld fjernelse, fordi det er den ønskede adfærd; pladsholder er et valgfrit fallback.
- Ingen screenshots eller oplysninger fra brugerens personlige feed er gemt i projektet.
- Der er ikke indført backend, analytics eller eksterne runtime-afhængigheder.

## Verifikationsstatus 2026-08-20

- Manifestkontrol: bestået; 8 refererede filer og det begrænsede YouTube-scope er kontrolleret.
- JavaScript-syntaks: bestået for alle `.js`- og `.mjs`-filer.
- Enhedstests: 8/8 bestået.
- Popup: visuelt kontrolleret ved 330 px bredde uden vandret overflow; standardtilstand og kontroller vises korrekt.
- Live YouTube-negativtest: fire ekstra feed-sektioner blev indlæst uden medlemskort, og ingen almindelige videokort matchede.
- En positiv live-test med den installerede udvidelse afventer et faktisk `Members only`-kort i feedet.
- Browserinstallation: brugerens skærmbillede bekræfter, at version `0.1.0` er installeret og aktiv i Chrome.
- Git: den validerede version publiceres på `main` i det offentlige repo `Kajsing/members-begone`.
