-- V3.0.5.16 - Sửa tương thích bảng TKB cũ với thiết kế TKB tối giản.
-- Thiết kế mới KHÔNG dùng tiết và cho phép lịch áp dụng theo khối (lop = NULL).
-- Bảng cũ từ V3.0.5.10 đã tạo tiet NOT NULL và lop NOT NULL, nên insert lịch tối giản bị từ chối.

BEGIN;

ALTER TABLE public.thoi_khoa_bieu
  ALTER COLUMN tiet DROP NOT NULL;

ALTER TABLE public.thoi_khoa_bieu
  ALTER COLUMN lop DROP NOT NULL;

-- Không còn dùng tiet trong ứng dụng; các bản ghi cũ vẫn được giữ nguyên, nhưng giá trị có thể NULL.
COMMENT ON COLUMN public.thoi_khoa_bieu.tiet IS 'Legacy column - không sử dụng trong TKB tối giản V3.0.5.16; giữ lại để tương thích dữ liệu cũ.';
COMMENT ON COLUMN public.thoi_khoa_bieu.lop IS 'NULL = áp dụng toàn khối; có giá trị = áp dụng lớp cụ thể.';

CREATE INDEX IF NOT EXISTS idx_tkb_2026_scope
ON public.thoi_khoa_bieu(nam_hoc, thu, buoi, khoi, lop, trang_thai);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Kiểm tra sau khi chạy:
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='thoi_khoa_bieu'
  AND column_name IN ('tiet','lop')
ORDER BY ordinal_position;
