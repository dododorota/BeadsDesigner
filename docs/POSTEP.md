# Postęp prac — Beads Designer

Ten plik to dziennik projektu: co już działa, co jest w planie i jakie decyzje podjęliśmy.
Aktualizujemy go przy każdym etapie pracy (checkpoint), najnowsze wpisy są na górze.

**Legenda:** ✅ gotowe · 🔧 w trakcie · ⏳ zaplanowane · 💡 pomysł na później

---

## Handover — stan na 2026-10-17

### Checklista

**Zrobione ✅**
- [x] Etap 1 — katalog koralików (36 typów, 10 kształtów), dotyk i Apple Pencil, ekran początkowy, offline
- [x] Etap 1b — „Moje projekty”: wiele projektów, autozapis, zapis przy zamykaniu, eksport/import wszystkich
- [x] Etap 1c — decyzja: zostajemy przy aplikacji z ekranu początkowego (bez wersji natywnej)
- [x] Etap 2 — tryb „Ścieg”: peyote, brick, herringbone (też skręcony), square/krosno, ladder, CRAW/PRAW-3…6
- [x] Etap 3 — motywy na naszyjniku: stokrotki (daisy chain), pętelki, frędzle
- [x] Etap 4 — tryb „Figurka” na krzyż: kulka z oczek, schemat jak z Pinteresta, instrukcja oczko po oczku, malowanie w 3D, dodatki, zawieszka
- [x] Etap 5 — figurki z kilku kulek (głowa, łapki, ogonek) i paski z oczek (uszy, płetwy)
- [x] Dokumentacja (ten plik + README), 56 testów, wypchnięte na `main` (`bf9224f`)
- [x] Wężyk szydełkowy przeniesiony do silnika ściegów (commit Doroty `8f0624c`)
- [x] Ścieżka nici na schematach ściegów i figurek (commit Doroty `2885006`)
- [x] Ścieg RAW / na krzyż płaski (koraliki na przemian poziomo i pionowo)
- [x] Schemat naszyjnika: odstępy między wierszami i cienka nitka łącząca wiersze — razem z RAW 64 testy; **zmiany tylko lokalnie, bez commita**

**Do zrobienia — Dorota**
- [x] Repo publiczne (2026-10-14)
- [x] GitHub Pages włączone (2026-10-17) → https://dododorota.github.io/BeadsDesigner/
  — sprawdzone w Chrome w rozmiarze iPada: 5 trybów bez błędów, service worker zapisuje pliki, aplikacja otwiera się bez internetu
- [ ] Instalacja na iPadzie: Safari → adres wyżej → Udostępnij → Do ekranu początkowego
- [ ] Test na iPadzie według listy „Do sprawdzenia na prawdziwym iPadzie” (niżej) i spisanie uwag

**Do zrobienia — następna sesja (do wyboru)**
- [ ] Poprawki po teście na iPadzie (najpierw to, jeśli są uwagi)
- [ ] Ograniczenia z list niżej (np. ścieżka nici dla PRAW/CRAW, pasek z oczek szerszy niż jedno oczko)
- [ ] 💡 Konstrukcje z rurek, import zdjęcia → wzór, kolory Miyuki/Toho z numerami

**Git:** Claude nie robi commitów, gałęzi ani `git push` — wszystko zostaje lokalnie, Dorota commituje sama.

**Jak zacząć jutro:** przeczytać tę sekcję, sprawdzić `git status` / `git log` (gałąź `main` śledzi `origin/main`),
uruchomić `npm test` (64 testy) i zapytać Dorotę o wyniki testu na iPadzie oraz wybór z listy wyżej.

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
| 2 | Ściegi płaskie i rurkowe na wspólnym „silniku ściegów”: peyote, brick, herringbone (proste i skręcone), ladder, square/krosno, CRAW, PRAW-3…6, wężyk szydełkowy | ✅ |
| 3 | Naszyjnik z motywami: stokrotki (daisy chain), pętelki, frędzle; perły i koraliki ozdobne przez katalog koralików | ✅ |
| 4 | Figurki w technice japońskiej (na krzyż): oczka z numerami, koraliki na krawędziach, instrukcja krok po kroku | ✅ |
| 5 | Figurki z kilku kulek (głowa, łapki, ogonek) i paski z oczek (uszy, płetwy) | ✅ |
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
| Schemat naszyjnika: wiersze z odstępami, cienka nitka z końca wiersza do początku następnego (to jedna nitka, nie rzędy) | ✅ |
| Wężyk szydełkowy (bead crochet), 3–16 na obwodzie, spirala z przesunięciem o pół koralika | ✅ (od 2026-10-17 liczony przez silnik ściegów) |
| Figurka warstwami (woksele) — tryb „Warstwy”, zostaje dla starszych projektów | ✅ |
| Ścieg: peyote, brick, herringbone, square/krosno, ladder — płasko albo w rurkę | ✅ |
| Ścieg: RAW / na krzyż płaski — oczka z 4 koralików, poziome i pionowe na przemian; instrukcja i ścieżka nici oczko po oczku | ✅ |
| Ścieg: herringbone skręcony (spirala) w rurce | ✅ |
| Ścieg: CRAW i PRAW-3, -5, -6 (sznur z „klatek”) | ✅ |
| Schemat ściegu: koraliki obrócone jak otwór (poziomo, pionowo, jodełka), rzędy numerowane jak w danym ściegu | ✅ |
| Podgląd 3D ściegu: płaska robótka albo rurka; PRAW na prawdziwym wielokącie | ✅ |
| Instrukcja ściegu rząd po rzędzie (kierunek pracy, start ladder / rzędy 1–2 peyote, klatki PRAW) | ✅ |
| Ścieżka nici na schemacie rząd po rzędzie (◀ ▶): peyote, brick, herringbone, square, ladder — płasko i w rurkę; RAW oczko po oczku | ✅ (bez PRAW/CRAW i wężyka) |
| Odbicie lewo–prawo, powielanie rzędów/klatek, wypełnianie z zawijaniem w rurce | ✅ |
| Motywy na naszyjniku: stokrotka (4–10 płatków + środek), pętelka (3–40), frędzel (2–40, z koralikiem zwrotnym) | ✅ |
| Narzędzie „Motyw” (M): stuknięcie w koralik wstawia za nim motyw, stuknięcie w motyw go usuwa | ✅ |
| „Wstaw co N koralików” — cały daisy chain jednym przyciskiem; pętelki na zewnątrz, do środka albo na zmianę | ✅ |
| Motywy na schemacie (obwódka + znaczek), w 3D (kwiatek, kółko, zwisający frędzel), w instrukcji (kiedy przełożyć igłę) | ✅ |
| Symetria, „Skopiuj lewą połowę na prawą” i „Powiel” uwzględniają motywy | ✅ |
| Perły, bicone i koraliki ozdobne między zwykłymi | ✅ przez katalog koralików (etap 1) — kolor w palecie z innym kształtem |
| Figurka na krzyż: kulka z oczek (pięcio- i sześciokąty), 6 rozmiarów: 30, 90, 120, 270, 360, 480 koralików | ✅ |
| Wydłużenie (wysokość ×) i spłaszczenie (głębokość ×) — jajo, płaska żabka | ✅ |
| Schemat płaski jak na Pinterest: oczko 1 w środku, pierścienie oczek, tył jako obwód, numery oczek, linie nici | ✅ |
| Instrukcja oczko po oczku: ile koralików już jest, co dodać; dodatki na końcu | ✅ |
| Malowanie stuknięciem w koralik w podglądzie 3D (ołówek, wypełnianie, pipeta, dodatki) | ✅ |
| Odbicie lewo–prawo (lustrzany koralik po drugiej stronie twarzy) | ✅ |
| Dodatki: pętelka 2–16 koralików doczepiona do koralika (uszko, łapka, płetwa), z lustrem | ✅ |
| Dodatki: pasek z oczek 1–8 kwadratowych oczek (płaskie uszko, płetwa) — instrukcja oczko po oczku | ✅ |
| Kilka kulek w figurce: „Doczep kulkę do oczka N” (do tułowia albo innej kulki), do 9 kulek, każda z własnym rozmiarem i wydłużeniem | ✅ |
| Kulka z boku dostaje lustrzaną parę („Łapka lewa/prawa”); malowanie i dodatki odbijają się na parę | ✅ |
| Wybór kulki na schemacie, nazwa, usuwanie (z parą i tym, co do niej doczepione); stuknięcie w kulkę w 3D przełącza schemat | ✅ |
| Instrukcja: każda kulka osobno, potem „Zszyj oczko X z oczkiem Y”; oczka łączenia oznaczone ◆ na schemacie | ✅ |
| „Pokaż w 3D do oczka N” — nauka kolejności pracy | ✅ |
| Ścieżka nici dla wybranego oczka na schemacie: nowe koraliki na jedną końcówkę żyłki, koralik krzyżowania | ✅ |
| Zawieszka na naszyjniku: figurka na krzyż albo figurka warstwami | ✅ |
| Zmiana rozmiaru kulki przenosi kolory i dodatki według położenia na bryle | ✅ |

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
| Publikacja na GitHub Pages — https://dododorota.github.io/BeadsDesigner/ | ✅ (2026-10-17) |

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

## Znane ograniczenia figurek na krzyż

- **Kształt bazowy to kulka** (wielościan z pięcio- i sześciokątów). Jajo i spłaszczenie to rozciągnięcie kulki —
  na prawdziwej robótce taki kształt daje się dociągnięciem nici/wypchaniem, liczba koralików się nie zmienia.
- **Kulki doczepiane** są osobnymi kulkami zszywanymi oczkami — nie wyrastają z tułowia jedną nicią. Kulka nie obraca się
  (przód zostaje z przodu), więc łączy się tym oczkiem, które akurat patrzy w stronę rodzica; aplikacja wybiera
  oczko o tej samej liczbie koralików, jeśli jest prawie tak samo dobrze ustawione.
- **Pasek z oczek** to oczka po 4 koraliki w jednym rzędzie, prostopadle do figurki; nie ma zwężania, wachlarza
  ani pasków szerszych niż jedno oczko (np. płetwa z 3 oczek obok siebie).
- **Kolejność oczek** jest wyliczana automatycznie (pierścieniami od przodu) — może różnić się od schematu z internetu.
- **Mieszane rozmiary** (np. większe oczka 8/0) rysują się we właściwym rozmiarze, ale bryła liczona jest dla najczęstszego koralika.
- Ścieżka nici pokazuje jedno oczko naraz na schemacie płaskim; nie ma jej w podglądzie 3D ani dla dodatków.
- Zużycie w trybie „Naszyjnik” liczy tylko naszyjnik — zawieszkę liczy się w jej trybie („Figurka”).

## Znane ograniczenia motywów

- **Stokrotka** leży płasko w płaszczyźnie naszyjnika; środek ma zawsze jeden koralik.
- **Pętelka** jest zaczepiona w jednym punkcie (bez koralików odstępu między jej końcami).
- **Frędzel** zawsze zwisa pionowo w dół; nie ma rozgałęzień ani kwiatka na końcu.
- **Kolory w motywie** wstawiają się jako aktualny kolor + kolor środka/zwrotny; resztę maluje się zwykłym ołówkiem.
- Nie ma jeszcze kwiatków z większą liczbą okrążeń, listków, kokardek ani motywów z rurek (pomysły z tablicy).

## Znane ograniczenia ściegów

- **Peyote w rurce** zakłada parzystą liczbę kolumn i przejście w górę (step up); spirala nieparzystego peyote nie jest modelowana.
- **Odbicie w peyote przy parzystej liczbie kolumn** jest przybliżone: lustrzana kolumna ma drugą parzystość, więc jest pół koralika wyżej/niżej.
- **Mieszane rozmiary koralików** w ściegu rysują się we właściwym kształcie i rozmiarze, ale siatka liczona jest dla najczęstszego koralika.
- **Herringbone:** pochylenie koralików i skręt (pół koralika na rząd) są stałe, przybliżone.
- **RAW płaski** jest tylko płaski (rurka RAW to CRAW/PRAW). Kolejność oczek jest stała: rzędy od dołu na zmianę w prawo
  i w lewo; ścieżka nici rysuje kółko przez 4 koraliki oczka, bez kierunku obiegu (zgodnie/przeciwnie do zegara na zmianę).
- **Ścieżka nici** jest uproszczona: linia przez środki koralików (w ladder i brick przez ich końce), bez pętli
  i zawiązywania nowej nici. Square rysujemy jak square stitch — na krośnie nić idzie inaczej (przez cały rząd tam i z powrotem).
  PRAW/CRAW (nić w głąb klatek) i wężyk (szydełko) nie mają ścieżki.

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
- **Wężyk w silniku ściegów** (2026-10-17): ścieg `crochet` w `js/stitches.js` (zawsze rurka, 3–16 na obwodzie) liczy układ spirali,
  sąsiadów, 3D, instrukcję, powielanie i zmianę rozmiaru. Tryb i przycisk „Wężyk” zostają, dane dalej w `project.tube`
  (`around`, `rows`, `beads`) — format pliku bez zmian. Wężyka nie ma na liście ściegów w trybie „Ścieg”, żeby nie było dwóch
  miejsc na to samo. Sąsiedzi wężyka idą wzdłuż spirali (±1, ±C, ±(C+1)), a nie po odległości na schemacie — na szwie spirali
  kolejne koraliki leżą na schemacie na ukos.
- **RAW płaski** (2026-10-19): koraliki numerowane poziomami od dołu (poziom 2r — poziome pod rzędem r, W sztuk;
  2r+1 — pionowe rzędu r, W+1 sztuk), więc powielanie rzędów i zmiana rozmiaru działają jak w innych ściegach.
  Kolejność pracy (oczko po oczku) liczy `rawSteps`. Przejście między RAW a innym ściegiem przenosi obrazek
  według miejsca na schemacie (najbliższy koralik), a nie według numerów.
- **Ścieżka nici = kroki instrukcji** (2026-10-17): `stitchThread` w `js/stitches.js` i `ballThread` w `js/ball.js`
  zwracają kroki o tych samych nazwach co linie instrukcji, z punktami w jednostkach schematu; schemat rysuje bieżący
  krok i blado poprzedni. W rurce linia przerywa się tam, gdzie schemat się zawija.
- **Peyote liczy rzędy jak w peyote:** pole „Rzędów” i instrukcja podają przejścia igłą (2 na każdy koralik w kolumnie).
- **Zmiana ściegu albo rozmiaru zachowuje wzór** w tych samych rzędach i kolumnach (nowe miejsca powtarzają istniejący wzór).
- **Motyw = grupa kolejnych koralików na tej samej nitce** (`strand.groups: [{ start, n, kind, side, rev }]`).
  Koraliki zostają w zwykłej liście, więc malowanie, wypełnianie, zużycie i waga działają bez zmian;
  grupa mówi tylko, jak je ułożyć (schemat, 3D) i co napisać w instrukcji. Kolejność nawlekania w motywie
  jest stała (stokrotka: płatki → środek, frędzel: od góry → zwrotny), także po odbiciu lustrzanym.
- **Figurka na krzyż = wielościan Goldberga**: oczka to ściany (12 pięciokątów + sześciokąty), koraliki to krawędzie,
  w narożniku spotykają się 3 koraliki. Bryłę liczymy z dwudziestościanu (sfera geodezyjna → bryła dualna),
  ustawioną symetrycznie lewo–prawo, z pięciokątem na wprost jako oczkiem 1. Koraliki są numerowane w kolejności nawlekania.
- **Schemat płaski = rzut azymutalny równoodległy** ze środka oczka 1 — pierścienie oczek w równych odstępach, tył jako obwód.
- **Figurka z kilku kulek** (2026-10-17): tułów to sama `ball`, doczepione kulki są w `ball.parts: [{ name, parent, at, shape, sy, sz, beads, extras }]`
  (`parent` = -1 albo wcześniejsza kulka, `at` = numer kroku oczka rodzica). Numery koralików idą przez całą figurkę
  (tułów, potem kulki po kolei), więc malowanie, wypełnianie, lustro i zużycie działają jak dla jednej kulki.
  Lustrzana para to kulka o tym samym rozmiarze przy lustrzanym oczku lustrzanego rodzica.
- **Dodatki mają rodzaj** (`kind: 'loop' | 'strip'`); stare pliki bez pola to pętelki. Pasek ma 3 koraliki na oczko (bok, góra, bok).
- **Stary tryb „Figurka 3D” zostaje jako „Warstwy”**, żeby stare projekty i zawieszki działały.
- **Format pliku eksportu:** `{ format: "beadsdesigner-library", version: 1, exported, projects: [{ updated, project }] }`;
  pojedynczy projekt to sam obiekt projektu (`version: 2`). Oba mają rozszerzenie `.beads.json`.

---

## Dziennik

### 2026-10-19 — Schemat naszyjnika czytelniejszy (lokalnie, bez commita)
- Pytanie Doroty: czemu schemat naszyjnika ma „rzędy”, skoro to jeden sznurek. Schemat łamie nitkę co „W rzędzie schematu”
  koralików jak tekst; numery po lewej to pierwszy koralik wiersza.
- Wiersze rozsunięte (`STRAND_ROW_GAP`), a cienka linia prowadzi nitkę z końca wiersza szczeliną do początku następnego.
- Testy: 64 (1 nowy). Sprawdzone w Chrome na przykładowym naszyjniku.

### 2026-10-19 — Ścieg RAW / na krzyż płaski (lokalnie, bez commita)
- Prośba Doroty: układ z koralikami na przemian poziomo i pionowo (broszka-żabka z Pinteresta).
- Nowy ścieg `raw` w `js/stitches.js`: schemat z odstępami między oczkami, 3D płaskie, instrukcja oczko po oczku
  (4 → 3 → 2 nowe koraliki, z nazwami: dół, góra, lewy/prawy bok), ścieżka nici dookoła oczka, lustro lewo–prawo,
  powielanie rzędów, opis koralika pod kursorem.
- Testy: 63 (2 nowe). Sprawdzone w Chrome: serce z przykładu peyote przechodzi na RAW we właściwe miejsce, 3D, ścieżka nici.

### 2026-10-17 — Ścieżka nici na schematach (lokalnie, bez commita)
- Ściegi: „Ścieżka nici → Pokaż na schemacie” i ◀ ▶ rząd po rzędzie; schemat przewija się do bieżącego rzędu.
  Peyote (na zmianę nowy i wystający koralik, step up w rurce), brick (pod mostkiem i w górę), herringbone (pary),
  square stitch, ladder (w górę i w dół).
- Figurka: „Pokaż ścieżkę nici na schemacie” dla oczka z „Krok po kroku” — obwód oczka, nowe koraliki ze strzałkami
  od ostatniego istniejącego, przerywane kółko na koraliku krzyżowania.
- Testy: 61 (3 nowe: nazwy kroków = instrukcja dla każdego ściegu, peyote, figurka). Sprawdzone w Chrome na zrzutach:
  peyote, brick, herringbone w rurce, ladder, PRAW (wyłączone z podpowiedzią), figurka oczko 10.

### 2026-10-17 — Wężyk szydełkowy w silniku ściegów (lokalnie, bez commita)
- Nowy ścieg `crochet` w `js/stitches.js`; tryb „Wężyk” w `js/model.js` i podgląd 3D korzystają z silnika ściegów.
- Dla 4 rozmiarów wężyka (6×60, 3×5, 16×12, 7×9) schemat, numery rzędów, sąsiedzi, instrukcja, wymiary, powielanie
  i zmiana rozmiaru dają dokładnie to samo co przed zmianą. W 3D inne jest tylko wyśrodkowanie w pionie (ułamek mm).
- Testy: 58 (2 nowe). Sprawdzone w Chrome: schemat i 3D wężyka, wypełnianie przez szew spirali, lista ściegów bez wężyka.

### 2026-10-17 — Etap 5: figurki z kilku kulek, paski z oczek
- GitHub Pages włączone; strona sprawdzona w Chrome (rozmiar iPada, poziomo i pionowo, bez internetu).
- `js/ball.js`: części figurki (doczepianie z lustrzaną parą, usuwanie z potomkami, zmiana rozmiaru przenosząca miejsca
  doczepienia), położenie kulek w 3D (stykają się oczkami), pasek z oczek, instrukcja dla wielu kulek.
- Panel „Figurka na krzyż”: kulka na schemacie, nazwa, usuwanie, „Doczep kulkę do oczka N”, rodzaj dodatku (pętelka / pasek).
- Schemat: ◆ przy oczkach łączenia, znaczki dodatków `+4` (pętelka) i `3□` (pasek z 3 oczek).
- Testy: 56 (5 nowych). Sprawdzone w Chrome przez klikanie w interfejsie: głowa na tułowiu żabki, uszy-paski na głowie,
  para łapek, cofnięcie, przeładowanie strony (projekt zapisany) — bez błędów w konsoli.

### 2026-10-14 — Zaparkowane
- Checklista zrobionego i planu na następną sesję w sekcji Handover. Bez zmian w kodzie.

### 2026-10-14 — Etap 4: figurki na krzyż (technika japońska)
- Nowy moduł `js/ball.js`: bryły z oczek (6 rozmiarów), kolejność pracy, sąsiedzi, lustro, schemat płaski, położenia 3D,
  dodatki (pętelki), przenoszenie kolorów przy zmianie rozmiaru, instrukcja oczko po oczku.
- Tryb „Figurka” w przełączniku; stary tryb figurki to teraz „Warstwy”.
- Schemat: linie oczek, numery oczek, znaczki dodatków; koraliki obrócone wzdłuż krawędzi.
- Podgląd 3D: figurka z dodatkami, malowanie stuknięciem, „pokaż do oczka N”, figurka jako zawieszka na naszyjniku
  (wybór zawieszki: brak / na krzyż / warstwy).
- Przykład: miętowa żabka (270 koralików) z białym brzuszkiem, oczkami, rumieńcami i łapkami; wisi też na przykładowym naszyjniku.
- Testy: 51 (9 nowych dla figurek). Sprawdzone w Chrome: schemat, 3D, malowanie stuknięciem w 3D (z lustrem),
  podgląd do oczka 12, zawieszka na naszyjniku.

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
