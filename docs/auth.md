# Authentication and authorization

## Authentication

[Better Auth](https://better-auth.com) with the Drizzle adapter (`src/server/auth/auth.ts`). Requests are handled by `src/app/api/auth/[...all]/route.ts`. Forms use the Better Auth React client (`src/lib/auth-client.ts`).

| Flow | Behaviour |
| --- | --- |
| Registration | Name, email and password. The password needs at least 8 characters with a letter and a digit. A verification email is sent. Registering with an existing email returns the same response, so accounts cannot be enumerated. |
| Email verification | Required before the first login (`requireEmailVerification`). The link expires after 24 h and signs the user in on success (`/potvarzhdenie`). Signing in unverified sends a new link. |
| Login / logout | Sessions are stored in the database (30 days, refreshed daily) behind an HttpOnly, SameSite=Lax cookie (`mobited.session_token`). |
| Forgot password | `/zabravena-parola` always shows the same message. The reset link is valid for 1 hour. `/nova-parola` sets the new password and revokes all other sessions. |
| Password change | Under Настройки, with the current password. Other sessions are revoked. |
| Sessions | Настройки lists active sessions by device, IP and last activity, and can end any or all others. Session tokens never reach the browser in that list. |
| Account deletion | Soft delete: the account is disabled, the user's listings are archived and every session is removed. |
| Suspension | A session cannot be created for suspended or deleted users (`databaseHooks.session.create.before`). Admin suspension deletes existing sessions. |

Passwords are hashed with scrypt (Better Auth default). User IDs are UUIDs (`advanced.database.generateId = "uuid"`).

The extra user fields `role` and `status` are declared with `input: false`, so they can never be set through sign-up or profile updates.

Emails go through `src/server/email`. They use Resend when `RESEND_API_KEY` is set. Otherwise they are logged and, outside production, saved to the development mailbox at `/dev/poshta`.

`MOBITED_SKIP_EMAIL_VERIFICATION=1` is for deployments without an email provider yet. Verification is not required or sent, and `databaseHooks.user.create.before` stores new accounts as verified, so features that check `emailVerified` (messages, dealer registration) work for them. Those accounts stay verified after the flag is removed.

## Authorization

Every rule lives on the server. `src/server/auth/session.ts` loads the session and a fresh user row on each request, so role and suspension changes apply immediately. It provides:

- `getCurrentUser()`: the user or `null`.
- `requireUser(returnTo)` and `requirePermission(permission)`: for pages. They redirect to login or render the 403 page.
- `requireActionUser()` and `requireActionPermission()`: for server actions and route handlers. They throw `AppError`, which becomes a structured `ActionResult`.

`src/server/auth/policies.ts` holds pure, unit-tested rules:

| Rule | Meaning |
| --- | --- |
| `can(actor, permission)` | Staff permission matrix (see docs/admin.md) |
| `canManageListing` | Seller, or any member of the listing's dealer |
| `canViewListing` | Active listings are public. Sold listings stay reachable by URL. Other statuses are visible to the owner and to moderators only. |
| `canAssignRole` | Admins assign roles up to MODERATOR and cannot touch other admins. Only super admins grant ADMIN or SUPER_ADMIN. Nobody changes their own role. |
| `canSuspendUser` | Only accounts with a lower staff level |
| `canManageDealer` | Dealer owners, or staff with `dealers.manage` |

Records are always loaded by id and then checked against the actor, so requests for someone else's resources get "not found" (IDOR protection).

## Other protections

- **CSRF:** server actions check the Origin header (Next.js). Better Auth validates origins against `trustedOrigins`. Route handlers that change state (`/api/obiavi/*`, `/api/dilari/logo`) reject cross-site requests (`isSameOrigin`).
- **Rate limiting** (`src/server/rate-limit.ts`, a Postgres fixed window) applies to:
  - sign-in, sign-up, password reset and verification resend (Better Auth custom rules);
  - messages and new conversations;
  - listing creation, image uploads and reports;
  - saved searches, phone reveal, checkout and adding dealer members.
- **Input:** every action validates with Zod. Listing fields are whitelisted (`listingValuesSchema` drops unknown keys). Free text is stored as plain text with tags and control characters removed, and React escapes it on render.
- **Uploads:** the file signature is checked and the size limited. `sharp` re-encodes every image to WebP, which also strips EXIF and GPS data. Files go to object storage, never to the database.
- **Headers:** `nosniff`, a strict referrer policy, `frame-ancestors 'none'` and a restrictive permissions policy (`next.config.ts`).
