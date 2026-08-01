-- 0001_init.sql
-- FIXORA Enterprise — initial schema, Row-Level Security, and profile trigger.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'customer'
              check (role in ('super_admin','support_manager','technician','field_technician','customer','bot')),
  organization text,
  org_owner_email text,
  avatar      text,
  phone       text,
  location    text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

-- auto-create a profile row on signup (fallback to client-side upsert)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, organization)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'customer'),
    new.raw_user_meta_data ->> 'organization'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  plan        text not null default 'Free'
              check (plan in ('Free','Starter','Professional','Business','Enterprise')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------------
create table public.tickets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  org_id        uuid references public.organizations(id) on delete set null,
  subject       text not null,
  description   text not null default '',
  category      text not null default 'Other',
  priority      text not null default 'Medium'
                check (priority in ('Low','Medium','High','Critical')),
  status        text not null default 'New'
                check (status in ('New','In Progress','Awaiting Reply','Resolved','Closed','Pending Payment')),
  assigned_to   uuid references public.profiles(id) on delete set null,
  channel       text not null default 'web',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger tickets_updated_at before update on public.tickets
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references public.tickets(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  sender_name text not null,
  sender_role text not null default 'customer',
  message     text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  service     text not null,
  technician  text not null,
  date        text not null,
  time        text not null,
  notes       text not null default '',
  status      text not null default 'Confirmed'
              check (status in ('Confirmed','Cancelled','Completed')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete set null,
  plan        text not null,
  amount      numeric(10,2) not null,
  status      text not null default 'completed'
              check (status in ('pending','completed','failed','refunded')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- contact_messages (public contact form)
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text not null default '',
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- kb_articles
-- ---------------------------------------------------------------------------
create table public.kb_articles (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  title       text not null,
  category    text not null default 'General',
  content     text not null default '',
  helpful    integer not null default 0,
  views       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger kb_articles_updated_at before update on public.kb_articles
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity      text not null default '',
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.organizations   enable row level security;
alter table public.tickets         enable row level security;
alter table public.chat_messages   enable row level security;
alter table public.bookings        enable row level security;
alter table public.payments        enable row level security;
alter table public.notifications   enable row level security;
alter table public.contact_messages enable row level security;
alter table public.kb_articles     enable row level security;
alter table public.audit_logs      enable row level security;

-- staff helper: roles allowed full read access
create or replace function public.is_staff(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('super_admin','support_manager','technician','field_technician')
  );
$$;

-- profiles
create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- organizations
create policy "orgs_read_all_authed" on public.organizations
  for select using (auth.role() = 'authenticated');
create policy "orgs_update_owner" on public.organizations
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- tickets
create policy "tickets_read_own" on public.tickets
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "tickets_insert_own" on public.tickets
  for insert with check (auth.uid() = user_id);
create policy "tickets_update_own_or_staff" on public.tickets
  for update using (auth.uid() = user_id or public.is_staff(auth.uid()));

-- chat_messages
create policy "chat_read_ticket_participants" on public.chat_messages
  for select using (public.is_staff(auth.uid()) or exists (
    select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()
  ));
create policy "chat_insert_participants" on public.chat_messages
  for insert with check (public.is_staff(auth.uid()) or exists (
    select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()
  ));

-- bookings
create policy "bookings_own" on public.bookings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- payments
create policy "payments_own" on public.payments
  for select using (user_id = auth.uid());
create policy "payments_insert_own" on public.payments
  for insert with check (user_id = auth.uid());

-- notifications
create policy "notifications_own" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- contact_messages
create policy "contact_insert_public" on public.contact_messages
  for insert with check (true);
create policy "contact_read_staff" on public.contact_messages
  for select using (public.is_staff(auth.uid()));
create policy "contact_update_staff" on public.contact_messages
  for update using (public.is_staff(auth.uid()));

-- kb_articles
create policy "kb_read_public" on public.kb_articles
  for select using (true);
create policy "kb_write_staff" on public.kb_articles
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- audit_logs
create policy "audit_read_staff" on public.audit_logs
  for select using (public.is_staff(auth.uid()));
create policy "audit_insert_service" on public.audit_logs
  for insert with check (true);
