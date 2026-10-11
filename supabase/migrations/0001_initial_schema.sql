-- Garba Connect initial schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  branch text,
  year_of_study int check (year_of_study between 1 and 6),
  bio text check (char_length(coalesce(bio,'')) <= 300),
  interests text[] not null default '{}',
  availability text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  note text check (char_length(coalesce(note,'')) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create unique index if not exists invitations_one_pending_pair
  on public.invitations(sender_id, receiver_id) where status = 'pending';

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a <> user_b),
  unique (user_a, user_b)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 70),
  description text check (char_length(coalesce(description,'')) <= 400),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 100),
  details text check (char_length(coalesce(details,'')) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name',''), 'New student'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.invitations enable row level security;
alter table public.matches enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

create policy "Authenticated users can view profiles" on public.profiles
for select to authenticated using (true);
create policy "Users can insert own profile" on public.profiles
for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can see blocks they created" on public.blocks
for select to authenticated using (auth.uid() = blocker_id);
create policy "Users can block others" on public.blocks
for insert to authenticated with check (auth.uid() = blocker_id);
create policy "Users can remove their own blocks" on public.blocks
for delete to authenticated using (auth.uid() = blocker_id);

create policy "Invitation participants can view" on public.invitations
for select to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send invitations" on public.invitations
for insert to authenticated with check (auth.uid() = sender_id and sender_id <> receiver_id);
create policy "Receiver can respond to invitation" on public.invitations
for update to authenticated using (auth.uid() = receiver_id or auth.uid() = sender_id)
with check (auth.uid() = receiver_id or auth.uid() = sender_id);
create policy "Sender can cancel invitation" on public.invitations
for delete to authenticated using (auth.uid() = sender_id and status = 'pending');

create policy "Matched users can view matches" on public.matches
for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Signed-in users can view groups" on public.groups
for select to authenticated using (true);
create policy "Users can create groups" on public.groups
for insert to authenticated with check (auth.uid() = created_by);
create policy "Group creator can update group" on public.groups
for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "Group creator can delete group" on public.groups
for delete to authenticated using (auth.uid() = created_by);

create policy "Members can view group membership" on public.group_members
for select to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()
  ) or exists (
    select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.status = 'approved'
  )
);
create policy "Users can request group membership" on public.group_members
for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "Group creator can manage membership" on public.group_members
for update to authenticated using (
  exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
) with check (
  exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
);
create policy "Users can leave pending memberships" on public.group_members
for delete to authenticated using (auth.uid() = user_id and status = 'pending');

create policy "Matched participants can read messages" on public.messages
for select to authenticated using (
  exists (select 1 from public.matches m where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid()))
);
create policy "Matched participants can send own messages" on public.messages
for insert to authenticated with check (
  auth.uid() = sender_id and exists (
    select 1 from public.matches m where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

create policy "Users can submit reports" on public.reports
for insert to authenticated with check (auth.uid() = reporter_id);
create policy "Users can view their own reports" on public.reports
for select to authenticated using (auth.uid() = reporter_id);

-- NOTE: This is an initial scaffold, not a complete production security review.
-- Tighten invitation update rules with a server-side RPC before launching.
