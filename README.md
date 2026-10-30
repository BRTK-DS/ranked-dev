<div align="center">

# RANKED.DEV

### Compete. Code. Climb.

Nowoczesna platforma do rywalizacji programistycznej, która łączy rozwiązywanie zadań z systemem rankingowym znanym z gier competitive.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com/)

**Planowany adres:** `brtkmods.com/ranked-dev`

</div>

---

## O projekcie

RANKED.DEV zamienia klasyczne zadania programistyczne w szybką, angażującą rozgrywkę. Użytkownik wybiera wyzwanie, pisze rozwiązanie w edytorze przypominającym prawdziwe IDE, uruchamia testy i buduje swój profil poprzez XP, rating oraz kolejne rangi.

Interfejs został zaprojektowany z myślą o krótkich sesjach skupienia: minimum rozpraszaczy, natychmiastowy feedback i subtelne animacje reagujące na działania gracza.

## Najważniejsze funkcje

- konkurencyjny system XP, ratingu i rang,
- logowanie i rejestracja przez Supabase Auth,
- trwały profil oraz historia zgłoszeń,
- kolejka wyzwań o różnych poziomach trudności,
- Monaco Editor — silnik edytora używany również przez VS Code,
- kolorowanie składni, podpowiedzi, minimapa i automatyczne wcięcia,
- uruchamianie testów skrótem `Ctrl + Enter`,
- natychmiastowe wyniki testów i combo counter,
- responsywny, ciemny interfejs inspirowany platformami competitive,
- chroniony panel administratora do publikowania nowych zadań,
- Row Level Security i walidacja uprawnień po stronie serwera,
- pełna obsługa działania pod ścieżką `/ranked-dev`.

## Edytor kodu

Wbudowany edytor oferuje doświadczenie zbliżone do desktopowego IDE:

- kolorowanie składni JavaScript,
- numery i podświetlanie aktywnej linii,
- automatyczne domykanie oraz kolorowanie par nawiasów,
- inteligentne podpowiedzi,
- minimapę kodu,
- formatowanie przy wklejaniu,
- płynny kursor i przewijanie,
- obsługę skrótów klawiszowych.

## Stack technologiczny

| Obszar | Technologia |
|---|---|
| Framework | Next.js 16, App Router |
| Język | TypeScript, React 19 |
| Interfejs | Tailwind CSS, komponenty w stylu shadcn/ui |
| Animacje | Framer Motion |
| Edytor | Monaco Editor |
| Auth i baza | Supabase Auth, PostgreSQL |
| Bezpieczeństwo | RLS, bearer JWT, server-only service role |
| Hosting | Vercel + Supabase Free |

## Architektura

```text
app/
├── page.tsx                       # główna arena
├── auth/page.tsx                  # logowanie i rejestracja
├── admin/page.tsx                 # panel administratora
└── api/
    ├── submissions/route.ts       # bezpieczna kolejka zgłoszeń
    └── admin/challenges/route.ts  # publikowanie zadań

components/
├── arena.tsx                      # interfejs rozgrywki
├── code-editor.tsx                # Monaco Editor
├── auth-provider.tsx              # stan sesji użytkownika
└── ui/                            # komponenty interfejsu

lib/
├── supabase/                      # klient browser/server
├── server-auth.ts                 # walidacja JWT i admina
└── types.ts                       # typy domenowe

supabase/
└── schema.sql                     # tabele, RLS, triggery i system XP
```

## Bezpieczeństwo

RANKED.DEV nie ufa wynikom przesyłanym przez przeglądarkę.

- Sesja użytkownika jest przechowywana w `sessionStorage`, a nie w podatnym na odczyt trwałym cookie.
- Każde chronione żądanie API przesyła bearer token weryfikowany przez Supabase Auth.
- Panel administratora wymaga `is_admin = true`, sprawdzanego ponownie na backendzie.
- Klucz `SUPABASE_SERVICE_ROLE_KEY` jest importowany wyłącznie w kodzie serwerowym.
- RLS ogranicza dostęp użytkownika do jego własnych danych.
- Publiczne testy zapewniają szybki feedback, ale nie przyznają samodzielnie XP.
- Zgłoszenia trafiają do kolejki jako `queued`; wynik powinien finalizować zaufany, izolowany judge.

## Uruchomienie lokalne

### 1. Pobierz projekt

```bash
git clone https://github.com/TWOJ_LOGIN/ranked-dev.git
cd ranked-dev
npm install
```

### 2. Skonfiguruj środowisko

Skopiuj `.env.example` jako `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

### 3. Przygotuj Supabase

Uruchom zawartość `supabase/schema.sql` w Supabase SQL Editor.

### 4. Włącz aplikację

```bash
npm run dev
```

Otwórz:

```text
http://localhost:3000/ranked-dev
```

## Konto administratora

Po utworzeniu konta skopiuj UUID użytkownika z Supabase Auth i wykonaj:

```sql
update public.profiles
set is_admin = true
where id = 'UUID-UZYTKOWNIKA';
```

Panel administratora będzie dostępny pod `/ranked-dev/admin`.

## Skrypty

```bash
npm run dev        # lokalny serwer deweloperski
npm run build      # produkcyjna kompilacja
npm run start      # uruchomienie produkcyjnego buildu
npm run typecheck  # kontrola TypeScript
```

## Deployment

Projekt jest gotowy do darmowego wdrożenia na Vercelu:

1. umieść repozytorium na GitHubie,
2. zaimportuj je do Vercela,
3. dodaj trzy zmienne środowiskowe,
4. uruchom `supabase/schema.sql`,
5. wdrożenie pojawi się pod `/ranked-dev`.

Jeżeli `brtkmods.com` obsługuje również inne treści, ścieżkę `/ranked-dev/*` należy przekierować do deploymentu przez Vercel Rewrite albo Cloudflare Worker.

## Status projektu

Projekt znajduje się w aktywnym rozwoju. Aktualna wersja zawiera kompletny interfejs areny, autoryzację, bazę danych, panel administratora i bezpieczną kolejkę zgłoszeń. Kolejnym etapem jest podłączenie izolowanego judge'a wykonującego kod użytkowników.

## Licencja

Projekt prywatny / edukacyjny. Przed publiczną dystrybucją dodaj wybraną licencję, np. MIT.

---

<div align="center">

**Built for developers who want more than another boring coding exercise.**

</div>
