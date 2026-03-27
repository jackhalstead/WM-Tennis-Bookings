create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  court text not null check (court in ('Court 1', 'Court 2')),
  start_hour integer not null check (start_hour >= 8 and start_hour < 20),
  end_hour integer not null check (end_hour = start_hour + 1 and end_hour <= 20),
  name text not null,
  contact text,
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_unique_slot
  on public.bookings (booking_date, court, start_hour);

alter table public.bookings enable row level security;

revoke all on table public.bookings from anon;
revoke all on table public.bookings from authenticated;

-- The app uses the Supabase service role key on the server only.
-- No anon or authenticated policies are needed for public access via Next.js API routes.
