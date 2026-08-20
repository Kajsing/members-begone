# Members Begone

En lille, privatlivsvenlig Chrome-udvidelse, der fjerner YouTubes `Members only`-videoer fra forsiden, søgeresultater, anbefalinger og sidekolonner.

Udvidelsen låser ikke medlemsindhold op og omgår ikke betaling. Den fjerner kun de videokort, som YouTube viser som reklame/lokkemad i dit feed.

## Funktioner

- Fjerner medlemskort helt som standard, så feedet lukker hullet.
- Kan i stedet vise en neutral pladsholder.
- Reagerer på YouTubes SPA-navigation og dynamisk indlæste kort.
- Bruger YouTubes strukturelle medlemsmarkør først og lokaliseret badge-tekst som fallback.
- Har ingen tracking, netværkskald eller tredjepartsafhængigheder.
- Beder kun om adgang til YouTube, synkroniserede indstillinger og den aktive fane, når popup’en åbnes.

## Installer lokalt

1. Åbn `chrome://extensions` i Chrome.
2. Slå **Udviklertilstand** til.
3. Vælg **Indlæs upakket**.
4. Vælg denne projektmappe.
5. Genindlæs en åben YouTube-fane én gang.

Klik på udvidelsens ikon for at slå filtreringen til/fra eller vælge mellem fuld fjernelse og pladsholdere.

## Udvikling

Projektet kræver ingen installation af npm-pakker. Node.js 20 eller nyere bruges kun til kontroller og tests.

```powershell
npm run verify
```

Efter ændringer åbnes `chrome://extensions`, og der klikkes på genindlæsningsknappen på udvidelsens kort.

## Sådan virker det

`src/detector.js` genkender medlemsbadges og finder det mindste sikre YouTube-renderer-kort. `src/content.js` observerer dynamiske DOM-ændringer og markerer kortene. `src/content.css` skjuler dem eller tegner pladsholderen. Popup’en gemmer kun `enabled` og `mode` i `chrome.storage.sync`.

Se [DOCUMENTATION.md](DOCUMENTATION.md) for arkitektur, vedligeholdelse og kendte begrænsninger.

## Privatliv

Se [PRIVACY.md](PRIVACY.md). Kort fortalt forlader ingen browserdata maskinen via denne udvidelse.
