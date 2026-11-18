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

| Responsibility                   | Team Member(s) |
| -------------------------------- | -------------- |
| Conducting Meetings              | Alex           |
| Maintaining Team Assignment List | Ruby           |
| Ensuring GitHub is Working       | Kyler          |
| Maintaining Documentation        | Evan           |
| Create & Display Presentations   | EmilyRose      |
| Submit Team Assignments          | Evan           |
| Landlord                         | Kyler          |

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
manually by an administrator. The recipe library reads through the `recipes` Edge Function;
the recipe-add form saves through the `recipes_save` Edge Function with owner-scoped RLS.
The profile's `first_name` is an editable display name and is separate from the
permanent username. Users continue to sign in with their original username; direct
user-facing references use `first_name` when it is set and fall back to the username.

Credential rules run in the Supabase Edge Function business layer. Its data adapter
calls Supabase Auth. The browser data adapter invokes the function and lets the SDK
persist and refresh the session. React receives services from `src/main.tsx` and never
calls Supabase directly. `AuthUser.id` is the Auth UUID; the existing numeric
`User.id` remains the profile ID. The old `saveUser` path is not account registration.

### Supabase setup (required before the flow works)

1. Review the actual `public.profile` schema, existing triggers/policies, and any
   recipe relationships before applying the migration. It assumes the existing
   numeric `user_id` and `username` columns described by our repository. Test in a
   development project first. Existing demo rows remain unlinked; existing Auth
   accounts need an explicit profile backfill if any exist.
2. Apply the migrations in order, including
   `supabase/migrations/202610140001_replace_users_with_profile.sql`. The first
   migration adds
   `auth_user_id`, creates profiles transactionally at signup, enforces canonical
   usernames, prevents identifier changes, and restricts profile reads to the
   owner. The follow-up profile migration adds the owner-editable `first_name`
   column; browser writes remain limited to that column. Legacy anonymous insert access
   through `saveUser` is intentionally removed. The migration does not modify
   recipe tables whose schemas are not tracked here. The follow-up migration
   repairs Dev projects where the original migration was already marked applied:
   it isolates the old `public."Users"` table and rebuilds the profile trigger
   and policies.
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
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
pnpm exec supabase secrets set 'AUTH_ALLOWED_ORIGINS=http://localhost:5173,https://cookmarked.edw20009.workers.dev'
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF pnpm deploy:functions
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

## Validation and releases

Use Node 24, pnpm 10.17.1, and [Deno 2.5.6](https://github.com/denoland/deno/releases/tag/v2.5.6)
on your PATH. Database tests also require Bash and Docker. No Supabase credentials
are needed for these local checks:

```sh
pnpm run check
pnpm run test:db
```

`check` runs frontend TypeScript, Deno checks for every Edge Function with its own
import map, lint, all Vitest tests, and the production build. Deno uses a frozen
`supabase/functions/deno.lock`; keep its v4 format compatible with older Edge Runtime
deployments when updating dependencies. See [Deno lockfiles](https://docs.deno.com/runtime/packages/)
and [Supabase dependency configuration](https://supabase.com/docs/guides/functions/dependencies).
The database suite starts a disposable PostgreSQL container without network access,
applies migrations to the supplied hosted schema fixture, and tests ownership,
conversion rollback, retries, and simultaneous conversion requests.

`.github/workflows/check.yml` runs these checks on pull requests and pushes to main.
Configure the workflow's `check` job as a required check in GitHub branch protection;
adding the workflow alone does not prevent merging a failed check.

### Schema changes for this repair

The hosted definitions supplied on 2026-11-14 have `note` and `nutrition_info` but
no `description`. `202611140001_recipe_description.sql` adds a separate nullable
`description` column without renaming or overwriting existing content.
`202611140002_atomic_recipe_conversion.sql` adds the owner-scoped receipt table and
conversion RPC. Existing recipe and temporary-recipe ownership migrations must
already be applied. `supabase/reference/ref_create_tables.sql` is a reference,
not a migration runner; use the versioned migrations to update a database.

### Rollout order

Repository changes do not update deployed Supabase functions. The following rollout
procedure changes hosted state and is separate from local implementation:

1. Review pending migrations against the intended project, including the read-only
   integrity audit, then apply the description, conversion, and integrity migrations there. Database changes are never applied by the release scripts.
2. Supply `AUTH_ALLOWED_ORIGINS` as exact origins without a trailing slash, including
   `https://cookmarked.edw20009.workers.dev` and any local/preview origins you use.
3. Run the guarded function release with an explicit target:

   ```sh
   SUPABASE_PROJECT_REF=YOUR_PROJECT_REF pnpm deploy:functions
   ```

   This runs `check` and `test:db`, then deploys every function directory containing
   `index.ts`. Shared files are bundled separately into each endpoint, so deploying
   only one consumer leaves the others unchanged. Protected functions use both
   gateway verification (`verify_jwt = true`) and the shared verified-user boundary.
   Only `auth` has `verify_jwt = false`, because login and registration start without
   a session. Complete the development gateway compatibility checks below before
   promoting this configuration to production.

4. Run the read-only preflight check:

   ```sh
   pnpm check:cors https://YOUR_PROJECT_REF.supabase.co https://cookmarked.edw20009.workers.dev
   ```

   It sends unauthenticated OPTIONS requests only. It checks status, allowed origin,
   methods, headers, and `Vary`, and reports failures such as `503 BOOT_ERROR`.

5. Provide the Vite build-time environment variables, then run `pnpm deploy` to
   validate and deploy the Cloudflare frontend.
6. In an approved development project, verify manual saving, imported conversion,
   retry after a lost response, and isolation between two accounts. A preflight
   check does not verify database writes or authentication end to end.

`pnpm deploy` releases the frontend; `pnpm deploy:functions` releases functions.
Both stop when validation fails. Direct Wrangler/Supabase CLI deployments bypass
these repository guards. A release can stop after some functions deploy; after
correcting the failure, rerun the function release and repeat preflight checks.

### Endpoint and authentication contract

`supabase/functions/_shared/ui/endpoints.ts` declares every endpoint's access policy
and methods. CI compares this registry with the deployed function directories.
The shared endpoint wrapper owns method checks, bearer parsing, user verification,
error mapping, and the HTTP response boundary. Individual controllers receive a
verified user ID and work through business-layer contracts. Supabase clients are created per request in the
composition root with the caller's JWT; RLS remains enabled.

| Endpoint          | Access                        | Methods      | Success               |
| ----------------- | ----------------------------- | ------------ | --------------------- |
| `auth`            | Username/password credentials | POST         | 200, session tokens   |
| `recipes`         | Verified user                 | GET          | 200, recipe array     |
| `recipes_save`    | Verified user                 | POST         | 201, `{ recipeId }`   |
| `temp_recipes`    | Verified user                 | GET / DELETE | 200 array / 204 empty |
| `recipe_metadata` | Verified user                 | POST         | 200, metadata object  |

OPTIONS is handled before authentication or client construction. Unsupported
methods return 405 with `Allow` before authentication. All supported protected
operations authenticate before parsing bodies or accessing data. The old
`POST /recipes` write path is retired; manual creation and conversion both go
through the validated `recipes_save` use cases.

Application errors have one flat shape: `{ code, field? }`. The typed code/status
mapping is in `ui/apiError.ts`. Malformed JSON returns `invalid_json` (400), field
validation and existing metadata/credential validation codes return 400, missing or
invalid user credentials return 401, forbidden access returns 403, missing temporary
recipes return 404, unsupported methods return 405, username conflicts return 409,
rate limits return 429, and unexpected infrastructure failures return 503. Existing
domain codes such as `profile_not_found` and `invalid_credentials` are retained.
Blocked origins intentionally receive no allow-origin header. Allowed-origin
application responses include CORS headers and `Cache-Control: no-store`.

Gateway failures occur before application code and may have a different body.
The auth/save browser adapters normalize readable provider failures by HTTP status,
including non-JSON 401 responses. Contract tests round-trip every declared
application error through the browser parser. An opaque browser CORS failure cannot
be normalized; the following hosted compatibility checks must catch it.

### Development gateway compatibility gate

This repository stages `verify_jwt = true` for the four protected functions.
Local unit tests and Deno checks do not emulate Supabase's hosted gateway. Before
promoting this configuration, deploy the candidate to an explicitly approved
**development project** and verify:

- Allowed-origin OPTIONS succeeds without a JWT, with the expected methods/headers.
- A real signed-in ES256 user session works with the project's publishable key.
- Missing, invalid, expired, foreign-project, and API-key-only user credentials
  produce a readable 401 for supported protected operations, with no writes.
- Public login/registration still work without an existing session.
- Two accounts remain isolated by RLS, and valid saving/conversion work after the
  required migrations are applied.

Do not log or paste bearer tokens. Test credentials stay in environment variables.
Gateway verification supplements the shared user check: Supabase's API-key
compatibility behavior does not itself establish a user identity. See
[Supabase authorization headers](https://supabase.com/docs/guides/functions/auth-headers).

### Persistent recipe integrity

Apply the new forward migration `202611160001_recipe_integrity.sql` after the
existing migrations. It preserves the JSON RPC signature and existing ownership,
rollback, receipt, and concurrent-retry behavior. It adds explicit JSON type checks
before coercion, integer/range checks, and named table constraints covering required
content and stored HTTP(S) URL shape. The Edge service still performs business
validation and URL normalization; the SQL URL checks are storage guards, not a
replacement for the application's URL parser. The existing servings range,
including negative integers, is unchanged.

The constraints apply to direct INSERTs as well as conversion RPC writes. Recognized
constraint failures map to field validation errors; unknown database failures remain
503s without exposing raw messages. Ownership and generated IDs always come from
the authenticated profile and database, regardless of JSON identity fields.

Run `supabase/reference/recipe_integrity_audit.sql` in a database-owner SQL session
for a read-only aggregate audit. It returns counts and constraint-validation state,
not recipe contents. The new CHECK constraints are initially `NOT VALID`: existing
rows remain untouched, while new inserts/updates must comply. Review any legacy
violations and agree on cleanup before issuing `VALIDATE CONSTRAINT` in a later
migration. No automatic backfill, deletion, or invented field values are included.
The disposable database suite verifies legacy preservation as well as new-write
rejection, rollback, ownership, valid negative servings, and concurrent retries.

### Diagnosing a browser CORS error

Check the OPTIONS status before changing allowed origins. A `503 BOOT_ERROR`
means the function failed to start, so its CORS handler could not run. Inspect
startup logs for syntax/import/configuration failures. A 403 for an unconfigured
origin is an intentional rejection. With a valid origin, authentication and storage
errors return CORS headers so the browser can read the actual 401/403/404/503.
Unexpected failures log the operation and diagnostic name/code/status, never raw
exception messages, bearer tokens, or recipe contents.

## Recipe creation

The Add page saves manually entered recipes through the `recipes_save` Edge Function.
The browser receives its service from `src/main.tsx`; validation and ownership rules
live in `supabase/functions/_shared/services/createRecipe.ts`. The request handler
verifies the bearer token using Supabase Auth. A fresh database client forwards the
caller’s JWT so RLS applies; no service-role key is used.

Title, prep time, serving size, ingredients, and directions remain required.
Serving size must be an integer within PostgreSQL's integer range. Source URL must
be a valid HTTP(S) URL or be empty; a missing scheme is normalized to HTTPS. Empty meal type and course
become `N/A` in the Edge Function. Notes map to `note`, nutrition maps to
`nutrition_info`, directions map to `instructions`, and Source URL maps to `url`.
A successful save clears the form and shows “Recipe saved”; a failed save retains
its inputs. The library reloads after a successful save.

Before using this feature in a development project:

1. Ensure the existing `public.recipe` table uses the supplied schema, including
   `note` and `nutrition_info`, and the signed-in account has a profile linked by
   `profile.auth_user_id`.
2. Apply `supabase/migrations/202610210001_recipe_ownership.sql`. This migration
   assumes the recipe table already exists. It grants authenticated insert/select
   access, limits both to the account's own profile, and leaves update/delete
   access disabled. It does not create or alter recipe columns.
3. The function reuses `AUTH_ALLOWED_ORIGINS` from the authentication setup.
4. Deploy the Edge Function and rebuild/deploy the frontend:

```sh
pnpm exec supabase db push
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF pnpm deploy:functions
pnpm deploy
```

`verify_jwt = true` enables the platform check. The shared endpoint boundary also
verifies a user session with Auth before any profile lookup or insert; API keys
alone are not user identities.

`pnpm test:run` covers recipe rules, SDK mappings using local HTTP responses,
request authentication, and form states. `pnpm test:db` also checks recipe ownership
in a disposable PostgreSQL container. Verify a manual save with two separate
accounts in the development project after deployment; hosted services are not
contacted by the automated tests.

## PWA installation and incoming shares

The manifest at `public/manifest.webmanifest` identifies Cookmarked as an
installable app and registers `/share-target` for incoming URL/text shares.
The 192px and 512px PNG icons are resized copies of `public/logo.jpg`.
Deploy over HTTPS before checking installation on a phone. See
[Chrome's installation requirements](https://web.dev/articles/install-criteria).

The collection function is not implemented yet. Visiting `/share-target` keeps
the incoming query in the address bar and shows the normal app: Login while
signed out, then Home after authentication. Incoming shares do not open Add,
prefill its fields, display share instructions there, or save a manual recipe.
Add remains available for manual recipe entry, including pasting a Source URL.

The intended collection flow is `/share-target` → collection function →
`temp_recipe` → inbox. Automatic capture, the loading pop-up, capture result
messages, and inbox refresh will be connected when the collection interface and
inbox UI are ready.

The incoming address uses a GET query, for example:

```text
/share-target?url=https%3A%2F%2Fwww.instagram.com%2Fp%2Fexample%2F
```

`src/data/browserShareTarget.ts` is a query-decoding helper for the future
collection handoff. It returns a `SharedLink` with the explicit URL field when
supplied, otherwise a single HTTP(S) link extracted from `text`. The original
`text` is retained. Text with several links leaves the decoded URL empty.
Startup does not currently call this helper or pass share data into the manual
Add form. Platform validation, canonicalization, metadata retrieval, and
ownership belong to the Edge Function collection flow.

Session restoration and login/registration keep the incoming query in the
address bar, including after an authentication error or reload. The query remains
pending in this phase. When capture is connected, clear the pending query only
after its final result: success/partial success must confirm the draft was saved;
failure must retain the source link in the error UI. Returning to an ordinary
app URL still opens Home.

### Device verification (pending on physical devices)

The receiving share target is supported by Android Chrome. iPhone Safari does
not currently implement receiving shares via `share_target`; its flow is
copy link, open Cookmarked, and paste into Add. Installation on an iPhone does
not enable the Android receiving behavior. See
[browser compatibility](https://github.com/mdn/browser-compat-data/blob/main/manifests/webapp/share_target.json)
and [receiving shared data](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target).

Use the team's approved public Facebook, Pinterest, and Instagram sample links.
Record the device model, OS/browser versions, and results before marking these
checks complete:

- [ ] Android Chrome: install from the HTTPS deployment; confirm Cookmarked
      appears in the native share menu.
- [ ] Android Chrome: share with Cookmarked closed, then again while it is
      already open. Confirm the share query reaches `/share-target` and the app
      opens Home after authentication. Manually open Add and confirm it is empty.
- [ ] Android Chrome: share while signed out, try an incorrect password, reload
      the login screen, then sign in. Confirm the same share query remains in the
      address bar and Add does not open automatically.
- [ ] Android Chrome: share text containing one link, then text containing two
      links. Confirm the query retains the shared text and Add displays no
      share-specific fields or instructions.
- [ ] iPhone Safari: add Cookmarked to the Home Screen, launch it, sign in if
      necessary, and paste each sample link into Add's Source URL field.
- [ ] Both devices: confirm manual entry and Clear still work. Receiving a share
      must not claim extraction succeeded or automatically save a manual recipe.

`pnpm test:run` covers the query-decoding helper, share query retention through
authentication and reload/retry, isolation from manual entry, manifest
registration, and actual PNG dimensions without network access.
`pnpm preview:cloudflare` builds and starts the local Cloudflare preview for
checking direct navigation to `/share-target` before deployment. Native mobile
installation and sharing still require the device checks above.

Desktop verification on 2026-11-11 used Chrome 157.0.8103.38 against Wrangler
4.141.0's local Cloudflare preview. Chrome reported no manifest or installability
errors. Its share-flow checks covered the earlier Add-prefill behavior and need
to be repeated for the current flow. Backend requests in the signed-in browser
check were mocked; no production API calls or database writes were made. These
results do not complete the physical-device checklist.

### Temporary recipe review

The Import page can review rows from `public.temp_recipe`. Imported `text` is shown
as untrusted reference material; it is not automatically placed into ingredients,
directions, notes, or nutrition. The imported title and source URL are used as
starting values, and the user copies any useful content into the normal recipe form.

Saving a reviewed item sends one request to `recipes_save` with `tempRecipeId`.
The Edge service validates the draft, resolves the authenticated profile, and calls
`convert_temp_recipe` through its repository. The SQL function creates the permanent
recipe, records a conversion receipt, and deletes the temporary row in one transaction.
A failed write rolls back all three operations. Retrying the same temporary ID returns
the first recipe, including when the original response was lost. Concurrent retries
are serialized with a transaction advisory lock. The RPC is `security invoker` and
uses the caller's JWT and RLS; it never uses a service-role key.

Apply `202611060001_temp_recipe_ownership.sql` and the two `20261114` migrations,
deploy all affected functions, and rebuild the frontend:

```sh
pnpm exec supabase db push
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF pnpm deploy:functions
pnpm deploy
```
