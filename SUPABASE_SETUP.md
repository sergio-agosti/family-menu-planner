# Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run:

```sql
-- Recipes
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

-- Recipe–ingredient relation (quantity per recipe/ingredient)
create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity text not null default '',
  created_at timestamptz not null default now(),
  primary key (recipe_id, ingredient_id)
);

-- Weekly plan: one row per day, each column is an array of recipe ids (jsonb)
create table if not exists public.plan (
  date date primary key,
  breakfast jsonb not null default '[]',
  lunch jsonb not null default '[]',
  dinner jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- RLS: allow anon read/write (app uses anon key only). For multi-user or auth, add stricter policies.
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.plan enable row level security;

create policy "Allow anon all on recipes" on public.recipes for all to anon using (true) with check (true);
create policy "Allow anon all on ingredients" on public.ingredients for all to anon using (true) with check (true);
create policy "Allow anon all on recipe_ingredients" on public.recipe_ingredients for all to anon using (true) with check (true);
create policy "Allow anon all on plan" on public.plan for all to anon using (true) with check (true);
```

If you already created the tables without `created_at`, add the column to each:

```sql
alter table public.ingredients add column if not exists created_at timestamptz not null default now();
alter table public.recipe_ingredients add column if not exists created_at timestamptz not null default now();
alter table public.plan add column if not exists created_at timestamptz not null default now();
```

To enforce unique names on existing tables (only if current data has no duplicates):

```sql
alter table public.recipes add constraint recipes_name_key unique (name);
alter table public.ingredients add constraint ingredients_name_key unique (name);
create unique index if not exists ingredients_tesco_url_key on public.ingredients (tesco_url) where tesco_url is not null;
```

1. In Project Settings → API, copy the **Project URL** and **anon public** key into `.env`:
  - `VITE_SUPABASE_URL` = Project URL  
  - `VITE_SUPABASE_ANON_KEY` = anon public key
2. Run the app with `pnpm run dev`. Data is stored in Supabase in the `recipes`, `ingredients`, `recipe_ingredients`, and `plan` tables.

