# Administration and moderation

The internal area lives under `/admin` (English routes, Bulgarian UI). It has its own shell (`src/app/admin/layout.tsx`), is marked `noindex`, and is not part of the `(site)` route group. Code lives in `src/features/admin`:

| Folder | Contents |
| --- | --- |
| `queries/` | Server-only reads for each section (listings, reports, users, dealers, categories, taxonomy, payments, audit, settings) |
| `actions/` | `"use server"` entry points. Each one calls `requireActionPermission`, validates with Zod, writes an audit entry and invalidates caches |
| `components/` | Shared table and filter primitives (`AdminTable`, `FilterBar`, `FilterField`, `DetailList`, `AuditTable`) and the interactive controls |
| `schemas.ts` | Zod schemas shared by forms and actions |
| `moderation.ts`, `labels.ts`, `nav.ts`, `params.ts` | Pure helpers: allowed moderation actions per status, Bulgarian labels, navigation, search param parsing |

## Roles and permissions

Permissions are defined in `src/server/auth/policies.ts`. The layout requires `admin.access`; every page and every server action checks its own permission again. Navigation items the role cannot use are hidden, and opening them directly returns 403.

| Permission | Section | MODERATOR | ADMIN | SUPER_ADMIN |
| --- | --- | :---: | :---: | :---: |
| `admin.access` | Табло (`/admin`) | yes | yes | yes |
| `listings.moderate` | Обяви (`/admin/listings`) | yes | yes | yes |
| `reports.manage` | Сигнали (`/admin/reports`) | yes | yes | yes |
| `users.view` | Потребители (`/admin/users`) | yes | yes | yes |
| `users.suspend` | Спиране и възстановяване на потребители | | yes | yes |
| `users.changeRole` | Смяна на роля | | yes | yes |
| `dealers.manage` | Дилъри (`/admin/dealers`) | | yes | yes |
| `categories.manage` | Категории (`/admin/categories`) | | yes | yes |
| `taxonomy.manage` | Марки и модели (`/admin/vehicle-data`) | | yes | yes |
| `payments.view` | Плащания (`/admin/payments`) | | yes | yes |
| `audit.view` | Одит (`/admin/audit`) | | yes | yes |
| `settings.manage` | Настройки (`/admin/settings`) | | | yes |

Extra rules on top of the matrix:

- `canAssignRole`: nobody changes their own role; an ADMIN assigns roles up to MODERATOR and cannot change other admins; only a SUPER_ADMIN grants or revokes ADMIN and SUPER_ADMIN.
- `canSuspendUser`: nobody suspends themselves, and only a higher staff level can suspend a user.
- Changing a role to or from DEALER does not create or remove dealer records. Dealers are created from the user's profile and membership is managed there.

## Moderation flow

All listing status changes made by staff go through `moderateListing` in `src/features/listings/service.ts`, which in one transaction updates the listing, writes `moderation_actions`, writes `audit_logs` and notifies the seller.

| Action | Allowed from | Result | Reason |
| --- | --- | --- | --- |
| Одобри | PENDING | ACTIVE | optional |
| Възстанови | PAUSED, REJECTED, ARCHIVED, EXPIRED | ACTIVE (lock cleared, expiry extended if needed) | optional |
| Паузирай | ACTIVE | PAUSED, `moderation_lock` set so the owner cannot reactivate it | required |
| Откажи | PENDING, ACTIVE, PAUSED | REJECTED with the reason shown to the seller | required |
| Архивирай | everything except ARCHIVED | ARCHIVED, promotions cleared | optional, with confirmation |

The listing page `/admin/listings/[id]` shows only the actions valid for the current status, plus images, specs, seller, dealer, reports and the full moderation history. The admin UI mirrors the allowed transitions in `src/features/admin/moderation.ts`; the service re-checks them.

In pre-moderation mode (see settings) new listings arrive as PENDING. The dashboard lists the five that waited longest.

## Reports

Users report listings from the public listing page. `/admin/reports` shows open reports first (oldest first) and can filter by status and reason. For each open report:

- **Отхвърли сигнала**: `dismissReport` marks it DISMISSED and records a `DISMISS_REPORT` moderation action and a `report.dismiss` audit entry. The listing is unchanged.
- **Паузирай обявата** / **Откажи обявата**: runs `moderateListing` with the report id, so the report becomes RESOLVED in the same transaction.
- **Отвори обявата**: opens `/admin/listings/[id]?report=<id>`. The report is highlighted there and any moderation action taken on that page resolves it.

## Users and dealers

- Suspending a user sets `users.status = SUSPENDED`, `suspended_at`, `suspension_reason` and deletes all of the user's `sessions` rows, so the user is signed out immediately. Better Auth refuses new sessions for suspended users. Unsuspending clears those fields; listings are not changed.
- Dealer edits (name, contacts, address, description, region and city) and suspend/restore invalidate the `dealers` and `listings:aggregates` cache tags. A suspended dealer disappears from public dealer pages and its members lose access to the dealer panel. Renaming a dealer refreshes the search document of its listings.

## Catalog data

- Categories can be created, edited and deactivated. There is no delete: categories with listings must stay, so they are only deactivated. Slugs must match `^[a-z0-9-]+$`, be unique and not collide with top-level routes. Changing a slug changes the category URL and all listing URLs in it.
- Makes and models can be created, renamed (name and slug) and activated/deactivated. Renaming refreshes the search documents of affected listings. Generations can be created, edited and deleted; a generation referenced by any listing cannot be deleted.
- Catalog changes call `updateTag` for `catalog:categories` or `catalog:taxonomy` so cached menus and filters update immediately.

## Payments

`/admin/payments` lists demo payments with filters for status, promotion type and date range (Sofia time), and shows the count and sum for the filtered set. The only provider is `DEMO`; no card data exists anywhere in the system.

## Audit log

Every admin action writes to `audit_logs` through `recordAudit` (`src/server/audit.ts`): actor, action (for example `user.role_change`, `listing.pause`, `category.update`, `taxonomy.generation_delete`, `settings.update`), target type and id, and a small metadata object. Metadata never contains secrets. `/admin/audit` filters by action, actor email and target type, and links targets to their admin pages. User pages show the last 20 entries about the user.

## Settings

`/admin/settings` (SUPER_ADMIN only) edits the `app_settings` rows:

| Key | Meaning | Range |
| --- | --- | --- |
| `listingDurationDays` | How long a published listing stays active | 7 to 365 |
| `moderationMode` | `post`: publish immediately, review on report. `pre`: review before publishing | `post`, `pre` |
| `maxImagesPerListing` | Upload limit per listing | 1 to 40 |

Values are validated with `settingsSchema`, upserted with `updated_by_id`, the `app-settings` cache tag is invalidated and a `settings.update` audit entry records the changed keys and new values.

## Granting the first admin

There is no sign-up path to a staff role. Register a normal account, verify the email, then promote it directly in the database:

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
```

The change applies on the next request because the session loader reads the role from the database every time. Further roles are then assigned from `/admin/users/[id]`.

In development the seed creates `superadmin@`, `admin@` and `moderator@mobited.local` (password `MobiTed123!`).
