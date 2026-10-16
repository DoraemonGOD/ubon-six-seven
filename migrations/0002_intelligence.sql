-- UBON Six Seven Intelligence
-- Operational records. Authorization is enforced in server functions before
-- every query. Row-level security is enabled as a second layer, but the
-- embedded preview connection is a superuser and therefore bypasses RLS.
-- Do not treat these policies as the only control.

create table if not exists intel_member (
  id text primary key,
  display_name text not null,
  phone text not null unique,
  password_hash text not null,
  role text not null check (role in ('public_user', 'pending_volunteer', 'verified_volunteer', 'admin')),
  district_ids text not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intel_session (
  token_hash text primary key,
  member_id text not null references intel_member (id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists intel_incident (
  id text primary key,
  category text not null,
  summary text not null,
  original_text text not null,
  district_id text not null,
  tambon text not null default '',
  place_label text not null,
  people integer,
  urgency text not null,
  verification text not null,
  lng double precision,
  lat double precision,
  precision text not null default 'approx',
  phone text,
  is_demo boolean not null default false,
  outdated boolean not null default false,
  merged_into text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intel_suggestion (
  id text primary key,
  incident_id text not null references intel_incident (id) on delete cascade,
  category text not null,
  summary text not null,
  urgency text not null,
  reason text not null,
  missing_info text not null default '',
  duplicate_of text,
  status text not null default 'pending_review',
  model_label text not null,
  created_at timestamptz not null default now()
);

create table if not exists intel_mission (
  id text primary key,
  incident_id text not null references intel_incident (id) on delete cascade,
  title text not null,
  status text not null,
  assignee_id text references intel_member (id),
  district_id text not null,
  supplies_requested text not null default '',
  supplies_allocated text not null default '',
  supplies_delivered text not null default '',
  field_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intel_supply (
  id text primary key,
  name text not null,
  district_id text not null,
  needed integer not null,
  on_hand integer not null,
  is_demo boolean not null default true
);

create table if not exists intel_audit (
  id text primary key,
  actor_id text,
  action text not null,
  target text not null,
  detail text not null,
  at timestamptz not null default now()
);

alter table intel_incident enable row level security;
alter table intel_incident force row level security;
alter table intel_suggestion enable row level security;
alter table intel_suggestion force row level security;
alter table intel_mission enable row level security;
alter table intel_mission force row level security;
alter table intel_member enable row level security;
alter table intel_member force row level security;
alter table intel_supply enable row level security;
alter table intel_supply force row level security;
alter table intel_audit enable row level security;
alter table intel_audit force row level security;

-- No permissive policy is created on purpose. A non-superuser connection
-- cannot read these tables. The app connection in this preview is a
-- superuser, so these policies do not block it; server functions must.
