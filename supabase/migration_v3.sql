-- GOLD FIT v3: shkaflar va Face ID/barmoq izi (passkey). Supabase -> SQL Editor da BIR MARTA ishga tushiring.
create table if not exists lockers (
  num int primary key,
  user_id uuid references users(id) on delete set null,
  assigned_at timestamptz, until timestamptz
);
create table if not exists passkeys (
  id text primary key,
  user_id uuid references users(id) on delete cascade,
  public_key text not null, counter bigint default 0, transports text[],
  created_at timestamptz default now()
);
alter table lockers enable row level security;
alter table passkeys enable row level security;
