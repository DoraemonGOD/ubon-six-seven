-- Volunteer certificates are kept with the shared records (kind 'certificate').
alter table ufc_record drop constraint if exists ufc_record_kind_check;
alter table ufc_record add constraint ufc_record_kind_check
  check (kind in ('request', 'event', 'report', 'volunteer', 'assignment', 'shelter', 'supply', 'certificate'));
