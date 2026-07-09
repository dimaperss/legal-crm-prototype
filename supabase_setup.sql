-- ============================================================
-- Мини-CRM «Клиенты юриста» — схема базы данных (Supabase / PostgreSQL)
-- Выполнить целиком в Supabase → SQL Editor.
-- Скрипт идемпотентен: можно запускать повторно.
-- ============================================================

-- 1. Таблица клиентов -----------------------------------------
create table if not exists public.clients (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  phone      text        not null,
  status     text        not null default 'new'
                         check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

-- Индекс под сортировку «новые сверху»
create index if not exists clients_created_at_idx
  on public.clients (created_at desc);

-- 2. Row Level Security ---------------------------------------
alter table public.clients enable row level security;

-- ВНИМАНИЕ (осознанное упрощение прототипа):
-- Ниже anon-роли открыт SELECT / INSERT / UPDATE без ограничений.
-- Это демо: в проде здесь была бы авторизация и политики по user_id
-- (клиент видит и меняет только свои записи). DELETE не открываем —
-- в UI удаления нет.

drop policy if exists "demo anon select" on public.clients;
create policy "demo anon select"
  on public.clients for select
  to anon
  using (true);

drop policy if exists "demo anon insert" on public.clients;
create policy "demo anon insert"
  on public.clients for insert
  to anon
  with check (true);

drop policy if exists "demo anon update" on public.clients;
create policy "demo anon update"
  on public.clients for update
  to anon
  using (true)
  with check (true);

-- DELETE-политики намеренно НЕТ.

-- 3. Демо-данные (по одной записи на каждый статус) -----------
-- Вставляем только если таблица пуста, чтобы повторный запуск
-- скрипта не плодил дубликаты.
insert into public.clients (name, phone, status)
select *
from (values
  ('Иван Петров',      '+7 900 123-45-67', 'new'),
  ('Мария Сидорова',   '+7 911 987-65-43', 'in_progress'),
  ('Алексей Смирнов',  '+7 921 555-33-11', 'closed')
) as demo(name, phone, status)
where not exists (select 1 from public.clients);
