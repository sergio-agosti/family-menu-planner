# Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run:

```sql
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Ingredients (tesco_url nullable; unique when set)
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tesco_url text null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ingredients_recipes (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity text not null default '',
  created_at timestamptz not null default now(),
  primary key (recipe_id, ingredient_id)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  happening_at date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner')),
  target text not null default 'adults' check (target in ('adults','kids')),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS: allow anon read/write (app uses anon key only). For multi-user or auth, add stricter policies.
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredients_recipes enable row level security;
alter table public.plans enable row level security;

create policy "Allow anon all on recipes" on public.recipes for all to anon using (true) with check (true);
create policy "Allow anon all on ingredients" on public.ingredients for all to anon using (true) with check (true);
create policy "Allow anon all on ingredients_recipes" on public.ingredients_recipes for all to anon using (true) with check (true);
create policy "Allow anon all on plans" on public.plans for all to anon using (true) with check (true);
```

1. In Project Settings → API, copy the **Project URL** and **anon public** key into `.env`:

- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon public key

2. Run the app with `pnpm run dev`. Data is stored in Supabase in the `recipes`, `ingredients`, `ingredients_recipes`, and `plans` tables.

---

## Auth migration (user-scoped data)

After enabling Supabase Auth (email and/or Google), run the following in the SQL Editor to scope data to authenticated users.

**Step 1 – Add `user_id` (nullable for backfill):**

```sql
alter table public.recipes add column if not exists user_id uuid references auth.users(id);
alter table public.ingredients add column if not exists user_id uuid references auth.users(id);
alter table public.plans add column if not exists user_id uuid references auth.users(id);
```

**Step 2 – Optional: backfill existing rows.** Replace `'YOUR-USER-UUID'` with a real `auth.users.id` (e.g. your first signed-up user). Then run:

```sql
update public.recipes set user_id = 'YOUR-USER-UUID' where user_id is null;
update public.ingredients set user_id = 'YOUR-USER-UUID' where user_id is null;
update public.plans set user_id = 'YOUR-USER-UUID' where user_id is null;
```

**Step 3 – Enforce NOT NULL and per-user uniqueness:**

```sql
alter table public.recipes alter column user_id set not null;
alter table public.ingredients alter column user_id set not null;
alter table public.plans alter column user_id set not null;

-- Per-user unique names (drop global unique first)
alter table public.recipes drop constraint if exists recipes_name_key;
alter table public.recipes add constraint recipes_user_id_name_key unique (user_id, name);

alter table public.ingredients drop constraint if exists ingredients_name_key;
alter table public.ingredients add constraint ingredients_user_id_name_key unique (user_id, name);
-- Optional: per-user unique tesco_url (drop global unique)
alter table public.ingredients drop constraint if exists ingredients_tesco_url_key;
create unique index ingredients_user_id_tesco_url_key on public.ingredients (user_id, tesco_url) where tesco_url is not null;
```

**Step 4 – Drop anon policies and create auth-only RLS:**

```sql
drop policy if exists "Allow anon all on recipes" on public.recipes;
drop policy if exists "Allow anon all on ingredients" on public.ingredients;
drop policy if exists "Allow anon all on ingredients_recipes" on public.ingredients_recipes;
drop policy if exists "Allow anon all on plans" on public.plans;

create policy "Users own recipes" on public.recipes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users own ingredients" on public.ingredients for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users own ingredients_recipes via recipe" on public.ingredients_recipes for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

create policy "Users own plans" on public.plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

**Google OAuth:** In Supabase Dashboard → Authentication → URL Configuration, set **Site URL** and add **Redirect URLs** (e.g. `http://localhost:5173` for dev). Under Providers → Google, enable and set Client ID and Client Secret from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 Client ID, type “Web application”; add the Supabase callback URL as authorized redirect URI).
