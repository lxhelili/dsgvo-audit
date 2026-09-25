-- Kundenportal Sprachschule Beispiel
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  vorname text not null,
  nachname text not null,
  telefon text,
  muttersprache text,
  avatar_path text,                 -- bucket "avatars", file = <user id>.jpg
  created_at timestamptz default now()
);

create table public.enrollments (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kurs text not null,
  niveau text
);

-- Rechnungen bleiben für die Buchhaltung erhalten; der Personenbezug hängt am PDF
create table public.invoices (
  id bigint generated always as identity primary key,
  profile_id uuid references public.profiles (id) on delete set null,
  stripe_invoice_id text not null,
  pdf_path text,                    -- bucket "invoices"
  created_at timestamptz default now()
);

-- Nachrichten Schüler <-> Lehrkraft. Kein FK: Lehrkräfte sollen ihren Verlauf behalten.
create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null,
  created_at timestamptz default now()
);

-- Warteliste für volle Kurse (auch ohne Konto)
create table public.waitlist (
  id bigint generated always as identity primary key,
  email text not null,
  kurs text not null,
  created_at timestamptz default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  meta jsonb,                       -- e.g. {"email": "...", "ip": "..."}
  created_at timestamptz default now()
);

alter table public.profiles    enable row level security;
alter table public.enrollments enable row level security;
alter table public.invoices    enable row level security;
alter table public.messages    enable row level security;
alter table public.waitlist    enable row level security;
alter table public.audit_log   enable row level security;

create policy "own profile"     on public.profiles    for all    using (auth.uid() = id);
create policy "own enrollments" on public.enrollments for select using (auth.uid() = profile_id);
create policy "own invoices"    on public.invoices    for select using (auth.uid() = profile_id);
create policy "own messages"    on public.messages    for select using (auth.uid() in (sender_id, recipient_id));
create policy "send messages"   on public.messages    for insert with check (auth.uid() = sender_id);
-- waitlist and audit_log: no policies → only the service role can read them
