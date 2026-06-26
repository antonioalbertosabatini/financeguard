-- FinanceGuard — sessione attiva singola per utente (heartbeat).
-- Metadati non finanziari: il cloud sa solo quale dispositivo tiene il lock.

create table if not exists public.active_sessions (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  device_id   text not null,
  device_name text,
  heartbeat_at timestamptz not null default now(),
  acquired_at  timestamptz not null default now()
);

alter table public.active_sessions enable row level security;

drop policy if exists "active_sessions_select_own" on public.active_sessions;
create policy "active_sessions_select_own" on public.active_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "active_sessions_insert_own" on public.active_sessions;
create policy "active_sessions_insert_own" on public.active_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "active_sessions_update_own" on public.active_sessions;
create policy "active_sessions_update_own" on public.active_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "active_sessions_delete_own" on public.active_sessions;
create policy "active_sessions_delete_own" on public.active_sessions
  for delete using (auth.uid() = user_id);
