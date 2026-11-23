-- GOLD FIT v2: tariflar, eshik kartasi. Supabase -> SQL Editor da BIR MARTA ishga tushiring.
alter table users add column if not exists plan text default 'monthly';
alter table users add column if not exists card_uid text unique;
alter table payments add column if not exists plan text;
create index if not exists visits_at_idx on visits(at);
create index if not exists payments_paid_at_idx on payments(paid_at);
