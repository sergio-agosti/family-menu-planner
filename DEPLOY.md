# Deploying to GitHub Pages

## One-time GitHub setup

1. **Settings → Pages** — set **Source** to **GitHub Actions** (not “Deploy from a branch”).
2. **Settings → Secrets and variables → Actions** — add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
     Use the same values as in your local Vite `.env` (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md)).

## How it works

Pushes to `main` run [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml): `npm ci`, `npm run build` with `GITHUB_PAGES=true` (so Vite’s `base` is `/REPOSITORY_NAME/`, derived from `GITHUB_REPOSITORY` in Actions), then upload and deploy the `dist` folder.

If your default branch is not `main`, change the `branches` filter in that workflow.

The live URL follows GitHub’s project Pages pattern: `https://USERNAME.github.io/REPOSITORY/`.
