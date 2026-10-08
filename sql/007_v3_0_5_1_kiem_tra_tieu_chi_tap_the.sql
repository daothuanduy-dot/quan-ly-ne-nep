-- V3.0.5.1 - kiểm tra thực tế danh mục chấm tập thể/cá nhân
-- Chỉ đọc, không thay đổi dữ liệu.

-- 1. Có những giá trị doi_tuong nào?
SELECT
  COALESCE(NULLIF(TRIM(doi_tuong),''),'(NULL/RỖNG)') AS doi_tuong,
  COUNT(*) AS so_luong
FROM public.danh_muc_diem
GROUP BY COALESCE(NULLIF(TRIM(doi_tuong),''),'(NULL/RỖNG)')
ORDER BY so_luong DESC, doi_tuong;

-- 2. Toàn bộ tiêu chí có đối tượng và điểm
SELECT
  ma_hd,
  ten_hd,
  mang,
  loai,
  diem,
  doi_tuong
FROM public.danh_muc_diem
ORDER BY
  CASE
    WHEN LOWER(TRIM(COALESCE(doi_tuong,''))) LIKE '%tập thể%' THEN 1
    WHEN LOWER(TRIM(COALESCE(doi_tuong,''))) LIKE '%cá nhân%' THEN 2
    ELSE 3
  END,
  mang, loai, ten_hd;

-- 3. Riêng tiêu chí tập thể
SELECT
  ma_hd, ten_hd, mang, loai, diem, doi_tuong
FROM public.danh_muc_diem
WHERE LOWER(TRIM(COALESCE(doi_tuong,''))) LIKE '%tập thể%'
   OR LOWER(TRIM(COALESCE(doi_tuong,''))) LIKE '%tập thể lớp%'
   OR LOWER(TRIM(COALESCE(doi_tuong,''))) LIKE '%toàn lớp%'
   OR LOWER(TRIM(COALESCE(doi_tuong,''))) LIKE '%lớp%'
ORDER BY mang, loai, ten_hd;

-- 4. Kiểm tra số học sinh Active toàn trường.
SELECT COUNT(*) AS tong_hoc_sinh_active
FROM public.danh_sach
WHERE trang_thai='Active';

-- 5. Kiểm tra số học sinh theo khối/lớp.
SELECT khoi, lop, COUNT(*) AS so_hoc_sinh
FROM public.danh_sach
WHERE trang_thai='Active'
GROUP BY khoi, lop
ORDER BY khoi, lop;
