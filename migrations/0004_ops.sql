-- UBON Six Seven shared coordination data.
-- Requests, events, field reports, volunteers and assignments used to live in
-- each browser's localStorage, so a request sent from one phone never reached
-- the coordinator on another device. They now live here and every device reads
-- the same rows through server functions.

create table if not exists ufc_record (
  kind text not null check (kind in ('request', 'event', 'report', 'volunteer', 'assignment')),
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

-- Volunteer passwords are kept apart from the volunteer record so they can
-- never be sent to a browser by accident.
create table if not exists ufc_volunteer_secret (
  volunteer_id text primary key,
  password_hash text not null
);

-- One row per browser that has signed in or sent a request.
create table if not exists ufc_session (
  token_hash text primary key,
  role text not null default 'citizen' check (role in ('citizen', 'coordinator', 'volunteer')),
  volunteer_id text,
  owned_request_ids text not null default '[]',
  expires_at timestamptz not null
);

create table if not exists ufc_meta (
  key text primary key,
  value text not null
);

-- UBN numbers come from a sequence so two people sending at the same moment
-- never get the same tracking number.
create sequence if not exists ufc_request_seq start with 200;
