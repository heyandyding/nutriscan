-- Create scans table per PRD Section 9
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  food_label text not null,
  scan_mode text not null check (scan_mode in ('image', 'barcode')),
  confidence float,
  calories float,
  protein_g float,
  fat_g float,
  carbs_g float,
  sodium_mg float,
  sugar_g float,
  flags jsonb default '[]',
  raw_edamam jsonb,
  image_url text
);

-- Index for user scans lookup
create index if not exists scans_user_id_created_at_idx
  on public.scans (user_id, created_at desc);

-- Enable RLS
alter table public.scans enable row level security;

-- Policy: users can only select, insert, delete their own rows
create policy "Users can select own scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own scans"
  on public.scans for delete
  using (auth.uid() = user_id);
