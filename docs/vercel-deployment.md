# Deploying to Vercel

MobiTed runs on Vercel as a standard Next.js project. It needs a PostgreSQL database and a Vercel Blob store. Payments need no configuration.

## 1. Create the Vercel project

1. Push the repository to GitHub.
2. In Vercel choose **Add New... -> Project** and import the repository.
3. Framework preset: **Next.js**. Keep the install command (`pnpm install`). Node.js 22.x is recommended. `vercel.json` sets the build command to `pnpm db:setup && pnpm build` (see step 5).

## 2. Configure PostgreSQL

Use any Vercel-compatible provider, for example **Neon** (Vercel Marketplace -> Neon) or Supabase.

1. Create a database in the EU region closest to your Vercel functions (for example Frankfurt).
2. Copy the **pooled** connection string. The client uses `prepare: false`, so transaction-mode poolers (Neon pooler, Supabase Supavisor) work.
3. In the Vercel project add `DATABASE_URL` for Production and Preview. With the Neon integration it is added automatically.

## 3. Configure Blob storage

1. Vercel project -> **Storage** -> **Create Database** -> **Blob**, and connect it to the project.
2. This adds `BLOB_READ_WRITE_TOKEN` to the project environment.

## 4. Configure secrets

| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` (required) |
| `CRON_SECRET` | another random string (recommended; protects the daily maintenance job) |
| `APP_URL` | your production URL, for example `https://mobited.bg` (optional; derived from the Vercel URL otherwise) |
| `RESEND_API_KEY`, `EMAIL_FROM` | for real email delivery |
| `MOBITED_SKIP_EMAIL_VERIFICATION` | `1` until an email provider is configured (optional) |

Without `RESEND_API_KEY`, verification and password reset emails are only written to the function logs, so nobody can confirm a new account. Until you add a provider, set `MOBITED_SKIP_EMAIL_VERIFICATION=1`: new accounts are created as verified and sign in right away. Anyone can then register with an address they do not own, and accounts created this way stay verified after you remove the flag. Password reset still needs an email provider.

## 5. Database setup on every deploy

The build command runs `pnpm db:setup` before `next build`. It:

- applies pending migrations (using `DATABASE_URL_UNPOOLED` when Neon provides it, otherwise `DATABASE_URL`);
- fills the reference tables when they are empty: regions and cities, the 12 categories, makes, models and generations;
- adds settings that do not exist yet.

It never changes users, listings or anything an admin already edited, so it is safe on every deploy. A concurrent build waits for the other one through an advisory lock. You can also run it by hand:

```bash
DATABASE_URL="<production url>" pnpm db:setup
```

Do not run `pnpm db:seed` in production. It deletes all data, creates development accounts with a known password and refuses to run when `NODE_ENV=production`.

To create the first super admin, register normally, then run:

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
```

## 6. Deploy

Push to the production branch or click **Deploy**. `vercel.json` registers a daily cron for `/api/cron/maintenance`, which:

- expires listings;
- cleans up rate limit and view rows;
- sends saved-search notifications.

Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

## 7. Verify the deployment

1. Open the homepage and a category page (`/avtomobili`).
2. Register an account. The verification email should arrive, or appear in the logs without an email provider.
3. Publish a listing with photos. The image URLs should point to `*.public.blob.vercel-storage.com`.
4. Open `/robots.txt` and `/sitemap.xml`.
5. As a super admin, open `/admin` and `/admin/settings`.
6. Promote a listing with the demo checkout. The payment appears in `/admin/payments` with provider DEMO.
7. Call the maintenance endpoint: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/maintenance`.

## Notes

- **Serverless model:** all server code runs in Vercel Functions. There is no custom server, no WebSocket server and no local disk usage. Messaging updates by polling.
- **Database connections:** each function instance keeps a small connection pool (`max: 5`). Use the pooled connection string so connections are shared across instances.
- **Images:** uploads are resized on the server before they reach Blob, so `next/image` optimization is not used for listing photos.
