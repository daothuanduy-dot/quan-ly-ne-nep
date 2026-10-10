-- V3.0.4 - chỉ kiểm tra, không thay đổi schema/dữ liệu.
-- Chạy tùy chọn trước khi kiểm thử giao diện.

SELECT table_name, column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
AND table_name IN (
 'danh_sach','can_bo','diem_danh_master','danh_muc_diem',
 'cai_dat_thoi_gian','lop','khoi'
)
ORDER BY table_name, ordinal_position;

SELECT ma_cb,ho_ten,vai_tro,quyen_tabs,trang_thai
FROM public.can_bo
ORDER BY ho_ten;

SELECT ma_hd,ten_hd,mang,loai,diem,doi_tuong
FROM public.danh_muc_diem
ORDER BY mang,loai,ten_hd;

SELECT COUNT(*) AS so_hoc_sinh
FROM public.danh_sach
WHERE trang_thai='Active';

SELECT COUNT(*) AS so_luot_ghi_nhan
FROM public.diem_danh_master;
