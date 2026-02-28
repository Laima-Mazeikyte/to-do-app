create table todos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  text text not null,
  done boolean default false not null
);

alter table todos enable row level security;

create policy "Allow all access for now"
  on todos for all
  using (true)
  with check (true);
