# Beads Designer

Przeglądarkowa pracownia do projektowania wzorów z koralików — z podglądem 3D na żywo.
Inspiracją był edytor wzorów do dzianiny (colorwork), ale tu wszystko kręci się wokół
koralików — od drobnych rocailles i Delica po rurki, tile, bicone i perełki, mieszane w jednym projekcie.

Postęp prac, plan i podjęte decyzje: **[docs/POSTEP.md](docs/POSTEP.md)**.

## Trzy rodzaje projektów

| Tryb | Co projektujesz | Jak wygląda schemat |
| --- | --- | --- |
| **Naszyjnik** | pojedynczy sznurek koralików, np. 300 szt. 11/0 ≈ 42 cm | koraliki ułożone wierszami; trójkąt pokazuje środek naszyjnika |
| **Wężyk** | wężyk szydełkowy z koralikami (bead crochet), 3–16 na obwodzie | rozwinięty wężyk — każdy rząd przesunięty o pół koralika, dokładnie jak w spirali na prawdziwym wężyku |
| **Figurka 3D** | zwierzątko / bryła z koralików, budowana warstwami | jeden poziomy plaster naraz, blade kropki to warstwa poniżej |

Figurkę można zawiesić na naszyjniku: w trybie *Naszyjnik* zaznacz
**„Zawieszka: figurka 3D na środku”**, a podgląd pokaże kurczaczka (albo Twoją figurkę) na środku sznurka.

## Co potrafi

- **Rysowanie**: ołówek, wypełnianie, pipeta (albo prawy przycisk myszy), gumka w figurce, cofnij/ponów.
- **Symetria**: naszyjnik odbija wzór względem środka, figurka — lewo/prawo. Malujesz połowę, druga powstaje sama.
- **Powtórzenia**: „Powiel pierwsze N koralików / rzędów” rozkłada fragment na całą długość.
- **Figurki**: gotowe bryły (kula/jajo, walec, stożek, prostopadłościan), „Wydrąż środek”, kopiowanie warstwy, podgląd „do tej warstwy”, żeby zobaczyć, jak figurka rośnie.
- **Koraliki**: każdy koralik w palecie ma własny kolor, kształt i rozmiar — okrągłe 15/0–6/0, Delica, Treasure, Aiko,
  demi round, kostki, trójkąty, rurki 3–12 mm, krople i magatamy, Tila, bicone, perełki — oraz wykończenie
  (nieprzezroczysty, przezroczysty, matowy, perłowy, metaliczny). Widać je na schemacie i w podglądzie 3D.
- **Zużycie**: liczba koralików każdego rodzaju i przybliżona waga w gramach.
- **Instrukcja**: kolejność nawlekania (naszyjnik, wężyk — od końca) albo warstwy rząd po rzędzie (figurka); można ją skopiować.
- **Moje projekty**: wiele projektów na urządzeniu, z miniaturkami; otwórz, duplikuj, usuń. Projekt zapisuje się sam
  (także w chwili zamknięcia aplikacji). „Eksportuj wszystkie” zapisuje kopię zapasową w jednym pliku,
  „Otwórz plik” dodaje projekty z pliku. „Zapisz plik” zapisuje bieżący projekt; eksport schematu i podglądu do PNG.

Na iPadzie: stuknięcie maluje, przytrzymanie palca to pipeta, dwa palce przybliżają i przesuwają schemat.
Z Apple Pencil maluje rysik, a palec tylko przesuwa.

Skróty klawiatury: `B` ołówek, `G` wypełnianie, `I` pipeta, `E` gumka, `1`–`9` kolor z palety,
`Ctrl+Z` / `Ctrl+Shift+Z` cofnij/ponów, `+`/`-` powiększenie (albo Ctrl + kółko), `[` `]` warstwy.

## Uruchomienie

**Najprościej:** kliknij dwa razy **`dist/beads-designer.html`**. To cała aplikacja w jednym pliku i działa bez internetu.

### Na iPadzie

Aplikacja jest publikowana na GitHub Pages: **https://dododorota.github.io/BeadsDesigner/**
(trzeba raz włączyć: *Settings → Pages → Deploy from a branch → `main` / `(root)`*).
Otwórz adres w Safari i wybierz *Udostępnij → Do ekranu początkowego* — pojawi się ikona,
a aplikacja będzie działać na pełnym ekranie, także bez internetu. Wymaga iPadOS 16.4+.

### W Visual Studio Code

1. Rozpakuj folder i otwórz go w VS Code: *File → Open Folder…* → `BeadsDesigner`.
2. VS Code zaproponuje rozszerzenie **Live Server** — zainstaluj je.
3. Otwórz `index.html` i kliknij **Go Live** na dolnym pasku (albo prawy przycisk → *Open with Live Server*).
   Aplikacja otworzy się w przeglądarce i odświeży sama po każdej zmianie w kodzie.

Samego `index.html` nie da się otworzyć podwójnym kliknięciem: przeglądarka blokuje moduły
JavaScript otwierane z dysku, dlatego potrzebny jest mały serwer (Live Server albo `npm start`).

### Z terminala (wymaga [Node.js](https://nodejs.org))

```bash
npm install      # raz, pobiera narzędzia
npm start        # serwer na http://localhost:8080, otwiera przeglądarkę
npm test         # testy logiki wzorów
npm run build    # odświeża dist/beads-designer.html po zmianach w kodzie
npm run icons    # rysuje ikony aplikacji (icons/*.png)
```

W VS Code te same polecenia są w *Terminal → Run Task…*, a **F5** uruchamia aplikację w Chrome.

## Struktura

```
.vscode/              ustawienia VS Code (Live Server, zadania, F5)
index.html            układ interfejsu
manifest.webmanifest  instalacja na ekranie początkowym (iPad, telefon)
sw.js                 praca offline (tylko na stronie https)
icons/                ikony aplikacji
docs/POSTEP.md        dziennik postępu, plan i decyzje
css/style.css         wygląd (jasny i ciemny motyw)
js/beads.js           katalog kształtów i rozmiarów koralików, wykończenia, paleta startowa
js/model.js           tryby, układ schematu, symetria, wypełnianie, zużycie, instrukcje
js/chart.js           schemat 2D na kanwie
js/preview3d.js       podgląd 3D (three.js)
js/main.js            spina wszystko: narzędzia, historia, zapis, „Moje projekty”
js/storage.js         biblioteka projektów na urządzeniu (IndexedDB), eksport i import
vendor/               three.js r169 (lokalnie, bez CDN)
scripts/              składanie wersji jednoplikowej, rysowanie ikon
tests/                testy logiki
```

## Co dalej

Plan etapów (ściegi płaskie i rurkowe, naszyjnik z motywami, figurki w technice japońskiej)
jest w **[docs/POSTEP.md](docs/POSTEP.md)**.
