# Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Enable Auth (email and/or Google). In **Authentication → URL Configuration**, set **Site URL** and add **Redirect URLs** (e.g. `http://localhost:5173`). For Google: **Providers → Google** → enable and set Client ID/Secret from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 Client ID, type “Web application”; add Supabase callback URL as authorized redirect URI).
3. In **Project Settings → API**, copy **Project URL** and **anon public** key into `.env`:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
4. In the SQL Editor, run the following once (auth + households from the start; no `user_id` on data tables):

```sql
-- Households and user profiles (one household per user; extend user_profiles later if needed)
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade
);

create table if not exists public.household_invites (
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, email)
);

-- Data tables: scoped by household (household has many users via user_profiles)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','difficult')),
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  tesco_url text null,
  created_at timestamptz not null default now(),
  unique (household_id, name),
  unique (household_id, tesco_url)
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
  household_id uuid not null references public.households(id) on delete cascade,
  happening_at date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner')),
  target text not null default 'adults' check (target in ('adults','kids')),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS: all tables
alter table public.households enable row level security;
alter table public.user_profiles enable row level security;
alter table public.household_invites enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredients_recipes enable row level security;
alter table public.plans enable row level security;

-- Households: members can read/update their household
create policy "Members read households" on public.households for select to authenticated
  using (id = (select household_id from public.user_profiles where user_id = auth.uid()));
create policy "Authenticated create household" on public.households for insert to authenticated with check (true);
create policy "Members update household" on public.households for update to authenticated
  using (id = (select household_id from public.user_profiles where user_id = auth.uid()));

-- User profiles: own row only; invitees can insert when they have an invite
create policy "Users read own profile" on public.user_profiles for select to authenticated using (user_id = auth.uid());
create policy "Users insert own profile" on public.user_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "Invitees join household" on public.user_profiles for insert to authenticated
  with check (user_id = auth.uid() and household_id in (select household_id from public.household_invites where email = (auth.jwt()->>'email')));
create policy "Users leave household" on public.user_profiles for delete to authenticated using (user_id = auth.uid());

-- Invites: members manage; invitees can read/delete own
create policy "Members manage invites" on public.household_invites for all to authenticated
  using (household_id = (select household_id from public.user_profiles where user_id = auth.uid()))
  with check (household_id = (select household_id from public.user_profiles where user_id = auth.uid()));
create policy "Invitees read own invites" on public.household_invites for select to authenticated using (email = (auth.jwt()->>'email'));
create policy "Invitees delete own invite" on public.household_invites for delete to authenticated using (email = (auth.jwt()->>'email'));

-- Data: access by household (via user_profiles)
create policy "Members access recipes" on public.recipes for all to authenticated
  using (household_id = (select household_id from public.user_profiles where user_id = auth.uid()))
  with check (household_id = (select household_id from public.user_profiles where user_id = auth.uid()));

create policy "Members access ingredients" on public.ingredients for all to authenticated
  using (household_id = (select household_id from public.user_profiles where user_id = auth.uid()))
  with check (household_id = (select household_id from public.user_profiles where user_id = auth.uid()));

create policy "Members access ingredients_recipes" on public.ingredients_recipes for all to authenticated
  using (exists (select 1 from public.recipes r join public.user_profiles u on r.household_id = u.household_id where r.id = recipe_id and u.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r join public.user_profiles u on r.household_id = u.household_id where r.id = recipe_id and u.user_id = auth.uid()));

create policy "Members access plans" on public.plans for all to authenticated
  using (household_id = (select household_id from public.user_profiles where user_id = auth.uid()))
  with check (household_id = (select household_id from public.user_profiles where user_id = auth.uid()));
```

5. Run the app with `pnpm run dev`. Sign in (email or Google); the app creates a default household and profile on first use. Use **Invite** to add another user (e.g. your wife) to the same household.

6. **Existing databases** (if you already ran the SQL above before `difficulty` existed): in the SQL Editor run once:

```sql
alter table public.recipes
  add column if not exists difficulty text not null default 'easy'
  check (difficulty in ('easy','medium','difficult'));
```

If `recipes` already had a `difficulty` column from a partial migration, adjust as needed; the app expects `easy`, `medium`, or `difficult`.
