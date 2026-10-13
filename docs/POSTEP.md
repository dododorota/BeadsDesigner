# Postęp prac — Beads Designer

Ten plik to dziennik projektu: co już działa, co jest w planie i jakie decyzje podjęliśmy.
Aktualizujemy go przy każdym etapie pracy (checkpoint), najnowsze wpisy są na górze.

**Legenda:** ✅ gotowe · 🔧 w trakcie · ⏳ zaplanowane · 💡 pomysł na później

---

## Handover — gdzie skończyliśmy (aktualizacja 2026-10-13)

**Stan kodu:** etapy 1 i 1b gotowe na `main`: katalog koralików, dotyk i Apple Pencil, instalacja
na ekranie początkowym, praca offline, **„Moje projekty”** (wiele projektów na urządzeniu, miniaturki,
zapis przy zamykaniu, eksport wszystkich do jednego pliku). 20 testów przechodzi.
Lokalna gałąź nazywa się `main` i śledzi `origin/main` — zwykły `git push` działa.

**Nadal otwarte: droga instalacji na iPadzie** (decyzje niżej). Etap 1b był wspólny dla wszystkich dróg,
więc zrobiliśmy go bez czekania. Następny krok zależy od decyzji: 1c (aplikacja natywna) albo od razu etap 2.

Jak jest teraz z zapisem: projekty w IndexedDB na urządzeniu, natychmiastowa kopia bieżącego projektu
w `localStorage` przy chowaniu aplikacji, eksport wszystkiego do pliku `.beads.json`. Dane są nadal
osobne dla Safari i dla ikony z ekranu początkowego i znikają po usunięciu ikony / danych witryny —
dlatego aplikacja przypomina o kopii zapasowej (kropka przy „Moje projekty”, gdy kopii nie ma albo ma ponad 14 dni).

### Decyzje do podjęcia (po stronie Doroty)

1. **Droga instalacji na iPadzie** — jedna z:
   | Opcja | Koszt | Wygoda | Zapis projektów |
   | --- | --- | --- | --- |
   | A. Aplikacja z ekranu początkowego (już działa) | 0 zł | Safari tylko raz do instalacji; własna ikona, pełny ekran, offline | pamięć aplikacji + eksport do pliku |
   | B. SideStore (sideload, darmowe Apple ID) | 0 zł | komputer z Windowsem raz przy konfiguracji; potem odświeżanie co 7 dni na iPadzie | prawdziwe pliki w *Pliki → Na moim iPadzie → Koraliki* |
   | C. AltStore (sideload, darmowe Apple ID) | 0 zł | odświeżanie co 7 dni z komputera z AltServerem w tej samej sieci Wi-Fi | jak B |
   | D. TrollStore | 0 zł | na stałe, bez odświeżania — **tylko starsze iPadOS (do 17.0)** | jak B |
   | E. Apple Developer + TestFlight | 99 USD/rok | bez odświeżania, wersje ważne 90 dni; potrzebny Mac lub budowanie w chmurze | jak B, plus możliwy iCloud |
2. **Sprawdzić wersję iPadOS:** Ustawienia → Ogólne → To urządzenie → Wersja iPadOS (decyduje, czy wchodzi w grę D).
3. **Włączyć GitHub Pages** (potrzebne dla opcji A i jako zapas): repo jest/ma być publiczne;
   *Settings → Pages → Deploy from a branch → `main` / `(root)`*. Adres: https://dododorota.github.io/BeadsDesigner/
4. **Przetestować etap 1 na prawdziwym iPadzie** — lista niżej w sekcji „Do sprawdzenia na prawdziwym iPadzie”.

Ustalenia z rozmowy: sam „Tryb dewelopera” nie wystarcza do sideloadu — aplikacja i tak musi być
podpisana certyfikatem Apple (darmowe Apple ID = 7 dni) i wgrana narzędziem (SideStore/AltStore/Xcode);
przełącznik pojawia się w Ustawieniach dopiero po wgraniu pierwszej takiej aplikacji.
Nie używamy płatnych „serwisów do podpisywania” ani cudzych certyfikatów firmowych.

### Od czego zaczynamy po decyzji

Pierwszy krok jest ten sam niezależnie od wybranej drogi:

1. ~~**Etap 1b — „Moje projekty” i bezpieczny zapis**~~ ✅ zrobione 2026-10-13 (szczegóły w dzienniku).
   W `js/storage.js` jest miejsce na drugi „backend” — pliki w Dokumentach dla aplikacji natywnej (Capacitor Filesystem).
2. **Jeśli wybrana droga B/C/D/E — etap 1c, aplikacja natywna:** opakowanie w Capacitor, budowanie
   niepodpisanego `.ipa` w GitHub Actions (macOS runner, darmowy dla publicznego repo), instrukcja
   instalacji krok po kroku dla wybranego narzędzia. Od Doroty: Apple ID, komputer z Windowsem
   (iTunes + iCloud z Microsoft Store) przy pierwszej konfiguracji.
3. **Potem etap 2 — ściegi płaskie i rurkowe** (szczegóły w planie niżej).

---

## Plan

| Etap | Co | Stan |
| --- | --- | --- |
| 1 | Katalog koralików (kształty i rozmiary Miyuki/Toho w palecie) + obsługa iPada | ✅ (czeka na sprawdzenie na prawdziwym iPadzie) |
| 1b | „Moje projekty”: wiele projektów, zapis w IndexedDB, zapis przy zamykaniu, eksport wszystkiego | ✅ |
| 1c | Aplikacja natywna na iPada (Capacitor + `.ipa` z GitHub Actions), jeśli wybrana droga B–E | ⏳ czeka na decyzję |
| 2 | Ściegi płaskie i rurkowe na wspólnym „silniku ściegów”: peyote, brick, herringbone (proste i skręcone), ladder, square/krosno, CRAW, PRAW-3…6; obecny wężyk szydełkowy też tu trafi | ⏳ |
| 3 | Naszyjnik z motywami: kwiatki (daisy chain), pętelki, perły i koraliki ozdobne między zwykłymi | ⏳ |
| 4 | Figurki w technice japońskiej (na krzyż): oczka z numerami, koraliki na krawędziach, instrukcja krok po kroku | ⏳ |
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
| Ściegi płaskie i rurkowe | ⏳ etap 2 |
| Naszyjnik z motywami | ⏳ etap 3 |
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
| Publikacja na GitHub Pages | ⏳ czeka na włączenie w ustawieniach repo |

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
| Pliki w Dokumentach iPada (aplikacja natywna) | ⏳ etap 1c |

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

Wymagany iPadOS 16.4 lub nowszy (import map w Safari).

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
- **Format pliku eksportu:** `{ format: "beadsdesigner-library", version: 1, exported, projects: [{ updated, project }] }`;
  pojedynczy projekt to sam obiekt projektu (`version: 2`). Oba mają rozszerzenie `.beads.json`.

---

## Dziennik

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
