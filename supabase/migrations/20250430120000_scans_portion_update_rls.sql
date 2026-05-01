-- User-corrected portion (servings); defaults to 1 for existing rows
alter table public.scans
  add column if not exists portion_multiplier double precision default 1;

update public.scans
set portion_multiplier = 1
where portion_multiplier is null;

-- Allow users to update their own scans (e.g. manual corrections)
create policy "Users can update own scans"
  on public.scans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
