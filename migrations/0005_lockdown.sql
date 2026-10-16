-- Lock the app tables away from public database APIs.
--
-- The app talks to Postgres only from its own server, as the table owner, so it
-- does not need row-level policies. But hosted Postgres such as Supabase also
-- exposes the public schema over a REST API to the `anon` and `authenticated`
-- roles, using a key that ships to every browser. Without this, anyone with that
-- key could read phone numbers and password hashes.
--
-- Row-level security is enabled (not forced), so the owner connection used by
-- the app keeps working, and every other role sees nothing because no policy is
-- granted. Privileges are also revoked from the API roles when they exist.

do $$
declare
  t text;
  r text;
begin
  foreach t in array array[
    'intel_member', 'intel_session', 'intel_incident', 'intel_suggestion',
    'intel_mission', 'intel_supply', 'intel_audit',
    'ufc_record', 'ufc_volunteer_secret', 'ufc_session', 'ufc_meta', '_migrations'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      foreach r in array array['anon', 'authenticated'] loop
        if exists (select 1 from pg_roles where rolname = r) then
          execute format('revoke all on table public.%I from %I', t, r);
        end if;
      end loop;
    end if;
  end loop;

  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on sequence public.ufc_request_seq from %I', r);
    end if;
  end loop;
end
$$;
