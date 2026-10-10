-- V3.0.5
-- Phân biệt bản ghi chấm điểm CÁ NHÂN / TẬP THỂ trong lịch sử.
-- An toàn: chỉ thêm cột nếu chưa tồn tại.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='diem_danh_master'
      AND column_name='doi_tuong'
  ) THEN
    ALTER TABLE public.diem_danh_master
      ADD COLUMN doi_tuong text NOT NULL DEFAULT 'Cá nhân';
  END IF;
END $$;

-- Không bắt buộc chạy UPDATE lịch sử cũ.
-- Các bản ghi mới của V3.0.5 có thể đặt:
--   'Cá nhân'  hoặc 'Tập thể'
