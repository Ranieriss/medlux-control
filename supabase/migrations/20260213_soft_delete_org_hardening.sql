-- Optional migration for MEDLUX frontend hardening.
-- Run in Supabase SQL editor if your tables do not yet include these columns.

alter table if exists public.equipamentos add column if not exists organization_id uuid;
alter table if exists public.obras add column if not exists organization_id uuid;
alter table if exists public.vinculos add column if not exists organization_id uuid;
alter table if exists public.medicoes add column if not exists organization_id uuid;
alter table if exists public.audit_log add column if not exists organization_id uuid;

alter table if exists public.equipamentos add column if not exists deleted_at timestamptz;
alter table if exists public.obras add column if not exists deleted_at timestamptz;
alter table if exists public.vinculos add column if not exists deleted_at timestamptz;
alter table if exists public.medicoes add column if not exists deleted_at timestamptz;

alter table if exists public.vinculos add column if not exists entrega_at timestamptz;
alter table if exists public.vinculos add column if not exists encerrado_at timestamptz;
alter table if exists public.medicoes add column if not exists medido_em timestamptz;

-- Backfill org id from current profile function when empty and policy permits.
update public.equipamentos set organization_id = public.current_org_id() where organization_id is null;
update public.obras set organization_id = public.current_org_id() where organization_id is null;
update public.vinculos set organization_id = public.current_org_id() where organization_id is null;
update public.medicoes set organization_id = public.current_org_id() where organization_id is null;
update public.audit_log set organization_id = public.current_org_id() where organization_id is null;
