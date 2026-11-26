-- GOLD FIT v4: trener puli, qo'lda kirish, davomat tarixi (shkaf raqami), mashqlar, eslatmalar.
-- Supabase -> SQL Editor da BIR MARTA ishga tushiring (qayta ishga tushirsangiz zarari yo'q).
alter table users add column if not exists gym_fee int default 0;
alter table users add column if not exists trainer boolean default false;
alter table users add column if not exists trainer_fee int default 0;
alter table users add column if not exists trainer_name text;
alter table users add column if not exists absent_msg_at timestamptz;
alter table payments add column if not exists gym_amount int default 0;
alter table payments add column if not exists trainer_amount int default 0;
alter table visits add column if not exists locker int;
alter table visits add column if not exists method text;
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null, grp text, sets int, reps text, note text, image_url text,
  active boolean default true, created_at timestamptz default now()
);
alter table exercises enable row level security;
