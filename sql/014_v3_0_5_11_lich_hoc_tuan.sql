-- V3.0.5.11 - Lịch học tối giản theo thứ + buổi + phạm vi.
-- Không yêu cầu môn học/tiết. khoi + lop xác định phạm vi:
--   lop có giá trị: áp dụng cho lớp cụ thể
--   lop NULL: áp dụng cho toàn khối khoi

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='thoi_khoa_bieu' AND column_name='nam_hoc') THEN
    ALTER TABLE public.thoi_khoa_bieu ADD COLUMN nam_hoc text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='thoi_khoa_bieu' AND column_name='thu') THEN
    ALTER TABLE public.thoi_khoa_bieu ADD COLUMN thu integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='thoi_khoa_bieu' AND column_name='buoi') THEN
    ALTER TABLE public.thoi_khoa_bieu ADD COLUMN buoi varchar;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='thoi_khoa_bieu' AND column_name='khoi') THEN
    ALTER TABLE public.thoi_khoa_bieu ADD COLUMN khoi varchar;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='thoi_khoa_bieu' AND column_name='lop') THEN
    ALTER TABLE public.thoi_khoa_bieu ADD COLUMN lop varchar;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='thoi_khoa_bieu' AND column_name='trang_thai') THEN
    ALTER TABLE public.thoi_khoa_bieu ADD COLUMN trang_thai varchar DEFAULT 'Hoạt động';
  END IF;
END $$;

UPDATE public.thoi_khoa_bieu SET nam_hoc='2026-2027' WHERE nam_hoc IS NULL;
UPDATE public.thoi_khoa_bieu SET trang_thai='Hoạt động' WHERE trang_thai IS NULL;

CREATE INDEX IF NOT EXISTS idx_tkb_nam_thu_buoi ON public.thoi_khoa_bieu(nam_hoc,thu,buoi);
CREATE INDEX IF NOT EXISTS idx_tkb_khoi_lop ON public.thoi_khoa_bieu(khoi,lop);

NOTIFY pgrst, 'reload schema';

SELECT column_name,data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='thoi_khoa_bieu'
ORDER BY ordinal_position;
