-- Pinned tasks appear in the Priority zone; persistence required for list view
alter table todos add column if not exists pinned boolean default false not null;
