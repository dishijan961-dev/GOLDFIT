create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('owner','trainer','client')),
  login text unique not null,
  pass_hash text not null,
  must_change boolean default false,
  first_name text, last_name text, phone text,
  tg_id bigint unique, tg_username text, tg_name text, tg_photo text,
  blocked boolean default false, block_reason text, unblocked_at timestamptz,
  monthly_fee int default 0, paid_until date,
  last_visit timestamptz, checked_in_until timestamptz,
  silent boolean default false,
  created_at timestamptz default now()
);
create table bot_users (
  tg_id bigint primary key, phone text, username text, first_name text,
  blocked boolean default false, created_at timestamptz default now()
);
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null, price int not null, stock int default 0,
  category text, image_url text, active boolean default true,
  created_at timestamptz default now()
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  items jsonb, total int, status text default 'new',
  created_at timestamptz default now()
);
create table visits (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade,
  at timestamptz default now()
);
create table payments (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade,
  amount int, days int, paid_at timestamptz default now()
);
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade,
  title text, body text, created_at timestamptz default now()
);
create table settings (key text primary key, value jsonb);

create or replace function take_stock(pid uuid, q int) returns boolean
language plpgsql as $$
begin
  update products set stock = stock - q where id = pid and active and stock >= q;
  return found;
end $$;

-- Xavfsizlik: RLS yoqiladi, siyosat yo'q => faqat server (service key) kira oladi
alter table users enable row level security;
alter table bot_users enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table visits enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;
