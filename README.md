# Recipe App

### Team Members
Evan Crenshaw, 
Ruby Larson, 
Alex Hooper, 
EmilyRose Beck, 
Kyler Edwards (Landlord)

## Software Description

A recipe collection app designed to accept recipes shared from social media, store them, and allow the user to assign those meals to a calendar for the week.

### 
[Live Cloudflare server](https://cookmarked.edw20009.workers.dev/)
## Architecture
- **Platform:** PWA
- **Language:** TypeScript
- **Frameworks:** React with TypeScript and Vite
- **Data storage:** Supabase
- **Test framework:** ViTest
- **Development tools** Visual Studio Code, GitHub 

## Software Features

<!-- Sprint 2
* [ ] First feature here
* [ ] Second feature here
* [ ] Keep going ....
 -->

#### MVP capabilities

By the end of Sprint 5, users should be able to:

- Create recipes manually.
- Paste or share social URLs into the app.
- Automatically save the URL, platform, title, thumbnail, and description when available.
- Edit imported information and convert it into a recipe.
- Browse a large recipe library with pagination, search, and filters.
- Tag recipes as breakfast, lunch, dinner, or snack.
- View a weekly calendar.
- Assign, replace, and remove recipes from meal slots.
- Use the app comfortably on a phone and desktop.


#### 5 Sprint plan

| Sprint | Main milestone                  | Important work                                                                                                                                | Exit criterion                                                    |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1      | Foundation and risk validation  | Confirm MVP, wireframes, repository, database schema, authentication, deployment pipeline, test real social URLs and mobile sharing           | A deployed user can sign in and save a test recipe                |
| 2      | Recipe library                  | Recipe create/edit/delete, recipe detail page, tags, search, filtering, pagination, seed data                                                 | Users can manage and find recipes reliably                        |
| 3      | Social capture and import inbox | Paste URL, PWA share target, platform detection, metadata extraction, preview, deduplication, manual fallback, convert saved item into recipe | A shared public link appears in the inbox and can become a recipe |
| 4      | Weekly meal planner             | Week navigation, seven-day layout, meal slots, assign/change/remove recipes, mobile layout                                                    | Users can plan an entire week                                     |
| 5      | Production hardening            | End-to-end testing, permissions, security, accessibility, performance, error states, deployment, backups/export, documentation, beta feedback | A small group can use the app without developer assistance        |


## Team Communication
 - SMS
 - Outlook

## Team Responsibility

|Responsibility                      |Team Member(s)              |
|------------------------------------|----------------------------|
|Conducting Meetings                 |      Alex                  |
|Maintaining Team Assignment List    |     Ruby                   |
|Ensuring GitHub is Working          |          Kyler             |
|Maintaining Documentation           |      Evan                  |
|Create & Display Presentations      |        EmilyRose           |
|Submit Team Assignments             |          Evan              |
|Landlord                            |              Kyler         |

<!-- Final Sprint
## Reflections 
-->

## Authentication

Cookmarked uses username/password authentication. Usernames are case-insensitive,
contain 3–32 letters, digits, or underscores, and map to
`username@accounts.cookmarked.edw20009.workers.dev`. This namespace is permanent;
changing it requires an account migration. Passwords require at least 8 characters.
Registration signs the user in immediately. All app pages require a session;
registration and login are the only public screens. Password recovery is handled
manually by an administrator. The recipe library currently contains UI placeholders;
recipe storage and its owner policies will be implemented with that feature.

Credential rules run in the Supabase Edge Function business layer. Its data adapter
calls Supabase Auth. The browser data adapter invokes the function and lets the SDK
persist and refresh the session. React receives services from `src/main.tsx` and never
calls Supabase directly. `AuthUser.id` is the Auth UUID; the existing numeric
`User.id` remains the profile ID. The old `saveUser` path is not account registration.

### Supabase setup (required before the flow works)

1. Review the actual `public."Users"` schema, existing triggers/policies, and any
   recipe relationships before applying the migration. It assumes the existing
   numeric `user_id` and `username` columns described by our repository. Test in a
   development project first. Existing demo rows remain unlinked; existing Auth
   accounts need an explicit profile backfill if any exist.
2. Apply `supabase/migrations/202610070001_auth_profiles.sql`. It adds
   `auth_user_id`, creates profiles transactionally at signup, enforces canonical
   usernames, prevents identifier changes, and restricts profile reads to the
   owner. Browser profile writes are disabled. Legacy anonymous insert access
   through `saveUser` is intentionally removed. The migration does not modify
   recipe tables whose schemas are not tracked here.
3. In Supabase Authentication settings, enable email/password and new signups,
   disable Confirm Email, set minimum password length to 8, and disable unused
   providers and anonymous sign-ins.
4. In Auth Hooks, enable the **Send Email** hook and select the Postgres function
   `public.suppress_auth_email`. The function returns success without delivering
   mail. Disable authentication email security notifications as well. Keep email
   authentication enabled: disabling that provider disables password signup.
   The hook is necessary to suppress emails from direct recovery/OTP API calls,
   even though our UI never makes those calls. See [Send Email hook documentation](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook).
5. Set `AUTH_ALLOWED_ORIGINS` as a Supabase Edge Function secret to a comma-separated
   list of exact origins, e.g.
   `http://localhost:5173,https://cookmarked.edw20009.workers.dev`.
   Add exact preview origins if testing preview deployments. CORS controls browser
   access; it is not authentication. Configure Supabase Auth rate limits for this
   public credential endpoint.
6. Deploy the `auth` function. It deliberately has `verify_jwt = false`, because
   a user logging in has no JWT yet. Future recipe functions must validate the
   caller's JWT and use owner-scoped database access.

Using the Supabase CLI (requires project access):

```sh
pnpm dlx supabase login
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase db push
pnpm dlx supabase secrets set 'AUTH_ALLOWED_ORIGINS=http://localhost:5173,https://cookmarked.edw20009.workers.dev'
pnpm dlx supabase functions deploy auth
```

Configure settings/hooks through the dashboard separately; `db push` does not
activate the email hook or change hosted Auth settings. The Edge Function uses the
built-in `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables. It does not
need a privileged key for registration or login.

### Frontend and verification

Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.
For Cloudflare, supply those same variables to the process that runs `pnpm build`.
Vite embeds them at build time; Wrangler runtime `vars` do not provide Vite build
configuration. Never put a secret/service-role key in any `VITE_*` variable.

```sh
pnpm dev
pnpm test:run
pnpm test:db
pnpm lint
pnpm build
```

`pnpm test:run` runs deterministic business, HTTP adapter, and UI tests without
network access. `pnpm test:db` requires Bash and Docker and uses the official
`postgres:17` image (downloaded on the first run). It creates a dedicated container
with no network or published ports, uses temporary database storage, and removes
it on exit. It does not depend on another project's containers or images.
`supabase/tests/bootstrap.sql` provides minimal Auth tables/roles for PostgreSQL
integration tests; run it only in the disposable test database. These tests exercise
profile creation/rollback, username uniqueness, ownership policies, identifier
immutability, deletion, and the email hook. They do not emulate the Auth server.

After setup, verify in a development Supabase project: register, confirm immediate
sign-in, refresh, visit every page, sign out, sign in again, and try a duplicate
username and incorrect password. Verify two accounts cannot read each other's
profiles. Check Auth logs to confirm no emails are delivered, including a direct
recovery request. This hosted check is still required before production deployment.

For manual recovery, an authorized administrator verifies account ownership and
uses Supabase's server-side Admin API `updateUserById` to change the password for
the Auth UUID. Privileged credentials belong only in the administrator's secure
backend/tooling. Do not send recovery emails or change the internal identifier.
