-- V3.0.5.18 - Đồng bộ thời gian học 2 buổi/ngày và hỗ trợ Báo vắng.
-- Không thay đổi cấu trúc TKB tối giản. Migration này chỉ bảo đảm bảng thời gian có các cột cần thiết.
BEGIN;
ALTER TABLE public.cai_dat_thoi_gian ADD COLUMN IF NOT EXISTS nam_hoc text DEFAULT '2026-2027';
ALTER TABLE public.cai_dat_thoi_gian ADD COLUMN IF NOT EXISTS tu_tiet integer;
ALTER TABLE public.cai_dat_thoi_gian ADD COLUMN IF NOT EXISTS den_tiet integer;
ALTER TABLE public.cai_dat_thoi_gian ADD COLUMN IF NOT EXISTS gio_bat_dau_diem_danh time;
ALTER TABLE public.cai_dat_thoi_gian ADD COLUMN IF NOT EXISTS gio_ket_thuc_diem_danh time;
ALTER TABLE public.cai_dat_thoi_gian ADD COLUMN IF NOT EXISTS buoi varchar;
ALTER TABLE public.cai_dat_thoi_gian ADD COLUMN IF NOT EXISTS trang_thai varchar DEFAULT 'Học';
CREATE INDEX IF NOT EXISTS idx_cai_dat_thoi_gian_namhoc_buoi ON public.cai_dat_thoi_gian(nam_hoc,buoi,trang_thai);
COMMIT;
NOTIFY pgrst, 'reload schema';
SELECT column_name,is_nullable,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='cai_dat_thoi_gian' ORDER BY ordinal_position;
