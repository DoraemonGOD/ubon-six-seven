-- The published database role owns these tables and is not a superuser.
-- Forced row security with no policy would hide every row from the app itself.
-- Who can read what stays in the server session checks, not in these policies.

alter table intel_incident no force row level security;
alter table intel_incident disable row level security;
alter table intel_suggestion no force row level security;
alter table intel_suggestion disable row level security;
alter table intel_mission no force row level security;
alter table intel_mission disable row level security;
alter table intel_member no force row level security;
alter table intel_member disable row level security;
alter table intel_supply no force row level security;
alter table intel_supply disable row level security;
alter table intel_audit no force row level security;
alter table intel_audit disable row level security;
