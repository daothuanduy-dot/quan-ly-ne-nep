-- V3.0.5.9
-- Bổ sung cấu trúc Quản lý người dùng nếu migration 008 trước đó chưa được chạy.
-- An toàn khi chạy nhiều lần.

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

CREATE INDEX IF NOT EXISTS idx_can_bo_ma_hs ON public.can_bo(ma_hs);
CREATE INDEX IF NOT EXISTS idx_can_bo_lop_quan_ly ON public.can_bo(lop_quan_ly);

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

NOTIFY pgrst, 'reload schema';

SELECT column_name,data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='can_bo'
ORDER BY ordinal_position;
