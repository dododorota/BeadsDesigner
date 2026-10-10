# Postęp prac — Beads Designer

Ten plik to dziennik projektu: co już działa, co jest w planie i jakie decyzje podjęliśmy.
Aktualizujemy go przy każdym etapie pracy (checkpoint), najnowsze wpisy są na górze.

**Legenda:** ✅ gotowe · 🔧 w trakcie · ⏳ zaplanowane · 💡 pomysł na później

---

## Plan

| Etap | Co | Stan |
| --- | --- | --- |
| 1 | Katalog koralików (kształty i rozmiary Miyuki/Toho w palecie) + obsługa iPada | ✅ (czeka na sprawdzenie na prawdziwym iPadzie) |
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
| Autozapis w przeglądarce, pliki `.beads.json`, eksport PNG schematu i podglądu | ✅ |
| Stare pliki (jeden rozmiar dla projektu) wczytują się poprawnie | ✅ |

---

## Do sprawdzenia na prawdziwym iPadzie

Gesty były testowane w Chrome symulowanymi zdarzeniami dotyku i rysika. Na urządzeniu trzeba jeszcze potwierdzić:

- [ ] szczypanie i przesuwanie są płynne, a Safari nie przybliża przy tym całej strony
- [ ] przytrzymanie palca nie otwiera systemowego menu
- [ ] Apple Pencil maluje od razu, palec przesuwa
- [ ] „Zapisz plik” zapisuje do aplikacji Pliki, „Otwórz” widzi pliki `.beads.json`
- [ ] instalacja przez Udostępnij → Do ekranu początkowego; ikona i pełny ekran
- [ ] po instalacji aplikacja otwiera się w trybie samolotowym

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

---

## Dziennik

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
