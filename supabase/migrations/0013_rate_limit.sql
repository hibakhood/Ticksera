-- 0013: Cross-instance rate limiting (audit finding H2).
--
-- The Edge functions rate-limit in per-isolate in-memory maps, so the limit is
-- per-Vercel-instance, not global: a distributed attacker (or a NAT'd office)
-- can multiply the effective budget, and the map leaks entries. This migration
-- adds a database-backed fixed-window limiter. It serializes updates per key
-- with an advisory lock so concurrent instances agree on a single budget.
--
-- API surface:
--   public.consume_rate_limit(p_key text, p_limit int, p_window_seconds int)
--     -> json { ok: bool, retry_after: int, count: int }
--   Executable ONLY by the service role (revoked from anon/authenticated).
--
-- The Edge functions call this through the service key; when the database is
-- unreachable they fall back to their in-memory limiter, so availability never
-- depends on the limiter.

create table if not exists public.rate_limit_buckets (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Prune stale buckets opportunistically so the table stays bounded even if a
-- key never appears again (each call also overwrites its own expired row).
create index if not exists rate_limit_buckets_updated_at_idx
  on public.rate_limit_buckets (updated_at);

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
  v_retry_after integer;
begin
  -- Bound inputs to keep the bucket table sane.
  if p_key is null or p_key = '' then
    return json_build_object('ok', false, 'retry_after', 1, 'count', 0);
  end if;
  p_limit := greatest(1, least(p_limit, 100000));
  p_window_seconds := greatest(1, least(p_window_seconds, 86400));

  -- Serialize concurrent increments for the same key across instances.
  perform pg_advisory_xact_lock(hashtext('rl:' || p_key));

  select window_start into v_window_start
    from public.rate_limit_buckets where key = p_key;

  if v_window_start is null
     or v_window_start <= v_now - make_interval(secs => p_window_seconds) then
    -- Fresh window.
    insert into public.rate_limit_buckets (key, count, window_start, updated_at)
    values (p_key, 1, v_now, v_now)
    on conflict (key) do update
      set count = 1, window_start = v_now, updated_at = v_now;
    -- Opportunistic housekeeping: prune rows older than one window.
    if p_window_seconds <= 3600 then
      delete from public.rate_limit_buckets
        where updated_at < v_now - make_interval(secs => 3600);
    end if;
    return json_build_object('ok', true, 'retry_after', 0, 'count', 1);
  end if;

  select count into v_count
    from public.rate_limit_buckets where key = p_key;

  if v_count >= p_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::int
    );
    return json_build_object('ok', false, 'retry_after', v_retry_after, 'count', v_count);
  end if;

  update public.rate_limit_buckets
    set count = count + 1, updated_at = v_now
    where key = p_key;

  return json_build_object('ok', true, 'retry_after', 0, 'count', v_count + 1);
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;
