# Beads Designer

Przeglądarkowa pracownia do projektowania wzorów z koralików — z podglądem 3D na żywo.
Inspiracją był edytor wzorów do dzianiny (colorwork), ale tu wszystko kręci się wokół
drobnych koralików (rocailles 15/0–6/0).

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
- **Paleta**: własne kolory, nazwy i wykończenia (nieprzezroczysty, przezroczysty, matowy, perłowy, metaliczny) — widać je też na podglądzie 3D.
- **Zużycie**: liczba koralików każdego koloru i przybliżona waga w gramach.
- **Instrukcja**: kolejność nawlekania (naszyjnik, wężyk — od końca) albo warstwy rząd po rzędzie (figurka); można ją skopiować.
- **Zapis**: projekt zapisuje się sam w przeglądarce; „Zapisz plik” / „Otwórz” do plików `.beads.json`; eksport schematu i podglądu do PNG.

Skróty: `B` ołówek, `G` wypełnianie, `I` pipeta, `E` gumka, `1`–`9` kolor z palety,
`Ctrl+Z` / `Ctrl+Shift+Z` cofnij/ponów, `+`/`-` powiększenie (albo Ctrl + kółko), `[` `]` warstwy.

## Uruchomienie

**Najprościej:** kliknij dwa razy **`dist/beads-designer.html`**. To cała aplikacja w jednym pliku i działa bez internetu.

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
```

W VS Code te same polecenia są w *Terminal → Run Task…*, a **F5** uruchamia aplikację w Chrome.

## Struktura

```
.vscode/              ustawienia VS Code (Live Server, zadania, F5)
index.html            układ interfejsu
css/style.css         wygląd (jasny i ciemny motyw)
js/beads.js           rozmiary koralików, wykończenia, paleta startowa
js/model.js           tryby, układ schematu, symetria, wypełnianie, zużycie, instrukcje
js/chart.js           schemat 2D na kanwie
js/preview3d.js       podgląd 3D (three.js)
js/main.js            spina wszystko: narzędzia, historia, zapis
vendor/               three.js r169 (lokalnie, bez CDN)
scripts/              składanie wersji jednoplikowej
tests/                testy logiki
```

## Pomysły na dalej

- inne techniki: peyote / brick stitch (płaskie paski i bransoletki), kilka sznurków naraz (naszyjnik wielorzędowy),
  koraliki różnej wielkości w jednym sznurku, zawieszki i przekładki
- import zdjęcia → wzór (dopasowanie kolorów do palety)
- katalog prawdziwych kolorów Miyuki/Toho z numerami
