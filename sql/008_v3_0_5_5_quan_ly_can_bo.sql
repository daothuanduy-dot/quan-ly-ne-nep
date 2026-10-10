-- V3.0.5.5
-- Chuẩn hóa tài khoản cán bộ/GVCN/GV/Cán bộ lớp và phạm vi lớp.
-- Chạy 1 lần trong Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='can_bo' AND column_name='ma_hs'
  ) THEN
    ALTER TABLE public.can_bo ADD COLUMN ma_hs varchar;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='can_bo' AND column_name='loai_quan_ly_lop'
  ) THEN
    ALTER TABLE public.can_bo ADD COLUMN loai_quan_ly_lop varchar;
  END IF;
END $$;

-- Không bắt buộc FK vì danh_sach có thể được kết chuyển theo năm học.
-- Chỉ tạo index để tra cứu nhanh tài khoản cán bộ lớp theo học sinh.
CREATE INDEX IF NOT EXISTS idx_can_bo_ma_hs ON public.can_bo(ma_hs);
CREATE INDEX IF NOT EXISTS idx_can_bo_lop_quan_ly ON public.can_bo(lop_quan_ly);

-- Chuẩn hóa các tài khoản hiện có theo vai trò đang sử dụng.
UPDATE public.can_bo
SET loai_quan_ly_lop='Chủ nhiệm'
WHERE lower(trim(coalesce(vai_tro,'')))='gvcn'
  AND nullif(trim(coalesce(lop_quan_ly,'')),'') IS NOT NULL
  AND nullif(trim(coalesce(loai_quan_ly_lop,'')),'') IS NULL;

UPDATE public.can_bo
SET loai_quan_ly_lop='Giảng dạy'
WHERE lower(trim(coalesce(vai_tro,''))) IN ('giáo viên','giao vien','gv')
  AND COALESCE(array_length(lop_giang_day,1),0)>0
  AND nullif(trim(coalesce(loai_quan_ly_lop,'')),'') IS NULL;

UPDATE public.can_bo
SET loai_quan_ly_lop='Cán bộ lớp'
WHERE lower(trim(coalesce(vai_tro,''))) IN ('cán bộ lớp','can bo lop')
  AND nullif(trim(coalesce(lop_quan_ly,'')),'') IS NOT NULL
  AND nullif(trim(coalesce(loai_quan_ly_lop,'')),'') IS NULL;

-- Kiểm tra sau khi chạy.
SELECT ma_cb,ho_ten,vai_tro,lop_quan_ly,lop_giang_day,ma_hs,loai_quan_ly_lop,quyen_tabs,trang_thai
FROM public.can_bo
ORDER BY ho_ten;
