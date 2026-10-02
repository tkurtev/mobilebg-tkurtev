# Database

PostgreSQL 16 with Drizzle ORM. The schema is defined in `src/db/schema/*.ts` and migrations are plain SQL in `src/db/migrations`.

## Workflow

```bash
# change src/db/schema/*.ts, then
pnpm db:generate     # writes a new SQL migration
pnpm db:migrate      # applies pending migrations (also used in production)
pnpm db:seed         # development data (refuses to run with NODE_ENV=production)
```

Migrations are applied by `src/db/migrate.ts` using the Drizzle migrator. The first migration enables `pg_trgm`. That extension is trusted, so the database owner can create it on Neon, Supabase and plain PostgreSQL.

Columns use `snake_case` in SQL and `camelCase` in TypeScript (Drizzle `casing: "snake_case"`).

## Conventions

- **Primary keys:** UUID everywhere. Listings also have `number`, a bigint identity starting at 10000001. It is the public identity in URLs (`/avtomobili/10000254-bmw-320d`), so changing a title never breaks a link.
- **Timestamps:** `timestamptz`, with `created_at` and `updated_at` on mutable tables.
- **Money:** integer cents (`price_cents`, `amount_cents`). Payments carry `currency = 'EUR'` with a check constraint.
- **Soft deletes:** listings use `status = 'ARCHIVED'` or `deleted_at`. Users and dealers use `deleted_at` and a status. Payments and moderation history are never deleted.

## Tables

| Area | Tables |
| --- | --- |
| Accounts | `users`, `profiles`, `sessions`, `accounts`, `verification_tokens` (Better Auth; password reset tokens use the `reset-password:` identifier prefix) |
| Locations | `regions` (28 Bulgarian oblasti), `cities` |
| Catalog | `categories` (each points to a code-defined attribute set), `vehicle_makes`, `vehicle_models` (with `vehicle_type`), `vehicle_generations` |
| Listings | `listings`, `listing_images`, `listing_attributes`, `listing_features`, `listing_price_history`, `listing_view_events` |
| Engagement | `favorites`, `recently_viewed`, `saved_searches` |
| Dealers | `dealers`, `dealer_members` (one dealer per user), `dealer_locations`, `dealer_opening_hours` |
| Messaging | `conversations` (unique per listing and buyer), `conversation_participants` (`last_read_at`, `archived_at`), `messages` |
| Moderation | `listing_reports` (one open report per user and listing), `moderation_actions`, `audit_logs` |
| Promotions | `payments` (demo provider records), `promotions` |
| System | `notifications`, `app_settings`, `rate_limits`, `dev_emails` (development mailbox) |

## Listings

`listings` holds the shared fields as typed, indexed columns: make, model, generation, year, mileage, fuel, gearbox, power, engine, drivetrain, body type, color, condition, region, city and price. Category-specific values are rows in `listing_attributes` with a text, numeric or boolean value. The attribute definitions live in `src/config/attribute-sets.ts`.

Search and card rendering use these denormalized columns:

- `cover_image_url` and `image_count`, so cards need no join.
- `favorite_count`, `view_count` and `inquiry_count`, maintained by the services.
- `vip_until`, `top_until` and `highlight_until`, mirrored from `promotions` for ranking.
- `sort_date`, the publish time; it moves to the present on a REFRESH promotion.
- `previous_price_cents`, for showing price reductions.
- `search_document`, plus the generated `search_vector` (`tsvector`).

Indexes cover the common filters: status and category with sort date, make and model, price, year, mileage, city, region, seller, dealer and expiry. There is a GIN index on `search_vector` and a trigram GIN index on `search_document`. Attribute and feature filters use the `(key, value)` indexes through `EXISTS`.

A listing is public when `status = 'ACTIVE'`, `deleted_at IS NULL` and `expires_at > now()`. Every public query uses `publicListingCondition()`.

## Views

`listing_view_events` stores at most one row per listing, viewer and day. The viewer is a salted SHA-256 hash of the user id, or of the IP and user agent, and the raw IP is never stored. `view_count` only increases when a new row is inserted. The maintenance cron deletes rows older than three days.
