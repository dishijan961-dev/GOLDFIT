-- GOLD FIT v6: tanga (ball) tizimi, mashqlar (mushak xaritasi, video), trener dasturi, rejalashtirilgan xabarlar.
-- Supabase -> SQL Editor da BIR MARTA ishga tushiring (qayta ishga tushirsangiz zarari yo'q).
alter table users add column if not exists coins int default 0;
alter table users add column if not exists point_day date;
create table if not exists coin_log (
  id bigserial primary key, user_id uuid references users(id) on delete cascade,
  delta int not null, reason text, cash int default 0, created_at timestamptz default now()
);
alter table orders add column if not exists paid_coins int default 0;
alter table exercises add column if not exists muscles text[];
alter table exercises add column if not exists equipment text;
alter table exercises add column if not exists steps text;
alter table exercises add column if not exists video_url text;
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  by_id uuid references users(id) on delete set null,
  note text, done boolean default false, created_at timestamptz default now()
);
create table if not exists scheduled (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text, target text default 'all', send_at timestamptz not null,
  repeat text default 'none', silent boolean default false, sent boolean default false,
  sent_at timestamptz, created_at timestamptz default now()
);
alter table coin_log enable row level security;
alter table assignments enable row level security;
alter table scheduled enable row level security;
