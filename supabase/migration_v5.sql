-- GOLD FIT v5: "Zal egasi" (manager) roli, trenerlar (xodim) va mijozga trener biriktirish.
-- Supabase -> SQL Editor da BIR MARTA ishga tushiring (qayta ishga tushirsangiz zarari yo'q).
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'users'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  loop execute format('alter table users drop constraint %I', c); end loop;
end $$;
alter table users add constraint users_role_check check (role in ('owner','manager','trainer','client'));
alter table users add column if not exists trainer_id uuid references users(id) on delete set null;
