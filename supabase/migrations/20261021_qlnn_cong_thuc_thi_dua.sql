-- V3.0.5.25.47: configuration only; no changes to existing scoring records.
-- IMPORTANT: project uses custom login; verify auth/RLS model before enabling writes.
CREATE TABLE IF NOT EXISTS public.qlnn_cong_thuc_thi_dua (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doi_tuong text NOT NULL CHECK (doi_tuong IN ('Tập thể','Cá nhân')),
  mang text NOT NULL,
  cong_thuc text NOT NULL CHECK (length(trim(cong_thuc)) > 0 AND length(cong_thuc) <= 10000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doi_tuong,mang)
);
ALTER TABLE public.qlnn_cong_thuc_thi_dua ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies by default: do not grant anonymous users the ability
-- to alter grading rules. Add authenticated administrator-only policies AFTER
-- reviewing the project's custom login architecture and permission model.
COMMENT ON TABLE public.qlnn_cong_thuc_thi_dua IS 'Per-area and per-target competition formula. Secure RLS policies required for client access.';
