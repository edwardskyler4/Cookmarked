For this feature, we’ll need three main services connected:

`Browser → Cloudflare Pages → Supabase`

Because your project notes say the domain layer belongs in Supabase Edge Functions, the more complete architecture would be:

`Browser → Cloudflare Pages → Supabase Edge Function → Supabase database`

## Accounts and services

### 1. Supabase account

Create or use a Supabase account and create a project.

We’ll need to set up:

- A Supabase organization/project
- A Postgres table for saved names
- Row Level Security policies
- A Supabase Edge Function that receives the name, saves it, retrieves it, and returns it
- The project URL
- A public/publishable API key
- A secret key for server-side code only, if the Edge Function requires elevated access

Supabase currently recommends publishable keys for browser code and secret keys only for backend code. Secret keys bypass Row Level Security and must never be placed in the frontend or committed to Git. [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys)

We do not necessarily need Supabase Authentication for the first “hello world” version. If every visitor can save and retrieve names, anonymous access could work. If names must belong to individual users, we will also need Supabase Auth and user-specific database policies.

### 2. Cloudflare account

Create or use a Cloudflare account and create a Cloudflare Pages project.

We’ll configure:

- The connected GitHub repository
- The package manager/build command
- The Vite output directory, normally `dist`
- Preview deployments for branches or pull requests
- Production deployment from the main branch
- Environment variables or encrypted secrets where appropriate

Cloudflare Pages can automatically build and deploy the Vite project whenever changes are pushed to GitHub. [Cloudflare’s Vite deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/)

For a basic frontend, Cloudflare Pages is sufficient. We do not need Cloudflare Workers unless we decide to put the backend/API layer in Cloudflare instead of Supabase Edge Functions.

### 3. GitHub repository

Cloudflare Pages will be easiest to deploy through GitHub, so the project should be in a GitHub repository.

We’ll need:

- A GitHub account
- The repository pushed to GitHub
- Cloudflare permission to access that repository
- A defined production branch, probably `main`

## Database setup

Before writing application code, we’ll decide:

- Table name
- Name column
- Whether each record needs an ID and timestamp
- Whether anonymous users may insert and read records
- Whether authenticated users may only access their own records

The table must have Row Level Security enabled and policies matching the intended behavior. Supabase warns that tables exposed through its Data API can otherwise be readable and writable by anyone with the public key. [Supabase table security documentation](https://supabase.com/docs/guides/database/tables)

## Environment and secrets

For local development, we’ll need a local environment file containing non-committed configuration.

For deployment:

- The browser-facing Supabase URL and publishable key can be configured as public frontend variables.
- Any Supabase secret key must be stored only in Supabase Edge Function secrets or Cloudflare encrypted secrets.
- `.env` files containing secrets must remain excluded by `.gitignore`.

Cloudflare Pages supports encrypted variables and secrets through the project’s settings. [Cloudflare Pages secrets documentation](https://developers.cloudflare.com/pages/functions/bindings/)

## Domain and deployment choices

A custom domain is optional.

Initially, Cloudflare can provide a URL such as:

`your-project.pages.dev`

Later, we can connect a domain you own through Cloudflare. That would require:

- Purchasing or already owning a domain
- Adding it to Cloudflare
- Updating DNS records
- Optionally configuring custom Supabase Auth redirect URLs if authentication is added

## Recommended setup order

1. Confirm or create the GitHub repository.
2. Create the Supabase project.
3. Decide whether names are public or user-specific.
4. Create the database table and security policies.
5. Create the Supabase Edge Function.
6. Create the Cloudflare Pages project.
7. Connect Cloudflare Pages to GitHub.
8. Add the required environment variables and secrets.
9. Deploy and test the complete save-and-display flow.

The only important design decision we need before implementation is whether this first version should allow anonymous users to save names, or whether each name should be associated with a signed-in user.
