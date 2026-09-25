-- Mitgliederbereich Yogastudio Beispiel
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  vorname text not null,
  nachname text not null,
  telefon text,
  geburtsdatum date,
  -- "Gibt es etwas, das deine Lehrerin wissen sollte? (Verletzungen, Schwangerschaft …)"
  gesundheitshinweise text,
  avatar_path text,               -- Storage-Bucket "avatars"
  stripe_customer_id text,
  newsletter boolean default false,
  created_at timestamptz default now()
);

create table public.bookings (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kurs text not null,
  termin timestamptz not null
);

-- Rechnungen zu Zehnerkarten und Monatsabos (Stripe Invoice-ID + PDF im Bucket "invoices")
create table public.invoices (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stripe_invoice_id text not null,
  betrag_cent integer not null,
  pdf_path text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = id);
