-- ============================================================
--  HOTEL CHECK-IN  —  Supabase Schema
--  Paste this entire file into:
--  Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. ROOMS
create table if not exists rooms (
  id           uuid primary key default gen_random_uuid(),
  room_number  text not null unique,        -- e.g. "101", "202"
  room_type    text not null,               -- "Single", "Double", "Suite"
  base_price   numeric(10,2) not null,      -- nightly rate
  max_guests   int not null default 2,
  notes        text,
  created_at   timestamptz default now()
);

-- 2. GUESTS
create table if not exists guests (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text unique,
  phone        text,
  id_number    text,                        -- passport / national ID
  created_at   timestamptz default now()
);

-- 3. BOOKINGS
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references rooms(id) on delete cascade,
  guest_id     uuid references guests(id) on delete set null,
  check_in     date not null,
  check_out    date not null,
  total_price  numeric(10,2),
  status       text not null default 'confirmed'
                 check (status in ('confirmed','long-stay','checked-out','cancelled','pending')),
  notes        text,
  created_at   timestamptz default now(),
  constraint no_overlap exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
);

-- ============================================================
--  ROW LEVEL SECURITY  (keeps data private)
-- ============================================================
alter table rooms    enable row level security;
alter table guests   enable row level security;
alter table bookings enable row level security;

-- Allow all operations for authenticated staff users
create policy "staff full access - rooms"
  on rooms for all using (auth.role() = 'authenticated');

create policy "staff full access - guests"
  on guests for all using (auth.role() = 'authenticated');

create policy "staff full access - bookings"
  on bookings for all using (auth.role() = 'authenticated');

-- ============================================================
--  SAMPLE DATA  (optional — delete after testing)
-- ============================================================
insert into rooms (room_number, room_type, base_price, max_guests) values
  ('101', 'Single',  80.00, 1),
  ('102', 'Single',  80.00, 1),
  ('201', 'Double', 120.00, 2),
  ('202', 'Double', 120.00, 2),
  ('301', 'Suite',  200.00, 4);

insert into guests (full_name, email, phone) values
  ('Maria Santos',  'maria@example.com',  '+1-555-0101'),
  ('John Rivera',   'john@example.com',   '+1-555-0102'),
  ('Lee Park',      'lee@example.com',    '+1-555-0103');

-- Sample short stay and a long-stay booking
insert into bookings (room_id, guest_id, check_in, check_out, total_price, status)
select
  r.id, g.id,
  current_date,
  current_date + interval '3 days',
  360.00,
  'confirmed'
from rooms r, guests g
where r.room_number = '201' and g.email = 'maria@example.com';

insert into bookings (room_id, guest_id, check_in, check_out, total_price, status)
select
  r.id, g.id,
  current_date - interval '5 days',
  current_date + interval '25 days',
  3000.00,
  'long-stay'
from rooms r, guests g
where r.room_number = '301' and g.email = 'john@example.com';
