# Architecture

MobiTed is a single Next.js application (App Router) backed by PostgreSQL. It is built to run on Vercel without extra infrastructure: server rendering and route handlers run as Vercel Functions, data lives in a managed Postgres (Neon, Supabase or any Vercel-supported provider) and images in Vercel Blob.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16, React 19, TypeScript strict | Server Components by default, Server Actions for mutations |
| Database | PostgreSQL 16 + Drizzle ORM | SQL-first, small runtime, typed queries, plain SQL migrations |
| Auth | Better Auth (email and password) | Sessions in Postgres, email verification, password reset, rate limiting |
| Styling | Tailwind CSS 4 with tokens in `src/styles/globals.css` | One place for colors, radius, shadows |
| Forms | React Hook Form + Zod | Same schemas validate on the client and the server |
| Images | Vercel Blob, `sharp` for validation and resizing | No local disk in production |
| Search | Postgres full text (`tsvector`) and `pg_trgm` | No separate search cluster for an MVP to medium-size marketplace |

Drizzle was chosen over Prisma because it has no query engine binary, starts fast in serverless functions and keeps full control over SQL (generated columns, GIN indexes, partial unique indexes).

## Source layout

```
src/
  app/            Routes only. Pages stay thin and call feature modules.
  components/     Shared UI primitives (ui/) and the site shell (layout/).
  features/       Domain modules: queries, services, server actions and components.
  server/         Cross-cutting server code: auth, policies, rate limiting, storage, email, audit.
  db/             Drizzle schema, migrations, seed.
  config/         Static domain configuration: categories, attribute sets, options, features, promotions.
  lib/            Pure helpers: money, phone, slugs, formatting, text sanitizing.
  validation/     Shared Zod schemas.
  emails/         Email templates.
  styles/         Global CSS and design tokens.
```

Inside a feature module the conventions are:

- `queries.ts` (server-only reads), `service.ts` (server-only business logic), `actions.ts` (`"use server"` entry points), `components/` (UI).
- Server actions are thin: authenticate with `requireActionUser()` / `requireActionPermission()`, validate with Zod via `parseInput`, call a service, wrap everything in `runAction()` which returns an `ActionResult`.
- Pages call `requireUser(returnTo)` or `requirePermission(permission)` and render `notFound()` / `forbidden()` when needed.

## Data model highlights

- All primary keys are UUIDs. Listings also have a sequential public `number` used in URLs (`/avtomobili/10000254-bmw-320d`); the slug part is cosmetic and redirects to the canonical form.
- Category-specific data uses an attribute system instead of a wide table. Common vehicle fields that drive the main filters (make, model, year, mileage, fuel, gearbox, power, body type...) are indexed columns on `listings`. Everything else lives in `listing_attributes` (key, text, number or boolean value), defined per attribute set in `src/config/attribute-sets.ts`. Categories reference an attribute set, so admins can add categories without schema changes.
- Features (ABS, navigation...) are defined once in `src/config/features.ts` and stored as keys in `listing_features`.
- Prices are stored as integer cents (`price_cents`). All currency is EUR. Never use floats for money; see `src/lib/money.ts`.
- Listing status lifecycle and every transition live in `src/features/listings/service.ts`. Moderator transitions write `moderation_actions`, `audit_logs` and a seller notification in one transaction.
- Soft deletes: listings are archived (`status = ARCHIVED`) or soft deleted (`deleted_at`), users and dealers have `deleted_at`/status flags.

## Search

`listings.search_document` holds title, make, model, city, region and dealer names (plus a Latin transliteration). A generated `search_vector` column (`to_tsvector('simple', ...)`) has a GIN index; free text becomes a prefix `tsquery`. A trigram index on the same text supports fuzzy lookups. Structured filters map to indexed columns or `EXISTS` subqueries on attributes and features. Promoted listings are ranked first (VIP, then TOP), then the selected sort.

The search layer (`src/features/search`) is isolated so that a dedicated engine can replace the SQL builder later without touching pages.

Filter state lives in the URL (`/avtomobili?make=bmw&model=3-series&fuel=diesel&priceTo=25000`). `parseSearchParams` whitelists and clamps every value; `serializeSearch` produces the canonical query string.

## Authorization

`src/server/auth/policies.ts` contains pure functions (`can`, `canManageListing`, `canViewListing`, `canAssignRole`...). They are unit tested and used by every server action, route handler and page. UI visibility is never treated as authorization.

Role levels: `USER` and `DEALER` are regular accounts, `MODERATOR` < `ADMIN` < `SUPER_ADMIN` for staff permissions. Dealer listings can be managed by any member of that dealer.

## Rate limiting

`src/server/rate-limit.ts` implements an atomic fixed-window counter in Postgres (`rate_limits` table). It works across serverless instances with no extra service. Better Auth uses the same storage through `customStorage`. Replace the implementation with Redis/Upstash later by keeping the `consumeRateLimit` signature.

## Background work

There are no long-running processes. `/api/cron/maintenance` expires listings and promotions and cleans old rate-limit and view rows. It is scheduled with Vercel Cron (`vercel.json`) and can be called manually in development. Public queries never rely on the cron: expired listings are filtered by `expires_at` at read time.

## Caching

Pages that depend on the session render dynamically. Reference data (categories, makes, models, regions, cities, settings) and homepage aggregates are cached with `unstable_cache` and tagged so admin changes invalidate them. Private data is never cached publicly.

## Design rules

- Copy is concise Bulgarian. No eyebrow labels, marketing slogans, fake statistics or decorative gradients.
- Never use the long dash character. Use a hyphen. `pnpm lint` enforces this (`scripts/check-dashes.mjs`).
- Restrained radius (4 to 8 px), subtle borders, one brand color (`brand`), amber only for paid promotions.
- Status is shown with a small dot and text (`StatusLabel`), not colored pills.

## Product decisions and assumptions

- **Moderation:** new listings go live immediately (`moderationMode = post`). Moderators act on reports, and super admins can switch to pre-moderation in `/admin/settings`. A listing that was rejected always goes back through review.
- **Email verification:** required before the first login. Signing in without it sends a new link.
- **Listing lifetime:** listings expire after 60 days (configurable). Owners renew them with one click. Expired listings are hidden at read time, and the daily cron marks them `EXPIRED`.
- **Phone numbers:** shown after a click on "Покажи" (rate limited per IP) to make scraping harder. Emails are never shown.
- **Dealers:** one dealer per user. Every member of a dealer can manage its listings; owners manage the dealer profile and team.
- **Locations:** a listing references `region_id` and `city_id` directly instead of a separate location table. Every listing is in Bulgaria, so there is no country.
- **Messaging:** messages update by polling every 8 seconds instead of WebSockets, which keeps it compatible with Vercel Functions. Dealer listings send messages to the member who created the listing.
- **Seed photos:** seed listings use generated SVG illustrations (`/media/demo/*`), so the repository contains no third-party photos. Real listings use uploaded photos.
- **Price drops:** cards show the previous price struck through only when the price went down. The listing page shows the full history as `old -> new`.
