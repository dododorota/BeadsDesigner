# Postęp prac — Beads Designer

Ten plik to dziennik projektu: co już działa, co jest w planie i jakie decyzje podjęliśmy.
Aktualizujemy go przy każdym etapie pracy (checkpoint), najnowsze wpisy są na górze.

**Legenda:** ✅ gotowe · 🔧 w trakcie · ⏳ zaplanowane · 💡 pomysł na później

---

## Handover — gdzie skończyliśmy (aktualizacja 2026-10-13)

**Stan kodu:** etapy 1, 1b, 2 i 3 gotowe na `main`:
- katalog koralików, dotyk i Apple Pencil, instalacja na ekranie początkowym, praca offline;
- „Moje projekty” (wiele projektów na urządzeniu, miniaturki, zapis przy zamykaniu, eksport wszystkich);
- **tryb „Ścieg”**: peyote, brick, herringbone (też skręcony), square/krosno, ladder, CRAW/PRAW-3…6 — płasko albo w rurkę;
- **motywy na naszyjniku**: stokrotki (daisy chain), pętelki, frędzle — narzędziem na schemacie albo „Wstaw co N koralików”.

42 testy przechodzą. Lokalna gałąź `main` śledzi `origin/main` — zwykły `git push` działa.

**Decyzja (2026-10-13): zostajemy przy aplikacji z ekranu początkowego** (opcja A z tabeli niżej).
Etap 1c (aplikacja natywna) odpada, dopóki Dorota sama do niego nie wróci.

### Do zrobienia po stronie Doroty

1. **Włączyć GitHub Pages:** repo publiczne (*Settings → General → Danger Zone → Change visibility*),
   potem *Settings → Pages → Deploy from a branch → `main` / `(root)`*. Adres: https://dododorota.github.io/BeadsDesigner/
2. **Zainstalować na iPadzie:** Safari → adres wyżej → Udostępnij → Do ekranu początkowego.
3. **Przetestować na prawdziwym iPadzie** — lista w sekcji „Do sprawdzenia na prawdziwym iPadzie”.

### Następny krok

**Etap 4 — figurki w technice japońskiej** (na krzyż: oczka z numerami, koraliki na krawędziach,
instrukcja krok po kroku jak na schematach z tablicy „biżu”). To największy etap — warto zacząć od
jednej bryły (kulka) i dopiero potem dodawać uszy, łapki i własne kształty.
Alternatywnie: dopracowanie list „Znane ograniczenia” (ściegi, motywy).

<details>
<summary>Rozważane drogi instalacji (archiwum decyzji)</summary>

| Opcja | Koszt | Wygoda | Zapis projektów |
| --- | --- | --- | --- |
| **A. Aplikacja z ekranu początkowego — wybrana** | 0 zł | Safari tylko raz do instalacji; własna ikona, pełny ekran, offline | pamięć aplikacji + eksport do pliku |
| B. SideStore (sideload, darmowe Apple ID) | 0 zł | komputer z Windowsem raz przy konfiguracji; potem odświeżanie co 7 dni na iPadzie | prawdziwe pliki w *Pliki → Na moim iPadzie* |
| C. AltStore (sideload, darmowe Apple ID) | 0 zł | odświeżanie co 7 dni z komputera z AltServerem w tej samej sieci Wi-Fi | jak B |
| D. TrollStore | 0 zł | na stałe — tylko starsze iPadOS (do 17.0) | jak B |
| E. Apple Developer + TestFlight | 99 USD/rok | bez odświeżania, wersje ważne 90 dni; potrzebny Mac lub budowanie w chmurze | jak B, plus możliwy iCloud |

Sam „Tryb dewelopera” nie wystarcza do sideloadu — aplikacja musi być podpisana certyfikatem Apple
i wgrana narzędziem (SideStore/AltStore/Xcode). Nie używamy płatnych „serwisów do podpisywania”.
W `js/storage.js` zostało miejsce na zapis do plików, gdyby kiedyś powstała wersja natywna.
</details>

---

## Plan

| Etap | Co | Stan |
| --- | --- | --- |
| 1 | Katalog koralików (kształty i rozmiary Miyuki/Toho w palecie) + obsługa iPada | ✅ (czeka na sprawdzenie na prawdziwym iPadzie) |
| 1b | „Moje projekty”: wiele projektów, zapis w IndexedDB, zapis przy zamykaniu, eksport wszystkiego | ✅ |
| 1c | Aplikacja natywna na iPada (Capacitor + `.ipa`) | — odrzucone 2026-10-13, zostajemy przy ekranie początkowym |
| 2 | Ściegi płaskie i rurkowe na wspólnym „silniku ściegów”: peyote, brick, herringbone (proste i skręcone), ladder, square/krosno, CRAW, PRAW-3…6 | ✅ (wężyk szydełkowy jeszcze osobno — patrz ograniczenia) |
| 3 | Naszyjnik z motywami: stokrotki (daisy chain), pętelki, frędzle; perły i koraliki ozdobne przez katalog koralików | ✅ |
| 4 | Figurki w technice japońskiej (na krzyż): oczka z numerami, koraliki na krawędziach, instrukcja krok po kroku | ⏳ następny |
| — | Konstrukcje z rurek (kwiaty, gwiazdki, serduszka z trójkątów), import zdjęcia → wzór, katalog kolorów Miyuki/Toho z numerami | 💡 |

Skąd ta kolejność: tablica inspiracji na Pinterest („biżu”) — najwięcej jest figurek 3D,
kwiatków z koralików, sznurów rurkowych i płaskich ściegów. Katalog koralików idzie pierwszy,
bo każdy kolejny tryb korzysta z mieszanych kształtów i rozmiarów (np. PRAW: 11/0 w „podłogach”,
perełki 4 mm w „ścianach”).

---

## Funkcje

### Tryby projektowania
| Funkcja | Stan |
| --- | --- |
| Naszyjnik — pojedynczy sznurek, symetria od środka, powielanie wzoru, zawieszka-figurka | ✅ |
| Wężyk szydełkowy (bead crochet), 3–16 na obwodzie, spirala z przesunięciem o pół koralika | ✅ |
| Figurka 3D warstwami (woksele) — wstępna wersja, docelowo zastąpi ją technika japońska | ✅ |
| Ścieg: peyote, brick, herringbone, square/krosno, ladder — płasko albo w rurkę | ✅ |
| Ścieg: herringbone skręcony (spirala) w rurce | ✅ |
| Ścieg: CRAW i PRAW-3, -5, -6 (sznur z „klatek”) | ✅ |
| Schemat ściegu: koraliki obrócone jak otwór (poziomo, pionowo, jodełka), rzędy numerowane jak w danym ściegu | ✅ |
| Podgląd 3D ściegu: płaska robótka albo rurka; PRAW na prawdziwym wielokącie | ✅ |
| Instrukcja ściegu rząd po rzędzie (kierunek pracy, start ladder / rzędy 1–2 peyote, klatki PRAW) | ✅ |
| Odbicie lewo–prawo, powielanie rzędów/klatek, wypełnianie z zawijaniem w rurce | ✅ |
| Motywy na naszyjniku: stokrotka (4–10 płatków + środek), pętelka (3–40), frędzel (2–40, z koralikiem zwrotnym) | ✅ |
| Narzędzie „Motyw” (M): stuknięcie w koralik wstawia za nim motyw, stuknięcie w motyw go usuwa | ✅ |
| „Wstaw co N koralików” — cały daisy chain jednym przyciskiem; pętelki na zewnątrz, do środka albo na zmianę | ✅ |
| Motywy na schemacie (obwódka + znaczek), w 3D (kwiatek, kółko, zwisający frędzel), w instrukcji (kiedy przełożyć igłę) | ✅ |
| Symetria, „Skopiuj lewą połowę na prawą” i „Powiel” uwzględniają motywy | ✅ |
| Perły, bicone i koraliki ozdobne między zwykłymi | ✅ przez katalog koralików (etap 1) — kolor w palecie z innym kształtem |
| Figurki w technice japońskiej | ⏳ etap 4 |

### Koraliki
| Funkcja | Stan |
| --- | --- |
| Każdy kolor w palecie ma własny kształt i rozmiar; można je mieszać w jednym projekcie | ✅ |
| Katalog: okrągłe 15/0–6/0, Delica 15/0–8/0, Toho Treasure i Aiko, demi round, kostki 1,5–4 mm, trójkąty, rurki 3–12 mm, krople i magatamy, Tila / Half / Quarter Tila, bicone 3–6 mm, perełki 3–8 mm | ✅ |
| Wykończenia: nieprzezroczysty, przezroczysty, matowy, perłowy, metaliczny | ✅ |
| Zużycie i waga liczone osobno dla każdego typu koralika | ✅ |
| Długość naszyjnika z prawdziwych długości koralików (rurka 6 mm zajmuje 6 mm) | ✅ |
| Kształty widoczne na schemacie 2D (znaczki) i w podglądzie 3D (bryły) | ✅ |
| Numery kolorów Miyuki/Toho (np. DB-0010) | 💡 |

### iPad i dotyk
| Funkcja | Stan |
| --- | --- |
| Stuknięcie maluje, przeciągnięcie maluje ciągiem | ✅ |
| Przytrzymanie palca = pipeta | ✅ |
| Dwa palce: przybliżanie i przesuwanie schematu | ✅ |
| Apple Pencil: po wykryciu rysika palec tylko przesuwa, maluje rysik | ✅ |
| Większe przyciski i pola pod palec; pola tekstowe nie powiększają strony w Safari | ✅ |
| iPad w pionie: schemat na całą szerokość | ✅ |
| Instalacja na ekranie początkowym (ikona, pełny ekran) | ✅ |
| Działanie bez internetu (service worker) — tylko na stronie https | ✅ |
| Publikacja na GitHub Pages | ⏳ czeka na włączenie w ustawieniach repo (po stronie Doroty) |

### Zapis i eksport
| Funkcja | Stan |
| --- | --- |
| „Moje projekty”: wiele projektów na urządzeniu, miniaturki z podglądu 3D, otwórz / duplikuj / usuń | ✅ |
| „Nowy” nie kasuje poprzedniego projektu; nowe projekty nazwane według rodzaju | ✅ |
| Autozapis do IndexedDB (0,4 s po zmianie) + natychmiast przy chowaniu / zamykaniu aplikacji | ✅ |
| Szybka kopia bieżącego projektu w `localStorage` — odzyskiwana, gdy zapis do bazy nie zdążył | ✅ |
| Prośba o trwałą pamięć (`navigator.storage.persist`) | ✅ |
| „Eksportuj wszystkie” do jednego pliku; „Otwórz plik” dodaje projekty (pojedyncze albo całą bibliotekę) zamiast zastępować | ✅ |
| Przypomnienie o kopii zapasowej (brak kopii albo starsza niż 14 dni i są nowsze zmiany) | ✅ |
| Projekt ze starej wersji (jeden zapis w przeglądarce) przenoszony do biblioteki przy pierwszym uruchomieniu | ✅ |
| Pliki `.beads.json`, eksport PNG schematu i podglądu | ✅ |
| Stare pliki (jeden rozmiar dla projektu) wczytują się poprawnie | ✅ |
| Zmiana nazwy projektu z poziomu listy (teraz: pole nazwy na górnym pasku) | 💡 |
| Pliki w Dokumentach iPada (aplikacja natywna) | — odrzucone |

---

## Do sprawdzenia na prawdziwym iPadzie

Gesty były testowane w Chrome symulowanymi zdarzeniami dotyku i rysika. Na urządzeniu trzeba jeszcze potwierdzić:

- [ ] szczypanie i przesuwanie są płynne, a Safari nie przybliża przy tym całej strony
- [ ] przytrzymanie palca nie otwiera systemowego menu
- [ ] Apple Pencil maluje od razu, palec przesuwa
- [ ] „Zapisz plik” zapisuje do aplikacji Pliki, „Otwórz” widzi pliki `.beads.json`
- [ ] instalacja przez Udostępnij → Do ekranu początkowego; ikona i pełny ekran
- [ ] po instalacji aplikacja otwiera się w trybie samolotowym
- [ ] „Moje projekty”: projekty zostają po zamknięciu aplikacji z przełącznika aplikacji (przesunięcie w górę)
- [ ] „Eksportuj wszystkie” zapisuje plik w aplikacji Pliki; „Otwórz plik” dodaje projekty z tego pliku
- [ ] tryb „Ścieg”: malowanie palcem i rysikiem po obróconych koralikach (brick, herringbone) trafia w dobry koralik
- [ ] podgląd 3D rurki herringbone/CRAW obraca się płynnie

Wymagany iPadOS 16.4 lub nowszy (import map w Safari).

---

## Znane ograniczenia motywów

- **Stokrotka** leży płasko w płaszczyźnie naszyjnika; środek ma zawsze jeden koralik.
- **Pętelka** jest zaczepiona w jednym punkcie (bez koralików odstępu między jej końcami).
- **Frędzel** zawsze zwisa pionowo w dół; nie ma rozgałęzień ani kwiatka na końcu.
- **Kolory w motywie** wstawiają się jako aktualny kolor + kolor środka/zwrotny; resztę maluje się zwykłym ołówkiem.
- Nie ma jeszcze kwiatków z większą liczbą okrążeń, listków, kokardek ani motywów z rurek (pomysły z tablicy).

## Znane ograniczenia ściegów

- **Wężyk szydełkowy** to nadal osobny tryb „Wężyk” — jeszcze nie przeniesiony do silnika ściegów.
- **Peyote w rurce** zakłada parzystą liczbę kolumn i przejście w górę (step up); spirala nieparzystego peyote nie jest modelowana.
- **Odbicie w peyote przy parzystej liczbie kolumn** jest przybliżone: lustrzana kolumna ma drugą parzystość, więc jest pół koralika wyżej/niżej.
- **Mieszane rozmiary koralików** w ściegu rysują się we właściwym kształcie i rozmiarze, ale siatka liczona jest dla najczęstszego koralika.
- **Herringbone:** pochylenie koralików i skręt (pół koralika na rząd) są stałe, przybliżone.
- **Ścieżka nici** nie jest rysowana — instrukcja opisuje kolejność słowami.

---

## Decyzje

- **Koralik = typ, nie projekt.** Kształt i rozmiar są przypisane do koloru w palecie (`palette[i].bead`),
  a nie do całego projektu. Plik projektu ma teraz `version: 2`; pliki w wersji 1 dostają
  dotychczasowy rozmiar w każdym kolorze.
- **Siatka wężyka i figurki** opiera się na najczęściej użytym koraliku. Mieszane rozmiary w tych
  trybach na razie tylko się rysują, ale nie zmieniają geometrii — to przyjdzie razem z silnikiem ściegów (etap 2).
- **Waga** dla okrągłych 11/0 i Delica 11/0 pochodzi z typowych wartości producentów; dla pozostałych
  kształtów jest szacowana z wymiarów (objętość szkła), więc to przybliżenie.
- **Offline** działa tylko na https, żeby lokalnie (Live Server) zawsze widzieć najnowszy kod.
- **Repo publiczne**, żeby darmowo publikować aplikację na GitHub Pages.
- **Biblioteka projektów w IndexedDB**, z zapasowym `localStorage` i pamięcią, gdy IndexedDB nie działa.
  Kod zapisu jest za jednym interfejsem (`all/get/put/del/getMeta/setMeta`), żeby aplikacja natywna
  mogła podstawić zapis do plików bez zmian w reszcie aplikacji.
- **Otwarcie projektu nie zmienia daty „ostatnio zmieniany”** — lista jest sortowana według prawdziwych zmian.
- **Instalacja na iPadzie: aplikacja z ekranu początkowego** (2026-10-13). Bez sideloadu i bez App Store.
- **Silnik ściegów (`js/stitches.js`)**: każdy ścieg opisuje koraliki jednym zestawem pól — miejsce na schemacie (`x, y`),
  kąt otworu (`a`), położenie w mm (`u, v`, a w PRAW `theta, rho`). Schemat, podgląd 3D, sąsiedzi do wypełniania,
  odbicie i instrukcja czytają ten sam opis, więc nowy ścieg to tylko nowa funkcja układu.
- **Peyote liczy rzędy jak w peyote:** pole „Rzędów” i instrukcja podają przejścia igłą (2 na każdy koralik w kolumnie).
- **Zmiana ściegu albo rozmiaru zachowuje wzór** w tych samych rzędach i kolumnach (nowe miejsca powtarzają istniejący wzór).
- **Motyw = grupa kolejnych koralików na tej samej nitce** (`strand.groups: [{ start, n, kind, side, rev }]`).
  Koraliki zostają w zwykłej liście, więc malowanie, wypełnianie, zużycie i waga działają bez zmian;
  grupa mówi tylko, jak je ułożyć (schemat, 3D) i co napisać w instrukcji. Kolejność nawlekania w motywie
  jest stała (stokrotka: płatki → środek, frędzel: od góry → zwrotny), także po odbiciu lustrzanym.
- **Format pliku eksportu:** `{ format: "beadsdesigner-library", version: 1, exported, projects: [{ updated, project }] }`;
  pojedynczy projekt to sam obiekt projektu (`version: 2`). Oba mają rozszerzenie `.beads.json`.

---

## Dziennik

### 2026-10-13 — Etap 3: motywy na naszyjniku
- Nowy moduł `js/motifs.js`: stokrotka, pętelka, frędzel jako grupy koralików na nitce; wstawianie, usuwanie,
  wypełnianie co N, powielanie i lustro z motywami, długość naszyjnika z motywami.
- Narzędzie „Motyw” na pasku (tylko naszyjnik) i sekcja „Motywy” w panelu sznurka.
- Schemat: obwódka i znaczek motywu; 3D: kwiatek wokół środka, pętelka na zewnątrz/do środka, frędzel w dół;
  instrukcja: „płatki → przełóż przez 1. płatek, środek → przełóż przez 4. płatek”, „zamknij pętelkę”, „wróć przez frędzel”.
- Symetryczne malowanie dopasowuje role (płatek ↔ płatek, środek ↔ środek).
- Testy: 42 (9 nowych dla motywów). Sprawdzone w Chrome: daisy chain jednym przyciskiem, pętelki na zmianę,
  wstawienie i usunięcie motywu stuknięciem, schemat, 3D i instrukcja.

### 2026-10-13 — Etap 2: ściegi
- Decyzja: zostajemy przy aplikacji z ekranu początkowego; etap 1c odrzucony.
- Nowy moduł `js/stitches.js` (silnik ściegów) i tryb „Ścieg” w przełączniku (Naszyjnik · Wężyk · Ścieg · Figurka).
- Ściegi: peyote, brick, herringbone (prosty i skręcony), square/krosno, ladder, CRAW, PRAW-3/5/6; płasko albo w rurkę.
- Panel „Ścieg”: wybór ściegu i formy, szerokość / na obwodzie / boki, rzędy / klatki, skręt, odbicie, powielanie rzędów.
- Schemat obraca koraliki według otworu; podgląd 3D płaski albo rurka; instrukcja rząd po rzędzie dla każdego ściegu.
- Przykładowy projekt dostał peyote z rombem; nowy pusty ścieg to peyote 10 kolumn × 40 rzędów.
- Testy: 33 (13 nowych dla ściegów). Sprawdzone w Chrome: zrzuty peyote, brick, skręconego herringbone i CRAW (schemat, 3D, instrukcja).

### 2026-10-13 — Etap 1b: „Moje projekty”
- Nowy moduł `js/storage.js`: biblioteka projektów (IndexedDB → localStorage → pamięć), eksport/import.
- Ekran „Moje projekty”: karty z miniaturką, rodzajem i datą; otwórz, duplikuj, usuń; nowy projekt; otwórz plik; eksportuj wszystkie.
- Górny pasek: „Moje projekty” (z kropką przypomnienia o kopii), „Nowy”, „Zapisz plik”.
- Zapis przy `pagehide` / `visibilitychange`, szybka kopia w `localStorage`, odzyskiwanie po przerwanym zapisie.
- Przeniesienie projektu ze starego zapisu przy pierwszym uruchomieniu.
- Testy: 20 (6 nowych dla biblioteki). Sprawdzone w Chrome (sterowanym przez DevTools, prawdziwy czas):
  migracja, przeładowanie, nowy projekt, lista z miniaturkami, duplikat, usunięcie, eksport, przełączanie,
  zapis przy natychmiastowym zamknięciu — wszystkie 8 scenariuszy działa.

### 2026-10-11 — Rozmowa o instalacji i zapisie (bez zmian w kodzie)
- Omówione drogi instalacji: ekran początkowy, SideStore, AltStore, TrollStore, TestFlight (tabela w Handover).
- Ustalone, że zapis projektów trzeba wzmocnić niezależnie od drogi → nowy etap 1b „Moje projekty”.
- Czekamy na decyzję o drodze instalacji i wersję iPadOS.

### 2026-10-10 — Etap 1: katalog koralików i iPad
- Katalog 36 typów koralików w 10 kształtach (Miyuki, Toho, rurki, tile, bicone, perełki); wybór w palecie.
- Zużycie, waga, długość naszyjnika i instrukcja uwzględniają typ każdego koralika.
- Schemat 2D: osobny znaczek dla każdego kształtu, drobniejsze koraliki rysowane mniejsze.
- Podgląd 3D: osobna bryła dla każdego kształtu, koraliki na nitce rozłożone według prawdziwej długości.
- Dotyk: stuknięcie, przeciąganie, przytrzymanie = pipeta, szczypanie, tryb Apple Pencil.
- iPad: większe cele pod palec, układ w pionie, manifest, ikony, service worker (offline).
- Testy: 14 (w tym migracja starych plików, mieszane koraliki, szacowanie wagi). Sprawdzone w Chrome
  bez okna: zrzuty w rozmiarze iPada (poziomo i pionowo) i symulacja gestów.

### 2026-10-10 — Start
- Projekt wypchnięty do https://github.com/dododorota/BeadsDesigner (gałąź `main`).
- Zebrane inspiracje z tablicy „biżu” na Pinterest; ustalony plan etapów 1–4.
