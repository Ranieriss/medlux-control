# Changelog

## 1.0.0 - 2026-02-13

### Hardening (frontend + Supabase RLS readiness)
- Added tenant helper `getCurrentOrgId()` and automatic `organization_id` attachment on create/update flows.
- Added soft-delete behavior (`deleted_at`) for equipamentos, obras, vínculos, medições.
- Standardized UTC timestamps (`created_at`, `updated_at`, `entrega_at`, `encerrado_at`, `medido_em`).
- Strengthened client validation and destructive-action confirmations.
- Improved global error classification (401/403/400/42703/network) and audit/error recording.
- Added optional SQL migration for Supabase under `supabase/migrations/`.
- Standardized client logs with session correlation id.
