-- Optional group id for tasks created from pasted lists (related tasks share the same id)
alter table todos add column if not exists paste_group_id text;
