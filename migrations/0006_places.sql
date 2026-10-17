-- Shelters and supply needs move from fixed demo constants into the shared
-- record table, so coordinators can add, edit and remove them from the back
-- office and every page reads the same rows.
alter table ufc_record drop constraint if exists ufc_record_kind_check;
alter table ufc_record add constraint ufc_record_kind_check
  check (kind in ('request', 'event', 'report', 'volunteer', 'assignment', 'shelter', 'supply'));
