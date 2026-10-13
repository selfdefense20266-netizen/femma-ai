# Security lockdown – deploy notes (2026-10-14)

Project ref: `toxynqgahykpzsbsmpqz`. Run all commands from `D:\femmi\femma-ai` (the folder that contains `supabase/`).

## 1. Secrets to set (before deploying functions)

| Secret | Used by | Value |
| --- | --- | --- |
| `REVENUECAT_WEBHOOK_SECRET` | revenuecat-webhook | Any long random string. Put the same value in RevenueCat → Integrations → Webhooks → "Authorization header value" (send it as `Bearer <secret>` or the raw value). **Now required**: without it the webhook returns 500. |
| `MUX_WEBHOOK_SECRET` | mux-webhook | Mux Dashboard → Settings → Webhooks → your endpoint → "Signing secret". **Now required**: without it the webhook returns 500. (Fallback: row `app_secrets.id = 'mux_webhook_secret'`.) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

```sh
supabase secrets set --project-ref toxynqgahykpzsbsmpqz REVENUECAT_WEBHOOK_SECRET=<random-secret>
supabase secrets set --project-ref toxynqgahykpzsbsmpqz MUX_WEBHOOK_SECRET=<mux-signing-secret>
```

## 2. Migrations to apply

- `20261014000000_lock_down_rls.sql` (new) – replaces all `using (true)` policies, adds `owns_member()`,
  the `members_guard_privileged_columns` trigger, admin-only thumbnails storage writes, and
  guarded `create table if not exists` for `member_plans`, `member_progress`, `member_diet_plans`.
- Any earlier migration not yet applied on the live DB (the live DB is known to be missing
  `member_plans`, i.e. `20260829010000/020000/030000`). `db push` applies everything pending.

```sh
supabase link --project-ref toxynqgahykpzsbsmpqz
supabase migration list            # check which migrations are pending on remote
supabase db push --dry-run         # review
supabase db push
```

If the remote migration history is out of sync (migrations were applied by hand in the SQL editor),
paste `migrations/20261014000000_lock_down_rls.sql` into the SQL editor instead – it is idempotent and self-sufficient.

Important: make sure the admin panel user(s) exist in `public.admin_users` with `is_active = true`
**before** applying – after this migration only those users can write content, members, plans,
notifications, settings and thumbnails.

## 3. Functions to deploy

`verify_jwt` is configured in `supabase/config.toml` (and per-function `config.toml`).

```sh
# logged-in user endpoints (verify_jwt = true + getUser() check in code)
supabase functions deploy openai-coach        --project-ref toxynqgahykpzsbsmpqz
supabase functions deploy openai-course-plan  --project-ref toxynqgahykpzsbsmpqz
supabase functions deploy openai-diet-plan    --project-ref toxynqgahykpzsbsmpqz
supabase functions deploy openai-meal-plan    --project-ref toxynqgahykpzsbsmpqz
supabase functions deploy openai-meal-scan    --project-ref toxynqgahykpzsbsmpqz
supabase functions deploy delete-account      --project-ref toxynqgahykpzsbsmpqz   # new

# public endpoints (verify_jwt = false, own auth)
supabase functions deploy app-signup          --project-ref toxynqgahykpzsbsmpqz --no-verify-jwt
supabase functions deploy revenuecat-webhook  --project-ref toxynqgahykpzsbsmpqz --no-verify-jwt
supabase functions deploy mux-webhook         --project-ref toxynqgahykpzsbsmpqz --no-verify-jwt
```

All `openai-*` and `delete-account` import `functions/_shared/auth.ts`; the CLI bundles it automatically.

## 4. Post-deploy smoke checks

- anon key: `GET /rest/v1/members` → `[]`; `PATCH /rest/v1/courses` → 0 rows / 401-403.
- anon key: `POST /functions/v1/openai-coach` → 401.
- `POST /functions/v1/app-signup` with an existing email → 409.
- RevenueCat "Send test event" → 200; Mux test webhook → 200 (401 means wrong secret).
