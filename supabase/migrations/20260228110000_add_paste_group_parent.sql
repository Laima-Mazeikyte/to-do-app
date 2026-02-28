-- Marks the first (parent) task in each pasted group for connector lines
alter table todos add column if not exists paste_group_parent boolean default false;
