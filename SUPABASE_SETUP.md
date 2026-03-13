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
