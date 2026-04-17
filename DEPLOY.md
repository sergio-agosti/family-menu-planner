# Deploying to GitHub Pages

The site is served at **https://planner.sergioagosti.org** via a custom domain.

## One-time GitHub setup

1. **Settings → Secrets and variables → Actions** — add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
     Use the same values as in your local Vite `.env` (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md)).
2. **Settings → Pages**:
   - **Source**: **GitHub Actions** (not “Deploy from a branch”).
   - **Custom domain**: `planner.sergioagosti.org`, then enable **Enforce HTTPS** once the certificate provisions (usually a few minutes after DNS propagates).

## DNS setup

At your DNS provider for `sergioagosti.org`, create a **CNAME** record:

| Type  | Name     | Value                          | TTL  |
| ----- | -------- | ------------------------------ | ---- |
| CNAME | planner  | `sergio-agosti.github.io.`     | 3600 |

Do **not** add a trailing dot in the Name field; most DNS UIs handle the zone suffix automatically. Allow up to an hour for propagation, then verify with `dig planner.sergioagosti.org +short` — it should resolve to `sergio-agosti.github.io`.

The repo also contains [`public/CNAME`](public/CNAME) with the same domain, which GitHub Pages reads from each deploy to keep the custom domain bound to the site.

## How it works

Pushes to `master` run [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml): `pnpm install --frozen-lockfile`, `pnpm run build` (Vite’s `base` is `/` because the site is served from the apex of the custom domain), then upload and deploy the `dist` folder.

## Supabase allowed URLs

In the Supabase dashboard → **Auth → URL Configuration**, add the production domain to both:

- **Site URL**: `https://planner.sergioagosti.org`
- **Redirect URLs**: `https://planner.sergioagosti.org/**`

Otherwise magic-link / OAuth sign-ins will fail on the deployed site.
